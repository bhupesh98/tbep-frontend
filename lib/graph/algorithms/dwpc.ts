import type Graph from 'graphology';
import type { EdgeAttributes, NodeAttributes } from '@/lib/interface';

/**
 * DWPC (Degree-Weighted Path Count) Algorithm
 *
 * Measures connectivity between two nodes by counting paths of a specified metapath type
 * in a heterogeneous network. Each path is weighted by the degrees of intermediate nodes,
 * where degree refers only to edges of the same type as in the metapath.
 *
 * Formula: DWPC(s,t) = Σ paths p [ Π i∈p (d_i)^(-w) ]
 * where d_i is the metapath-specific degree of node i, and w is the damping factor.
 *
 * Reference: https://doi.org/10.1371/journal.pcbi.1004259
 */

export interface DWPCOptions {
  source: string;
  target: string;
  maxHops: number; // Maximum path length to search
  damping?: number; // Default: 0.4
  maxPaths?: number; // Limit paths to prevent explosion (default: 10000)
  timeout?: number; // Milliseconds (default: 30000)
}

export interface DWPCResult {
  dwpcScore: number;
  pathCount: number;
  paths: Array<{
    nodes: string[];
    labels: string[];
    weight: number;
    nodeTypes: string[];
  }>;
  allMetapaths: string[][]; // All unique metapaths found
  damping: number;
  timedOut: boolean;
  minHopsNeeded?: number; // If no paths found within maxHops
}

/**
 * Compute DWPC between source and target nodes by discovering metapaths
 */
export function computeDWPC(graph: Graph<NodeAttributes, EdgeAttributes>, options: DWPCOptions): DWPCResult {
  const { source, target, maxHops, damping = 0.4, maxPaths = 10000, timeout = 30000 } = options;

  // Validate inputs
  if (!graph.hasNode(source)) {
    throw new Error(`Source node "${source}" not found in graph`);
  }
  if (!graph.hasNode(target)) {
    throw new Error(`Target node "${target}" not found in graph`);
  }
  if (maxHops < 2) {
    throw new Error('Maximum hops must be at least 2');
  }

  const startTime = Date.now();
  let timedOut = false;

  // Use graphology-simple-path to find all simple paths up to maxHops
  // biome-ignore lint/suspicious/noExplicitAny: dynamic import
  const { allSimplePaths } = require('graphology-simple-path') as any;

  let allPaths: string[][];
  try {
    allPaths = allSimplePaths(graph, source, target, { maxDepth: maxHops });
  } catch (error) {
    throw new Error(`Failed to find paths: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // If no paths found within maxHops, try to find minimum hops needed
  if (allPaths.length === 0) {
    let minHopsNeeded = maxHops + 1;
    // Try up to maxHops + 3 to find shortest path
    for (let h = maxHops + 1; h <= maxHops + 3; h++) {
      const testPaths = allSimplePaths(graph, source, target, { maxDepth: h });
      if (testPaths.length > 0) {
        minHopsNeeded = testPaths[0].length - 1; // Convert node count to edge count
        break;
      }
    }

    return {
      dwpcScore: 0,
      pathCount: 0,
      paths: [],
      allMetapaths: [],
      damping,
      timedOut: false,
      minHopsNeeded,
    };
  }

  // Extract metapaths (node type sequences) from paths
  const metapathSet = new Set<string>();
  const pathsWithMetapaths: Array<{ nodes: string[]; nodeTypes: string[] }> = [];

  for (const path of allPaths.slice(0, maxPaths)) {
    if (Date.now() - startTime > timeout) {
      timedOut = true;
      break;
    }

    const nodeTypes = path.map(node => graph.getNodeAttribute(node, 'nodeType') as string);
    metapathSet.add(nodeTypes.join('|'));
    pathsWithMetapaths.push({ nodes: path, nodeTypes });
  }

  const allMetapaths = Array.from(metapathSet).map(mp => mp.split('|'));
  const primaryMetapath = allMetapaths[0] || [];

  // Pre-compute metapath-specific degrees for the primary metapath
  const metapathDegrees = computeMetapathDegrees(graph, primaryMetapath);

  // Compute path weights and total DWPC score
  const pathsWithWeights = pathsWithMetapaths.map(({ nodes, nodeTypes }) => {
    const weight = computePathWeight(nodes, metapathDegrees, damping);
    const labels = nodes.map(node => graph.getNodeAttribute(node, 'label') || node);
    return { nodes, labels, nodeTypes, weight };
  });

  const dwpcScore = pathsWithWeights.reduce((sum, path) => sum + path.weight, 0);

  return {
    dwpcScore,
    pathCount: pathsWithWeights.length,
    paths: pathsWithWeights,
    allMetapaths,
    damping,
    timedOut,
  };
}

/**
 * Compute metapath-specific degree for each node
 * Degree only counts edges connecting to nodes of types in the metapath
 */
function computeMetapathDegrees(graph: Graph<NodeAttributes, EdgeAttributes>, metapath: string[]): Map<string, number> {
  const degrees = new Map<string, number>();
  const metapathTypes = new Set(metapath);

  graph.forEachNode((node: string, attributes: NodeAttributes) => {
    const nodeType = attributes.nodeType;
    if (!nodeType || !metapathTypes.has(nodeType)) {
      degrees.set(node, 0);
      return;
    }

    // Count neighbors that are in the metapath
    let degree = 0;
    try {
      const neighbors = graph.neighbors(node);
      for (const neighbor of neighbors) {
        const neighborType = graph.getNodeAttribute(neighbor, 'nodeType');
        if (neighborType && metapathTypes.has(neighborType)) {
          degree++;
        }
      }
    } catch {
      // Handle nodes without neighbors
      degree = 0;
    }

    degrees.set(node, degree);
  });

  return degrees;
}

/**
 * Compute path weight using DWPC formula
 * Weight = Product of (degree^-damping) for intermediate nodes
 */
function computePathWeight(path: string[], metapathDegrees: Map<string, number>, damping: number): number {
  let weight = 1.0;

  // Skip source (index 0) and target (last index) when computing weight
  for (let i = 1; i < path.length - 1; i++) {
    const node = path[i];
    const degree = metapathDegrees.get(node) || 1; // Avoid division by zero

    if (degree === 0) {
      // Node has no metapath-specific connections, this path is invalid
      return 0;
    }

    weight *= degree ** -damping;
  }

  return weight;
}

/**
 * Estimate the number of paths (used for optimization decisions)
 */
export function estimatePathCount(graph: Graph<NodeAttributes, EdgeAttributes>, metapath: string[]): number {
  if (metapath.length < 2) return 0;

  // Compute average degree for each node type in metapath
  const typeDegrees: Record<string, number[]> = {};

  graph.forEachNode((node: string, attributes: NodeAttributes) => {
    const nodeType = attributes.nodeType;
    if (!nodeType || !metapath.includes(nodeType)) return;

    if (!typeDegrees[nodeType]) {
      typeDegrees[nodeType] = [];
    }

    try {
      const neighbors = graph.neighbors(node);
      typeDegrees[nodeType].push(neighbors.length);
    } catch {
      typeDegrees[nodeType].push(0);
    }
  });

  // Rough estimate: (avg_degree ^ metapath_length)
  let avgDegree = 0;
  let count = 0;

  for (const degrees of Object.values(typeDegrees)) {
    if (degrees.length > 0) {
      avgDegree += degrees.reduce((a, b) => a + b, 0) / degrees.length;
      count++;
    }
  }

  if (count === 0) return 0;

  avgDegree /= count;
  return avgDegree ** (metapath.length - 1);
}
