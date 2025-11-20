import type Graph from 'graphology';
import { allSimplePaths } from 'graphology-simple-path';
import type { EdgeAttributes, NodeAttributes } from '@/lib/interface';

/**
 * Path Finding Utilities for Knowledge Graphs
 * Uses graphology-simple-path for finding all simple paths
 */

export interface PathResult {
  path: string[];
  labels: string[];
  length: number;
  nodeTypes: string[];
  exists: boolean;
}

/**
 * Find all simple paths between two nodes using graphology-simple-path
 * Returns paths sorted by length (shortest first)
 */
export function findAllPaths(
  graph: Graph<NodeAttributes, EdgeAttributes>,
  source: string,
  target: string,
  maxDepth = 5,
  maxPaths = 1000,
): PathResult[] {
  if (!graph.hasNode(source)) {
    throw new Error(`Source node "${source}" not found in graph`);
  }
  if (!graph.hasNode(target)) {
    throw new Error(`Target node "${target}" not found in graph`);
  }

  // Find all simple paths up to maxDepth
  const pathsIterator = allSimplePaths(graph, source, target, { maxDepth });
  const allPaths: string[][] = [];

  for (const path of pathsIterator) {
    allPaths.push(path);
    if (allPaths.length >= maxPaths) break;
  }

  // Convert to PathResult and sort by length
  const results = allPaths.map(path => ({
    path,
    labels: path.map(node => (graph.hasNode(node) ? graph.getNodeAttribute(node, 'label') || node : node)),
    length: path.length - 1, // Number of edges
    nodeTypes: path.map(node =>
      graph.hasNode(node) ? graph.getNodeAttribute(node, 'nodeType') || 'Unknown' : 'Unknown',
    ),
    exists: true,
  }));

  // Sort by length (shortest first)
  results.sort((a, b) => a.length - b.length);

  return results;
}

/**
 * Find path with specific node type constraints (metapath matching)
 */
export function findPathWithMetapath(
  graph: Graph<NodeAttributes, EdgeAttributes>,
  source: string,
  target: string,
  metapath: string[],
  maxPaths = 10,
): PathResult[] {
  if (!graph.hasNode(source)) {
    throw new Error(`Source node "${source}" not found in graph`);
  }
  if (!graph.hasNode(target)) {
    throw new Error(`Target node "${target}" not found in graph`);
  }

  const foundPaths: string[][] = [];
  const visited = new Set<string>();

  function dfs(current: string, pathIndex: number, path: string[]) {
    if (foundPaths.length >= maxPaths) return;

    if (pathIndex === metapath.length - 1) {
      if (current === target) {
        foundPaths.push([...path]);
      }
      return;
    }

    const expectedType = metapath[pathIndex + 1];

    try {
      const neighbors = graph.neighbors(current);

      for (const neighbor of neighbors) {
        const nodeType = graph.getNodeAttribute(neighbor, 'nodeType');

        if (nodeType === expectedType && !visited.has(neighbor)) {
          visited.add(neighbor);
          path.push(neighbor);

          dfs(neighbor, pathIndex + 1, path);

          path.pop();
          visited.delete(neighbor);
        }
      }
    } catch {
      // Node has no neighbors
      return;
    }
  }

  visited.add(source);
  dfs(source, 0, [source]);

  return foundPaths.map(path => ({
    path,
    labels: path.map(node => (graph.hasNode(node) ? graph.getNodeAttribute(node, 'label') || node : node)),
    length: path.length - 1,
    nodeTypes: path.map(node =>
      graph.hasNode(node) ? graph.getNodeAttribute(node, 'nodeType') || 'Unknown' : 'Unknown',
    ),
    exists: true,
  }));
}
