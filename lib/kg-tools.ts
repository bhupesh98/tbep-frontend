/**
 * Knowledge Graph Agentic Tools
 *
 * Complete tool registry for AI-powered knowledge graph analysis.
 * All tools run client-side with user's uploaded graph.
 *
 * Tool Categories:
 * - Graph Query (8 tools): Search, properties, paths, neighborhoods
 * - Analysis (5 tools): Communities, DWPC, GSEA, statistics, context expansion
 * - Visualization (10 tools): Highlighting, filtering, styling, property mapping
 * - Interaction (4 tools): Click, select, clear
 *
 * Total: 27+ tools
 */

import { Index } from 'flexsearch';
import type Graph from 'graphology';
import { betweenness, closeness, eigenvector } from 'graphology-metrics/centrality';
import { density, diameter } from 'graphology-metrics/graph';
import { allSimplePaths } from 'graphology-simple-path';
import type { GeneProperties, NodeColorType, NodeSizeType } from './data';
import { useKGStore } from './hooks/use-kg-store';
import { useStore } from './hooks/use-store';
import type { RadioOptions } from './interface';
import type {
  AnalyzeCommunitiesInput,
  AnalyzeCommunitiesOutput,
  ApplyDWPCInput,
  ApplyDWPCOutput,
  ApplyGSEAInput,
  ApplyGSEAOutput,
  ApplyNodeColorByPropertyInput,
  ApplyNodeColorByPropertyOutput,
  ApplyNodeSizeByPropertyInput,
  ApplyNodeSizeByPropertyOutput,
  ClickEdgeInput,
  ClickEdgeOutput,
  ClickNodeInput,
  ClickNodeOutput,
  ComputeCentralityInput,
  ComputeCentralityOutput,
  ComputeNetworkStatisticsInput,
  ComputeNetworkStatisticsOutput,
  ExpandContextInput,
  ExpandContextOutput,
  ExtractSubgraphInput,
  ExtractSubgraphOutput,
  FilterByEdgeWeightInput,
  FilterByEdgeWeightOutput,
  FilterByNodeDegreeInput,
  FilterByNodeDegreeOutput,
  FilterByNodeTypeInput,
  FilterSubgraphInput,
  FilterSubgraphOutput,
  FindSimplePathsInput,
  FindSimplePathsOutput,
  GetNeighborhoodInput,
  GetNeighborhoodOutput,
  GetNodePropertiesInput,
  GetNodePropertiesOutput,
  HighlightNodesInput,
  ListAvailablePropertiesInput,
  ListAvailablePropertiesOutput,
  RetrieveRelevantContextInput,
  RetrieveRelevantContextOutput,
  SearchNodesInput,
  SearchNodesOutput,
  SelectMultipleNodesInput,
  SelectMultipleNodesOutput,
  UpdateEdgeStyleInput,
  UpdateEdgeStyleOutput,
} from './kg-chat-types';
import { type EventMessage, Events, envURL, eventEmitter } from './utils';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  visualUpdate?: {
    highlightedNodes?: string[];
    highlightedEdges?: string[];
    cameraTarget?: { x: number; y: number; ratio?: number };
  };
}

export interface ToolContext {
  store: ReturnType<typeof useKGStore.getState>;
  propertySearchIndex: PropertySearchIndex;
  graphSearchIndex: Index;
  /**
   * @deprecated Legacy Gene network store for backward compatibility
   * Used for Gene nodes with radioOptions (DEG, Pathway, Druggability, TE, OpenTargets, etc.)
   */
  legacy_store: ReturnType<typeof useStore.getState>;
}

export interface PropertySearchIndex {
  index: Index;
  metadata: Map<string, { targetNodeType: string; source: 'file' | 'backend' }>;
}

// Parsing helpers and graph accessor (agents may send numeric/boolean as strings)
function parseNumberLike(value: unknown, fallback: number): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value.trim());
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function parseBooleanLike(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(v)) return true;
    if (['false', '0', 'no', 'n'].includes(v)) return false;
  }
  return fallback;
}

function getGraph(context: ToolContext): Graph {
  const sigmaInstance = context.store.sigmaInstance; // may be null per store typing
  if (!sigmaInstance) throw new Error('sigmaInstance not available on store');
  return sigmaInstance.getGraph();
}

// ============================================================================
// Helper Utilities (Internal, NOT exposed as tools)
// ============================================================================

/**
 * Convert node ID to node label
 * @internal
 */
export function nodeIdToLabel(graph: Graph, id: string): string | null {
  if (!graph.hasNode(id)) return null;
  return graph.getNodeAttribute(id, 'label') ?? id;
}

/**
 * Convert label or ID to ID (accepts both formats)
 * @internal
 */
export function resolveLabelOrId(
  graph: Graph,
  labelOrId: string,
  nodeNameToIdTrie: ReturnType<typeof useKGStore.getState>['nodeNameToIdTrie'],
): string | null {
  // First try as ID
  if (graph.hasNode(labelOrId)) return labelOrId;
  // Then try as label
  const nodeId = nodeNameToIdTrie.search(labelOrId).map(entry => entry.value);
  return nodeId?.[0] ?? null;
}

/**
 * Build FlexSearch index for property names
 * Indexes both KG properties (non-Gene) and legacy radioOptions (Gene)
 * @internal
 */
export function buildPropertySearchIndex(
  kgPropertyOptions: Record<string, { targetNodeType: string; source: 'file' | 'backend' }>,
  legacyRadioOptions?: RadioOptions,
): PropertySearchIndex {
  const index = new Index({
    preset: 'match',
    tokenize: 'forward',
  });

  const metadata = new Map<string, { targetNodeType: string; source: 'file' | 'backend' }>();

  // Index KG-specific properties (non-Gene nodes)
  for (const [propertyName, propertyMeta] of Object.entries(kgPropertyOptions)) {
    index.add(propertyName, propertyName);
    metadata.set(propertyName, propertyMeta);
  }

  // Index legacy Gene properties from radioOptions (database categories)
  if (legacyRadioOptions?.database) {
    for (const [category, properties] of Object.entries(legacyRadioOptions.database)) {
      // Index category name (e.g., 'DEG', 'Pathway')
      index.add(category, category);
      metadata.set(category, { targetNodeType: 'Gene', source: 'backend' });

      // Index individual properties with their descriptions
      if (Array.isArray(properties)) {
        for (const prop of properties) {
          const fullName = `${category}.${prop.name}`;
          const searchText = prop.description
            ? `${fullName} ${prop.name} ${prop.description}`
            : `${fullName} ${prop.name}`;
          index.add(fullName, searchText);
          metadata.set(fullName, { targetNodeType: 'Gene', source: 'backend' });
        }
      }
    }
  }

  // Index user-uploaded Gene properties
  if (legacyRadioOptions?.user) {
    for (const [category, properties] of Object.entries(legacyRadioOptions.user)) {
      // Index category name
      index.add(category, category);
      metadata.set(category, { targetNodeType: 'Gene', source: 'file' });

      // Index individual properties (array of strings)
      if (Array.isArray(properties)) {
        for (const propertyName of properties) {
          const fullName = `${category}.${propertyName}`;
          index.add(fullName, fullName);
          metadata.set(fullName, { targetNodeType: 'Gene', source: 'file' });
        }
      }
    }
  }

  return { index, metadata };
}

/**
 * Build BM25 search index for node labels and descriptions
 * @internal
 */
export function buildNodeSearchIndex(graph: Graph): Index {
  const index = new Index({
    preset: 'score',
    tokenize: 'forward',
  });

  graph.forEachNode((nodeId, attrs) => {
    const searchText = `${attrs.label || ''} ${attrs.description || ''}`;
    index.add(nodeId, searchText);
  });

  return index;
}

// ============================================================================
// Graph Query Tools
// ============================================================================

/**
 * Search nodes by label (case-insensitive, fuzzy matching)
 * CRITICAL: Only returns visible nodes (hidden: false)
 */
export function searchNodes(input: SearchNodesInput, context: ToolContext): ToolResult<SearchNodesOutput> {
  const { query, nodeType, limit = '20' } = input;
  const graph = getGraph(context);
  const nodeNameToIdTrie = context.store.nodeNameToIdTrie;

  const results: SearchNodesOutput['nodes'] = [];

  const matchedNodeIds = nodeNameToIdTrie.search(query).map(entry => entry.value);

  for (const nodeId of matchedNodeIds) {
    if (!graph.hasNode(nodeId)) continue;
    const attrs = graph.getNodeAttributes(nodeId);

    // CRITICAL: Skip hidden nodes
    if (attrs.hidden) continue;

    if (!nodeType || attrs.nodeType === nodeType) {
      results.push({
        id: nodeId,
        label: attrs.label || nodeId,
        nodeType: attrs.nodeType || 'Unknown',
        degree: graph.degree(nodeId),
      });
    }
  }

  const limitNum = parseNumberLike(limit, 20);
  return {
    success: true,
    data: {
      nodes: results.slice(0, limitNum),
      count: results.length,
      truncated: results.length > limitNum,
    },
  };
}

/**
 * Get all properties for specific nodes
 * CRITICAL: Excludes hidden nodes
 */
export function getNodeProperties(
  input: GetNodePropertiesInput,
  context: ToolContext,
): ToolResult<GetNodePropertiesOutput> {
  const { nodeIds } = input;
  const { store } = context;
  const graph = getGraph(context);

  // biome-ignore lint/suspicious/noExplicitAny: Node properties can be of any type from file/backend
  const properties: Record<string, any>[] = [];
  for (const nodeId of nodeIds) {
    if (!graph.hasNode(nodeId)) continue;
    const attrs = graph.getNodeAttributes(nodeId);

    // CRITICAL: Skip hidden nodes
    if (attrs.hidden) continue;

    // Get base attributes
    // biome-ignore lint/suspicious/noExplicitAny: Node properties can be of any type
    const nodeProps: Record<string, any> = {
      id: nodeId,
      label: attrs.label,
      nodeType: attrs.nodeType,
      degree: graph.degree(nodeId),
      ...attrs,
    };

    // Get KG-specific properties
    const kgProps = store.nodePropertyData[nodeId];
    if (kgProps) {
      Object.assign(nodeProps, kgProps);
    }
    properties.push(nodeProps);
  }

  return {
    success: true,
    data: { properties },
  };
}

/**
 * Find simple paths between nodes using graphology-simple-path
 * CRITICAL: Excludes paths through hidden nodes
 */
export async function findSimplePaths(
  input: FindSimplePathsInput,
  context: ToolContext,
): Promise<ToolResult<FindSimplePathsOutput>> {
  const { sourceLabelOrId, targetLabelOrId, maxLength = '5', maxPaths = '100' } = input;
  const graph = getGraph(context);
  const maxLengthNum = parseNumberLike(maxLength, 5);
  const maxPathsNum = parseNumberLike(maxPaths, 100);

  // Resolve labels to IDs
  const sourceLabel = resolveLabelOrId(graph, sourceLabelOrId, context.store.nodeNameToIdTrie);
  const targetLabel = resolveLabelOrId(graph, targetLabelOrId, context.store.nodeNameToIdTrie);

  if (!sourceLabel) {
    return {
      success: false,
      error: `Source node '${sourceLabelOrId}' not found`,
    };
  }

  if (!targetLabel) {
    return {
      success: false,
      error: `Target node '${targetLabelOrId}' not found`,
    };
  }

  // Check if nodes are hidden
  if (graph.getNodeAttribute(sourceLabel, 'hidden')) {
    return {
      success: false,
      error: `Source node '${sourceLabelOrId}' is currently hidden`,
    };
  }

  if (graph.getNodeAttribute(targetLabel, 'hidden')) {
    return {
      success: false,
      error: `Target node '${targetLabelOrId}' is currently hidden`,
    };
  }

  // CRITICAL: Register listener BEFORE emitting event to avoid race condition
  return new Promise(resolve => {
    const handleResults = (results: EventMessage[Events.ALGORITHM_RESULTS]) => {
      if (!results.paths || results.paths.length === 0) {
        resolve({
          success: false,
          error: 'No paths found between nodes',
        });
        return;
      }

      const formattedPaths = results.paths.map(p => ({
        nodeIds: p.nodes,
        nodeLabels: p.labels,
        length: p.length || p.nodes.length - 1,
      }));

      // Get top paths (shortest paths with representative labels)
      const topPaths = formattedPaths
        .slice(0, 3)
        .map(p => p.nodeLabels.join(' → '))
        .join('; ');

      resolve({
        success: true,
        data: {
          paths: formattedPaths,
          count: results.pathCount || formattedPaths.length,
          sourceId: sourceLabel,
          targetId: targetLabel,
          summary: `Found ${results.pathCount || formattedPaths.length} paths. Shortest: ${topPaths || 'N/A'}`,
        },
      });

      // Remove listener after handling
      eventEmitter.off(Events.ALGORITHM_RESULTS, handleResults);
    };

    eventEmitter.once(Events.ALGORITHM_RESULTS, handleResults);

    // Now emit ALGORITHM event - KGGraphAnalysis will find paths and emit results
    eventEmitter.emit(Events.ALGORITHM, {
      name: 'Path Finding',
      parameters: {
        source: sourceLabel,
        target: targetLabel,
        maxDepth: maxLengthNum.toString(),
        maxPaths: maxPathsNum.toString(),
      },
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      eventEmitter.off(Events.ALGORITHM_RESULTS, handleResults);
      resolve({
        success: false,
        error: 'Path finding timed out after 30 seconds',
      });
    }, 30000);
  });
}

/**
 * Get immediate neighbors of node(s)
 * CRITICAL: Excludes hidden neighbors
 */
export function getNeighborhood(input: GetNeighborhoodInput, context: ToolContext): ToolResult<GetNeighborhoodOutput> {
  const { nodeLabelsOrIds, hops = '1' } = input;
  const { store } = context;
  const graph = getGraph(context);
  const hopsNum = parseNumberLike(hops, 1);

  // Resolve labels to IDs
  const centerNodeIds = nodeLabelsOrIds
    .map(labelOrId => resolveLabelOrId(graph, labelOrId, store.nodeNameToIdTrie))
    .filter((id): id is string => id !== null);

  if (centerNodeIds.length === 0) {
    return {
      success: false,
      error: `None of the specified nodes found: ${nodeLabelsOrIds.join(', ')}`,
    };
  }

  const neighborSet = new Set<string>();
  const edgeSet = new Set<string>();
  const queue = centerNodeIds.map(id => ({ id, distance: 0 }));
  const visited = new Set<string>(centerNodeIds);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.distance >= hopsNum) continue;

    graph.forEachNeighbor(current.id, (neighbor, neighborAttrs) => {
      // CRITICAL: Skip hidden neighbors
      if (neighborAttrs.hidden) return;

      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        neighborSet.add(neighbor);
        queue.push({ id: neighbor, distance: current.distance + 1 });
      }

      // Add edge
      const edge = graph.edge(current.id, neighbor);
      if (edge && !graph.getEdgeAttribute(edge, 'hidden')) {
        edgeSet.add(edge);
      }
    });
  }

  const neighbors = Array.from(neighborSet).map(id => ({
    id,
    label: nodeIdToLabel(graph, id) || id,
    nodeType: graph.getNodeAttribute(id, 'nodeType') || 'Unknown',
  }));

  const edges = Array.from(edgeSet).map(edgeId => {
    const edgeAttrs = graph.getEdgeAttributes(edgeId);
    return {
      source: graph.source(edgeId),
      target: graph.target(edgeId),
      type: edgeAttrs.type || 'Unknown',
    };
  });

  return {
    success: true,
    data: {
      neighbors,
      edges,
      centerNodeIds,
    },
    visualUpdate: {
      highlightedNodes: [...centerNodeIds, ...Array.from(neighborSet)],
    },
  };
}

/**
 * Filter graph by conditions
 * CRITICAL: Only returns visible entities
 */
export function filterSubgraph(input: FilterSubgraphInput, context: ToolContext): ToolResult<FilterSubgraphOutput> {
  const { nodeTypes, edgeTypes, propertyConditions } = input;
  const graph = getGraph(context);

  const matchingNodes: string[] = [];
  const matchingEdges: string[] = [];

  // Filter nodes
  graph.forEachNode((nodeId, attrs) => {
    // CRITICAL: Skip hidden nodes
    if (attrs.hidden) return;

    let matches = true;

    if (nodeTypes && !nodeTypes.includes(attrs.nodeType)) {
      matches = false;
    }

    if (propertyConditions && matches) {
      for (const condition of propertyConditions) {
        const value = attrs[condition.property];
        if (value === undefined) {
          matches = false;
          break;
        }

        switch (condition.operator) {
          case '=':
            if (value !== condition.value) matches = false;
            break;
          case '>':
            if (value <= condition.value) matches = false;
            break;
          case '<':
            if (value >= condition.value) matches = false;
            break;
          case '>=':
            if (value < condition.value) matches = false;
            break;
          case '<=':
            if (value > condition.value) matches = false;
            break;
        }
      }
    }

    if (matches) matchingNodes.push(nodeId);
  });

  // Filter edges
  graph.forEachEdge((edgeId, attrs, _source, _target, sourceAttrs, targetAttrs) => {
    // CRITICAL: Skip hidden edges or edges with hidden nodes
    if (attrs.hidden || sourceAttrs.hidden || targetAttrs.hidden) return;

    if (edgeTypes && !edgeTypes.includes(attrs.type)) return;

    matchingEdges.push(edgeId);
  });

  return {
    success: true,
    data: {
      matchingNodes,
      matchingEdges,
    },
  };
}

/**
 * Calculate centrality metrics
 * CRITICAL: Only computes for visible nodes
 */
export function computeCentrality(
  input: ComputeCentralityInput,
  context: ToolContext,
): ToolResult<ComputeCentralityOutput> {
  const { metric, nodeIds } = input;
  const graph = getGraph(context);

  let scores: Record<string, number> = {};

  try {
    switch (metric) {
      case 'degree':
        graph.forEachNode((nodeId, attrs) => {
          if (attrs.hidden) return;
          scores[nodeId] = graph.degree(nodeId);
        });
        break;

      case 'betweenness':
        scores = betweenness(graph);
        break;

      case 'closeness':
        scores = closeness(graph);
        break;

      case 'eigenvector':
        scores = eigenvector(graph);
        break;

      default:
        return {
          success: false,
          error: `Unknown metric: ${metric}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: `Centrality computation failed: ${error}`,
    };
  }

  // Filter by nodeIds if specified
  const relevantScores = nodeIds
    ? Object.entries(scores).filter(([id]) => nodeIds.includes(id))
    : Object.entries(scores);

  // Filter out hidden nodes
  const visibleScores = relevantScores.filter(([id]) => !graph.getNodeAttribute(id, 'hidden'));

  // Sort by score descending
  const rankings = visibleScores
    .sort(([, a], [, b]) => b - a)
    .slice(0, 100) // Top 100
    .map(([nodeId, score]) => ({
      nodeId,
      label: nodeIdToLabel(graph, nodeId) || nodeId,
      score,
    }));

  return {
    success: true,
    data: { rankings },
  };
}

/**
 * BM25 search + graph expansion for context retrieval
 * CRITICAL: Only returns visible nodes
 */
export function retrieveRelevantContext(
  input: RetrieveRelevantContextInput,
  context: ToolContext,
): ToolResult<RetrieveRelevantContextOutput> {
  const { query, topK = '30' } = input;
  const { graphSearchIndex } = context;
  const graph = getGraph(context);
  const topKNum = parseNumberLike(topK, 30);
  // Step 1: BM25 search
  const searchResults = graphSearchIndex.search(query, { limit: topKNum });

  // Step 2: Graph expansion (add 1-hop neighbors)
  const nodeSet = new Set<string>(searchResults as string[]);
  for (const nodeId of searchResults as string[]) {
    if (!graph.hasNode(nodeId)) continue;
    if (graph.getNodeAttribute(nodeId, 'hidden')) continue;

    graph.forEachNeighbor(nodeId, (neighbor, attrs) => {
      if (!attrs.hidden) nodeSet.add(neighbor);
    });
  }

  // Step 3: Re-rank by combined score (text + PageRank)
  const rankings = Array.from(nodeSet).map(nodeId => {
    const textScore = searchResults.includes(nodeId) ? 1 : 0.5;
    const degreeScore = graph.degree(nodeId) / graph.order;
    const combinedScore = 0.7 * textScore + 0.3 * degreeScore;

    return {
      id: nodeId,
      label: nodeIdToLabel(graph, nodeId) || nodeId,
      score: combinedScore,
      nodeType: graph.getNodeAttribute(nodeId, 'nodeType') || 'Unknown',
    };
  });

  rankings.sort((a, b) => b.score - a.score);

  return {
    success: true,
    data: {
      relevantNodes: rankings.slice(0, 100),
      subgraphSize: nodeSet.size,
    },
  };
}

/**
 * Extract subgraph and format as structured JSON
 * CRITICAL: Excludes hidden entities
 */
export function extractSubgraph(input: ExtractSubgraphInput, context: ToolContext): ToolResult<ExtractSubgraphOutput> {
  const { nodeIds, includeNeighbors = 'false' } = input;
  const graph = getGraph(context);
  const includeNeighborsBool = parseBooleanLike(includeNeighbors, false);

  const nodeSet = new Set(nodeIds);

  // Add neighbors if requested
  if (includeNeighborsBool) {
    for (const nodeId of nodeIds) {
      if (!graph.hasNode(nodeId)) continue;
      if (graph.getNodeAttribute(nodeId, 'hidden')) continue;

      graph.forEachNeighbor(nodeId, (neighbor, attrs) => {
        if (!attrs.hidden) nodeSet.add(neighbor);
      });
    }
  }

  // Extract nodes
  const nodes = Array.from(nodeSet)
    .filter(id => graph.hasNode(id) && !graph.getNodeAttribute(id, 'hidden'))
    .map(id => ({
      id,
      label: nodeIdToLabel(graph, id) || id,
      type: graph.getNodeAttribute(id, 'nodeType') || 'Unknown',
      degree: graph.degree(id),
    }));

  // Extract edges
  const edges: ExtractSubgraphOutput['edges'] = [];
  graph.forEachEdge((_edgeId, attrs, source, target, sourceAttrs, targetAttrs) => {
    if (attrs.hidden || sourceAttrs.hidden || targetAttrs.hidden) return;

    if (nodeSet.has(source) && nodeSet.has(target)) {
      edges.push({
        source,
        target,
        type: attrs.type || 'Unknown',
      });
    }
  });

  // Statistics
  const nodesByType: Record<string, number> = {};
  for (const node of nodes) {
    nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
  }

  const topCentralNodes = nodes
    .sort((a, b) => b.degree - a.degree)
    .slice(0, 10)
    .map(n => n.id);

  return {
    success: true,
    data: {
      nodes,
      edges,
      statistics: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        nodesByType,
        topCentralNodes,
      },
    },
  };
}

// ============================================================================
// Analysis Tools
// ============================================================================

/**
 * Detect communities with Louvain algorithm
 * CRITICAL: Only includes visible nodes
 */
export async function analyzeCommunities(
  input: AnalyzeCommunitiesInput,
  context: ToolContext,
): Promise<ToolResult<AnalyzeCommunitiesOutput>> {
  const { resolution = '1', weighted = 'false', minCommunitySize = '3' } = input;
  const graph = getGraph(context);
  const resolutionNum = parseNumberLike(resolution, 1);
  const weightedBool = parseBooleanLike(weighted, false);
  const minCommunitySizeNum = parseNumberLike(minCommunitySize, 3);

  // CRITICAL: Register listener BEFORE emitting event to avoid race condition
  return new Promise(resolve => {
    const handleResults = (results: EventMessage[Events.ALGORITHM_RESULTS]) => {
      if (!results.communities) {
        resolve({
          success: false,
          error: 'No community results received',
        });
        return;
      }

      const communities = results.communities.map((c, idx) => ({
        id: idx,
        nodeCount: c.nodes.length,
        topNodes: c.nodes.slice(0, 10).map(nodeId => ({
          id: nodeId,
          label: graph.hasNode(nodeId) ? nodeIdToLabel(graph, nodeId) || nodeId : nodeId,
        })),
      }));

      resolve({
        success: true,
        data: {
          communities,
          modularity: results.modularity || 0,
          summary: `Detected ${communities.length} communities (modularity: ${results.modularity?.toFixed(3) || 'N/A'}). Largest: ${communities[0]?.nodeCount || 0} nodes`,
        },
      });

      // Remove listener after handling
      eventEmitter.off(Events.ALGORITHM_RESULTS, handleResults);
    };

    eventEmitter.once(Events.ALGORITHM_RESULTS, handleResults);

    // Now emit ALGORITHM event - KGGraphAnalysis will compute and emit results
    eventEmitter.emit(Events.ALGORITHM, {
      name: 'Leiden',
      parameters: {
        resolution: resolutionNum.toString(),
        weighted: weightedBool.toString(),
        minCommunitySize: minCommunitySizeNum.toString(),
      },
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      eventEmitter.off(Events.ALGORITHM_RESULTS, handleResults);
      resolve({
        success: false,
        error: 'Community detection timed out after 30 seconds',
      });
    }, 30000);
  });
}

/**
 * Degree-Weighted Path Count (DWPC)
 * Uses the dedicated DWPC algorithm from dwpc.ts
 */
export async function applyDWPC(input: ApplyDWPCInput, context: ToolContext): Promise<ToolResult<ApplyDWPCOutput>> {
  const { sourceLabelOrId, targetLabelOrId, damping = '0.5', maxHops = '5', maxPaths = '10000' } = input;
  const graph = getGraph(context);
  const dampingNum = parseNumberLike(damping, 0.5);
  const maxHopsNum = parseNumberLike(maxHops, 5);
  const maxPathsNum = parseNumberLike(maxPaths, 10000);

  // Resolve labels to IDs
  const sourceLabel = resolveLabelOrId(graph, sourceLabelOrId, context.store.nodeNameToIdTrie);
  const targetLabel = resolveLabelOrId(graph, targetLabelOrId, context.store.nodeNameToIdTrie);

  if (!sourceLabel) {
    return {
      success: false,
      error: `Source node '${sourceLabelOrId}' not found`,
    };
  }

  if (!targetLabel) {
    return {
      success: false,
      error: `Target node '${targetLabelOrId}' not found`,
    };
  }

  // Check if nodes are hidden
  if (graph.getNodeAttribute(sourceLabel, 'hidden')) {
    return {
      success: false,
      error: `Source node '${sourceLabelOrId}' is currently hidden`,
    };
  }

  if (graph.getNodeAttribute(targetLabel, 'hidden')) {
    return {
      success: false,
      error: `Target node '${targetLabelOrId}' is currently hidden`,
    };
  }

  // CRITICAL: Register listener BEFORE emitting event to avoid race condition
  return new Promise(resolve => {
    const handleResults = (results: EventMessage[Events.ALGORITHM_RESULTS]) => {
      if (!results.paths || results.paths.length === 0) {
        resolve({
          success: false,
          error: results.minHopsNeeded
            ? `No paths found within ${maxHops} hops. At least ${results.minHopsNeeded} hops needed.`
            : 'No paths found between nodes',
        });
        return;
      }

      // Get top metapaths
      const metapathCounts = new Map<string, number>();
      if (results.allMetapaths) {
        for (const metapath of results.allMetapaths) {
          const metapathStr = metapath.join(' → ');
          metapathCounts.set(metapathStr, (metapathCounts.get(metapathStr) || 0) + 1);
        }
      }
      const topMetapaths = Array.from(metapathCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([metapath, count]) => ({ metapath, count }));

      const formattedPaths = results.paths.slice(0, 20).map(p => ({
        nodeIds: p.nodes,
        nodeLabels: p.labels,
        metapath: p.nodeTypes?.join(' → ') || '',
      }));

      resolve({
        success: true,
        data: {
          dwpcScore: results.dwpcScore || 0,
          paths: formattedPaths,
          sourceId: sourceLabel,
          targetId: targetLabel,
          explanation: results.timedOut
            ? `DWPC calculation timed out after finding ${results.pathCount} paths`
            : undefined,
          topMetapaths,
          summary: `DWPC: ${results.dwpcScore?.toFixed(4) || 'N/A'} (${results.pathCount || 0} paths, damping: ${damping})${results.timedOut ? ' [TIMEOUT]' : ''}. Top metapath: ${topMetapaths[0]?.metapath || 'N/A'}`,
        },
      });

      // Remove listener after handling
      eventEmitter.off(Events.ALGORITHM_RESULTS, handleResults);
    };

    eventEmitter.once(Events.ALGORITHM_RESULTS, handleResults);

    // Now emit ALGORITHM event - KGGraphAnalysis will compute and emit results
    eventEmitter.emit(Events.ALGORITHM, {
      name: 'DWPC',
      parameters: {
        source: sourceLabel,
        target: targetLabel,
        maxHops: maxHopsNum.toString(),
        damping: dampingNum.toString(),
        maxPaths: maxPathsNum.toString(),
      },
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      eventEmitter.off(Events.ALGORITHM_RESULTS, handleResults);
      resolve({
        success: false,
        error: 'DWPC calculation timed out after 30 seconds',
      });
    }, 30000);
  });
}

/**
 * Gene Set Enrichment Analysis (GSEA) via Python backend
 * Only works with Gene nodes
 */
export async function applyGSEA(input: ApplyGSEAInput, _context: ToolContext): Promise<ToolResult<ApplyGSEAOutput>> {
  const { geneNames } = input;

  if (geneNames.length === 0) {
    return {
      success: false,
      error: 'No gene names provided',
    };
  }

  try {
    const response = await fetch(`${envURL(process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL)}/gsea`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geneNames),
    });

    if (!response.ok) {
      throw new Error(`GSEA API failed: ${response.statusText}`);
    }

    const data: ApplyGSEAOutput['enrichedPathways'] = await response.json();

    return {
      success: true,
      data: {
        enrichedPathways: data || [],
        inputGeneNames: geneNames,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `GSEA failed: ${error}`,
    };
  }
}

/**
 * Overall graph metrics
 * CRITICAL: Only computes for visible nodes/edges
 */
export function computeNetworkStatistics(
  _input: ComputeNetworkStatisticsInput,
  context: ToolContext,
): ToolResult<ComputeNetworkStatisticsOutput> {
  const graph = getGraph(context);

  try {
    // Count visible nodes and edges
    const visibleNodeCount = graph.reduceNodes((count, _node, attrs) => count + (attrs.hidden ? 0 : 1), 0);

    const visibleEdgeCount = graph.reduceEdges(
      (count, _edge, attrs, _source, _target, sourceAttrs, targetAttrs) =>
        count + (attrs.hidden || sourceAttrs.hidden || targetAttrs.hidden ? 0 : 1),
      0,
    );

    // Compute metrics on visible subgraph
    const graphDensity = density(graph);
    const graphDiameter = diameter(graph);

    const totalDegree = graph.reduceNodes((sum, node, attrs) => sum + (attrs.hidden ? 0 : graph.degree(node)), 0);
    const avgDegree = visibleNodeCount > 0 ? totalDegree / visibleNodeCount : 0;

    return {
      success: true,
      data: {
        density: graphDensity,
        diameter: graphDiameter,
        avgDegree,
        visibleNodeCount,
        visibleEdgeCount,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Statistics computation failed: ${error}`,
    };
  }
}

/**
 * Expand existing subgraph
 * CRITICAL: Only adds visible nodes
 */
export function expandContext(input: ExpandContextInput, context: ToolContext): ToolResult<ExpandContextOutput> {
  const { currentNodeIds, expansionStrategy, depth = '1' } = input;
  const graph = getGraph(context);
  const depthNum = parseNumberLike(depth, 1);

  const currentSet = new Set(currentNodeIds);
  const newNodes = new Set<string>();

  if (expansionStrategy === 'neighbors') {
    // Add k-hop neighbors
    const queue = currentNodeIds.map(id => ({ id, distance: 0 }));
    const visited = new Set(currentNodeIds);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.distance >= depthNum) continue;

      graph.forEachNeighbor(current.id, (neighbor, attrs) => {
        // Skip hidden neighbors
        if (attrs.hidden) return;

        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          if (!currentSet.has(neighbor)) {
            newNodes.add(neighbor);
          }
          queue.push({ id: neighbor, distance: current.distance + 1 });
        }
      });
    }
  } else if (expansionStrategy === 'pathBased') {
    // Add nodes on paths between current nodes
    for (let i = 0; i < currentNodeIds.length; i++) {
      for (let j = i + 1; j < currentNodeIds.length; j++) {
        try {
          const paths = allSimplePaths(graph, currentNodeIds[i], currentNodeIds[j], { maxDepth: depthNum + 2 });

          for (const path of paths) {
            // Skip paths with hidden nodes
            const hasHiddenNode = path.some(nodeId => graph.getNodeAttribute(nodeId, 'hidden'));
            if (hasHiddenNode) continue;

            for (const nodeId of path) {
              if (!currentSet.has(nodeId)) {
                newNodes.add(nodeId);
              }
            }
          }
        } catch {
          // Path not found, continue
        }
      }
    }
  }

  return {
    success: true,
    data: {
      newNodes: Array.from(newNodes),
      totalNodes: currentSet.size + newNodes.size,
      summary: `Added ${newNodes.size} new nodes via ${expansionStrategy} expansion (depth ${depthNum})`,
    },
  };
}

// ============================================================================
// Visualization Tools
// ============================================================================

/**
 * Highlight nodes and zoom camera
 */
export function highlightNodes(input: HighlightNodesInput, context: ToolContext): ToolResult {
  const { nodeLabelsOrIds } = input;
  const {
    store: { sigmaInstance, nodeNameToIdTrie },
  } = context;
  if (!sigmaInstance) {
    return {
      success: false,
      error: 'Sigma instance not available in context',
    };
  }
  const graph = getGraph(context);

  // Resolve labels to IDs
  const nodeIds = nodeLabelsOrIds
    .map(labelOrId => resolveLabelOrId(graph, labelOrId, nodeNameToIdTrie))
    .filter((id): id is string => id !== null);

  if (nodeIds.length === 0) {
    return {
      success: false,
      error: `None of the specified nodes found: ${nodeLabelsOrIds.join(', ')}`,
    };
  }

  // Update node attributes
  for (const nodeId of nodeIds) {
    graph.updateNodeAttributes(nodeId, attrs => {
      attrs.highlighted = true;
      attrs.zIndex = 100;
      return attrs;
    });
  }

  // Calculate camera target (center of highlighted nodes)
  let sumX = 0;
  let sumY = 0;
  for (const nodeId of nodeIds) {
    const pos = sigmaInstance.getNodeDisplayData(nodeId);
    if (pos) {
      sumX += pos.x;
      sumY += pos.y;
    }
  }

  const centerX = sumX / nodeIds.length;
  const centerY = sumY / nodeIds.length;

  return {
    success: true,
    data: { highlightedCount: nodeIds.length, nodeIds },
    visualUpdate: {
      highlightedNodes: nodeIds,
      cameraTarget: { x: centerX, y: centerY, ratio: 0.5 },
    },
  };
}

/**
 * Show/hide nodes by type
 */
export function filterByNodeType(input: FilterByNodeTypeInput, context: ToolContext): ToolResult {
  const { nodeType, visible } = input;
  const graph = getGraph(context);
  const visibleBool = parseBooleanLike(visible, true);

  let count = 0;
  graph.updateEachNodeAttributes((_node, attrs) => {
    if (attrs.nodeType === nodeType) {
      attrs.hidden = !visibleBool;
      count++;
    }
    return attrs;
  });

  return {
    success: true,
    data: {
      nodeType,
      visible: visibleBool,
      affectedNodes: count,
    },
  };
}

/**
 * Search for available properties by query
 * CRITICAL: Must be called before applyNodeColorByProperty or applyNodeSizeByProperty
 * NOTE: Too many properties to list all at once, search query is REQUIRED
 */
export function listAvailableProperties(
  input: ListAvailablePropertiesInput,
  context: ToolContext,
): ToolResult<ListAvailablePropertiesOutput> {
  const { query, nodeType, limit = '50' } = input;
  const { propertySearchIndex } = context;
  const limitNum = parseNumberLike(limit, 50);

  if (!query || query.trim().length === 0) {
    return {
      success: false,
      error:
        'Search query is required. Too many properties to list without filtering. Example queries: "pathway", "expression", "druggability", "OpenTargets"',
    };
  }

  // Search using FlexSearch index
  const searchResults = propertySearchIndex.index.search(query, { limit: limitNum * 2 });

  const properties: ListAvailablePropertiesOutput['properties'] = [];
  for (const propertyName of searchResults as string[]) {
    const metadata = propertySearchIndex.metadata.get(propertyName);
    if (!metadata) continue;

    // Filter by nodeType if specified
    if (nodeType && metadata.targetNodeType !== nodeType) continue;

    // Check if this is a category (no dot in name for Gene properties)
    const isCategory = metadata.targetNodeType === 'Gene' && !propertyName.includes('.');

    properties.push({
      name: propertyName,
      nodeType: metadata.targetNodeType,
      source: metadata.source,
      isCategory,
    });
  }

  return {
    success: true,
    data: {
      properties: properties.slice(0, limitNum),
      count: properties.length,
      truncated: properties.length > limitNum,
    },
  };
}

/**
 * Map node color to property value
 * CRITICAL: Must call listAvailableProperties first to get valid property names
 */
export function applyNodeColorByProperty(
  input: ApplyNodeColorByPropertyInput,
  context: ToolContext,
): ToolResult<ApplyNodeColorByPropertyOutput> {
  const { nodeType, propertyName } = input;
  const { store } = context;
  const graph = getGraph(context);

  // Special handling for Gene nodes (legacy system)
  if (nodeType === 'Gene') {
    // For Gene nodes, propertyName can be:
    // 1. Category name (e.g., 'DEG', 'Pathway')
    // 2. Full property name (e.g., 'DEG.log2FoldChange', 'Pathway.KEGG')
    const { legacy_store } = context;

    // Parse propertyName (category or category.property)
    const parts = propertyName.split('.');
    const category = parts[0];

    const actualPropertyName = parts.length > 1 ? propertyName.slice(category.length + 1) : category;
    // Validate category exists in radioOptions
    const radioOptions = legacy_store.radioOptions || { user: {}, database: {} };
    const categoryExists = category in radioOptions.database || category in radioOptions.user;

    if (!categoryExists) {
      return {
        success: false,
        error: `Gene property category '${category}' not found in radioOptions. Search for available properties first using listAvailableProperties.`,
      };
    }
    if (parts.length < 2) {
      return {
        success: false,
        error: `For Gene nodes, please provide full property name (e.g., '${category}.log2FoldChange') instead of just category '${category}'.`,
      };
    }
    const propertyInUser = radioOptions.user[category as GeneProperties].includes(actualPropertyName);
    const propertyInDatabase = radioOptions.database[category as GeneProperties].find(
      val => val.name === actualPropertyName,
    );

    if (!propertyInUser && !propertyInDatabase) {
      return {
        success: false,
        error: `Property '${actualPropertyName}' not found in category '${category}'. Search for available properties first using listAvailableProperties.`,
      };
    }

    // Apply colors via legacy store
    useStore.setState({
      selectedRadioNodeColor: category as NodeColorType,
      selectedNodeColorProperty: actualPropertyName,
    });

    // Update active property node types
    const activePropertyNodeTypes = store.activePropertyNodeTypes || [];
    if (!activePropertyNodeTypes.includes('Gene')) {
      store.activePropertyNodeTypes = [...activePropertyNodeTypes, 'Gene'];
    }

    let nodeCount = 0;
    graph.forEachNode((_nodeId, attrs) => {
      if (!attrs.hidden && attrs.nodeType === 'Gene') {
        nodeCount++;
      }
    });

    return {
      success: true,
      data: {
        appliedToNodeType: 'Gene',
        propertyName,
        nodeCount,
      },
    };
  }

  // Non-Gene nodes: use KG property system
  const kgPropertyOptions = store.kgPropertyOptions || {};
  if (!kgPropertyOptions[propertyName]) {
    return {
      success: false,
      error: `Property '${propertyName}' not found. Call listAvailableProperties first to see available properties.`,
    };
  }

  const propertyMeta = kgPropertyOptions[propertyName];
  if (propertyMeta.targetNodeType !== nodeType) {
    return {
      success: false,
      error: `Property '${propertyName}' is for node type '${propertyMeta.targetNodeType}', not '${nodeType}'`,
    };
  }

  // Get property values
  const nodePropertyData = store.nodePropertyData || {};
  const values: number[] = [];
  const nodeIds: string[] = [];

  graph.forEachNode((nodeId, attrs) => {
    if (attrs.hidden) return;
    if (attrs.nodeType !== nodeType) return;

    const nodeProps = nodePropertyData[nodeId];
    if (nodeProps && propertyName in nodeProps) {
      values.push(Number(nodeProps[propertyName]));
      nodeIds.push(nodeId);
    }
  });

  if (values.length === 0) {
    return {
      success: false,
      error: `No nodes with property '${propertyName}' found`,
    };
  }

  // Calculate color scale
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  // Apply colors
  for (let i = 0; i < nodeIds.length; i++) {
    const nodeId = nodeIds[i];
    const value = values[i];
    const normalizedValue = range > 0 ? (value - min) / range : 0.5;

    // Simple red-yellow-green gradient
    const r = Math.round(255 * (1 - normalizedValue));
    const g = Math.round(255 * normalizedValue);
    const color = `rgb(${r}, ${g}, 0)`;

    graph.setNodeAttribute(nodeId, 'color', color);
  }

  // Update active property node types
  const activePropertyNodeTypes = store.activePropertyNodeTypes || [];
  if (!activePropertyNodeTypes.includes(nodeType)) {
    store.activePropertyNodeTypes = [...activePropertyNodeTypes, nodeType];
  }

  return {
    success: true,
    data: {
      appliedToNodeType: nodeType,
      propertyName,
      nodeCount: nodeIds.length,
    },
  };
}

/**
 * Map node size to property value
 * CRITICAL: Must call listAvailableProperties first to get valid property names
 */
export function applyNodeSizeByProperty(
  input: ApplyNodeSizeByPropertyInput,
  context: ToolContext,
): ToolResult<ApplyNodeSizeByPropertyOutput> {
  const { nodeType, propertyName } = input;
  const { store } = context;
  const graph = getGraph(context);

  // Special handling for Gene nodes (legacy system)
  if (nodeType === 'Gene') {
    // For Gene nodes, propertyName is a category (DEG, Pathway, etc.)
    // We need to use useStore to set selectedRadioNodeSize
    // This triggers the existing KGSizeAnalysis component to apply sizes

    // Valid Gene property categories
    const validCategories = ['DEG', 'Pathway', 'Druggability', 'TE', 'OpenTargets', 'OT_Prioritization'];

    if (!validCategories.includes(propertyName)) {
      return {
        success: false,
        error: `Invalid Gene property category '${propertyName}'. Valid categories: ${validCategories.join(', ')}`,
      };
    }

    // Do similar stuff by splitting getting actual property from legacy_store
    const { legacy_store } = context;
    const radioOptions = legacy_store.radioOptions || { user: {}, database: {} };

    const parts = propertyName.split('.');
    const propertyCategory = parts[0];
    const actualPropertyName = parts.slice(1).join('.');

    // Check if propertyName exists in radioOptions
    const categoryExists = propertyCategory in radioOptions.database || propertyCategory in radioOptions.user;

    if (!categoryExists) {
      return {
        success: false,
        error: `Gene property category '${propertyCategory}' not found in radioOptions. Search for available properties first using listAvailableProperties.`,
      };
    }
    if (parts.length < 2) {
      return {
        success: false,
        error: `For Gene nodes, please provide full property name (e.g., '${propertyCategory}.log2FoldChange') instead of just category '${propertyCategory}'.`,
      };
    }
    const propertyInUser = radioOptions.user[propertyCategory as GeneProperties].includes(actualPropertyName);
    const propertyInDatabase = radioOptions.database[propertyCategory as GeneProperties].find(
      val => val.name === actualPropertyName,
    );

    if (!propertyInUser && !propertyInDatabase) {
      return {
        success: false,
        error: `Property '${actualPropertyName}' not found in category '${propertyCategory}'. Search for available properties first using listAvailableProperties.`,
      };
    }

    // Apply sizes via legacy store
    useStore.setState({
      selectedRadioNodeSize: propertyName as NodeSizeType,
      selectedNodeSizeProperty: actualPropertyName,
    });

    // Update active property node types
    const activePropertyNodeTypes = store.activePropertyNodeTypes || [];
    if (!activePropertyNodeTypes.includes('Gene')) {
      store.activePropertyNodeTypes = [...activePropertyNodeTypes, 'Gene'];
    }

    let nodeCount = 0;
    graph.forEachNode((_nodeId, attrs) => {
      if (!attrs.hidden && attrs.nodeType === 'Gene') {
        nodeCount++;
      }
    });

    return {
      success: true,
      data: {
        appliedToNodeType: 'Gene',
        propertyName,
        nodeCount,
      },
    };
  }

  // Non-Gene nodes: use KG property system
  const kgPropertyOptions = store.kgPropertyOptions || {};
  if (!kgPropertyOptions[propertyName]) {
    return {
      success: false,
      error: `Property '${propertyName}' not found. Call listAvailableProperties first to see available properties.`,
    };
  }

  const propertyMeta = kgPropertyOptions[propertyName];
  if (propertyMeta.targetNodeType !== nodeType) {
    return {
      success: false,
      error: `Property '${propertyName}' is for node type '${propertyMeta.targetNodeType}', not '${nodeType}'`,
    };
  }

  // Get property values
  const nodePropertyData = store.nodePropertyData || {};
  const values: number[] = [];
  const nodeIds: string[] = [];

  graph.forEachNode((nodeId, attrs) => {
    if (attrs.hidden) return;
    if (attrs.nodeType !== nodeType) return;

    const nodeProps = nodePropertyData[nodeId];
    if (nodeProps && propertyName in nodeProps) {
      values.push(Number(nodeProps[propertyName]));
      nodeIds.push(nodeId);
    }
  });

  if (values.length === 0) {
    return {
      success: false,
      error: `No nodes with property '${propertyName}' found`,
    };
  }

  // Calculate size scale
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  const minSize = 5;
  const maxSize = 30;

  // Apply sizes
  for (let i = 0; i < nodeIds.length; i++) {
    const nodeId = nodeIds[i];
    const value = values[i];
    const normalizedValue = range > 0 ? (value - min) / range : 0.5;
    const size = minSize + (maxSize - minSize) * normalizedValue;

    graph.setNodeAttribute(nodeId, 'size', size);
  }

  // Update active property node types
  const activePropertyNodeTypes = store.activePropertyNodeTypes || [];
  if (!activePropertyNodeTypes.includes(nodeType)) {
    store.activePropertyNodeTypes = [...activePropertyNodeTypes, nodeType];
  }

  return {
    success: true,
    data: {
      appliedToNodeType: nodeType,
      propertyName,
      nodeCount: nodeIds.length,
    },
  };
}

/**
 * Change edge style
 */
export function updateEdgeStyle(input: UpdateEdgeStyleInput, context: ToolContext): ToolResult<UpdateEdgeStyleOutput> {
  const { edgeIds, color, width, opacity } = input;
  const graph = getGraph(context);
  const widthNum = width !== undefined ? parseNumberLike(width, 1) : undefined;
  const opacityNum = opacity !== undefined ? parseNumberLike(opacity, 1) : undefined;

  let count = 0;

  if (edgeIds) {
    // Update specific edges
    for (const edgeId of edgeIds) {
      if (!graph.hasEdge(edgeId)) continue;
      graph.updateEdgeAttributes(edgeId, attrs => {
        if (color) attrs.color = color;
        if (widthNum !== undefined) attrs.size = widthNum;
        if (opacityNum !== undefined) attrs.opacity = opacityNum;
        count++;
        return attrs;
      });
    }
  } else {
    // Update all visible edges
    graph.updateEachEdgeAttributes((_edge, attrs, _source, _target, sourceAttrs, targetAttrs) => {
      if (attrs.hidden || sourceAttrs.hidden || targetAttrs.hidden) return attrs;

      if (color) attrs.color = color;
      if (widthNum !== undefined) attrs.size = widthNum;
      if (opacityNum !== undefined) attrs.opacity = opacityNum;
      count++;
      return attrs;
    });
  }

  return {
    success: true,
    data: { updatedCount: count },
  };
}

/**
 * Filter graph by edge weight (score)
 * Updates store.radialAnalysis.edgeWeightCutOff
 */
export function filterByEdgeWeight(
  input: FilterByEdgeWeightInput,
  context: ToolContext,
): ToolResult<FilterByEdgeWeightOutput> {
  const { edgeWeightCutoff } = input;
  const graph = getGraph(context);
  const cutoffNum = parseNumberLike(edgeWeightCutoff, 0);

  let visibleCount = 0;
  let hiddenCount = 0;

  // Count current state
  graph.forEachEdge((_edge, attrs) => {
    const score = attrs.score || 0;
    if (score < cutoffNum) {
      hiddenCount++;
    } else {
      visibleCount++;
    }
  });

  // Update store to trigger automatic UI updates
  useKGStore.setState(state => ({
    radialAnalysis: {
      ...state.radialAnalysis,
      edgeWeightCutOff: cutoffNum,
    },
  }));

  return {
    success: true,
    data: {
      visibleEdges: visibleCount,
      hiddenEdges: hiddenCount,
      appliedCutoff: cutoffNum,
    },
  };
}

/**
 * Filter graph by node degree
 * Updates store.radialAnalysis.candidatePrioritizationCutOff
 */
export function filterByNodeDegree(
  input: FilterByNodeDegreeInput,
  context: ToolContext,
): ToolResult<FilterByNodeDegreeOutput> {
  const { minDegree } = input;
  const { store } = context;
  const graph = getGraph(context);
  const minDegreeNum = parseNumberLike(minDegree, 0);

  let visibleCount = 0;
  let hiddenCount = 0;

  graph.updateEachNodeAttributes((node, attrs) => {
    const nodeDegree = graph.degree(node);
    attrs.hidden = nodeDegree < minDegreeNum;

    if (attrs.hidden) {
      hiddenCount++;
    } else {
      visibleCount++;
    }

    return attrs;
  });

  // Also hide edges with hidden nodes
  graph.updateEachEdgeAttributes((_edge, attrs, _source, _target, sourceAttrs, targetAttrs) => {
    if (sourceAttrs.hidden || targetAttrs.hidden) {
      attrs.hidden = true;
    }
    return attrs;
  });

  // Update store
  store.radialAnalysis = {
    ...store.radialAnalysis,
    candidatePrioritizationCutOff: minDegreeNum,
  };

  return {
    success: true,
    data: {
      visibleNodes: visibleCount,
      hiddenNodes: hiddenCount,
      appliedCutoff: minDegreeNum,
    },
  };
}

// ============================================================================
// Interaction Tools
// ============================================================================

/**
 * Simulate node click
 */
export function clickNode(input: ClickNodeInput, context: ToolContext): ToolResult<ClickNodeOutput> {
  const { nodeLabelOrId } = input;
  const { store } = context;
  const graph = getGraph(context);

  // Resolve label to ID
  const nodeId = resolveLabelOrId(graph, nodeLabelOrId, store.nodeNameToIdTrie);

  if (!nodeId) {
    return {
      success: false,
      error: `Node '${nodeLabelOrId}' not found`,
    };
  }

  const attrs = graph.getNodeAttributes(nodeId);

  // Get properties
  // biome-ignore lint/suspicious/noExplicitAny: Node properties can be of any type
  const properties: Record<string, any> = { ...attrs };
  const kgProps = store.nodePropertyData[nodeId];
  if (kgProps) {
    Object.assign(properties, kgProps);
  }

  return {
    success: true,
    data: {
      nodeId,
      label: attrs.label || nodeId,
      properties,
      neighbors: graph.degree(nodeId),
    },
  };
}

/**
 * Simulate edge click
 */
export function clickEdge(input: ClickEdgeInput, context: ToolContext): ToolResult<ClickEdgeOutput> {
  const { sourceId, targetId } = input;
  const graph = getGraph(context);

  const edgeId = graph.edge(sourceId, targetId);
  if (!edgeId) {
    return {
      success: false,
      error: `Edge between '${sourceId}' and '${targetId}' not found`,
    };
  }

  const attrs = graph.getEdgeAttributes(edgeId);

  return {
    success: true,
    data: {
      edgeId,
      source: sourceId,
      target: targetId,
      type: attrs.type || 'Unknown',
      properties: attrs,
    },
  };
}

/**
 * Select nodes to show detailed information in UI panels.
 * Use this when you want to display comprehensive node properties, connections, etc.
 * For simple visual highlights, use highlightNodes instead.
 */
export function selectMultipleNodes(
  input: SelectMultipleNodesInput,
  context: ToolContext,
): ToolResult<SelectMultipleNodesOutput> {
  const { nodeLabelsOrIds, append = 'false' } = input;
  const { store } = context;
  const graph = getGraph(context);
  const appendBool = parseBooleanLike(append, false);

  // Resolve labels to IDs
  const nodeIds = nodeLabelsOrIds
    .map(labelOrId => resolveLabelOrId(graph, labelOrId, store.nodeNameToIdTrie))
    .filter((id): id is string => id !== null);

  if (nodeIds.length === 0) {
    return {
      success: false,
      error: `None of the specified nodes found: ${nodeLabelsOrIds.join(', ')}`,
    };
  }

  // Update selection in store
  const currentSelection = appendBool ? store.selectedNodes || [] : [];
  const newSelection = [...new Set([...currentSelection, ...nodeIds])];

  useKGStore.setState({
    selectedNodes: newSelection,
  });

  // Also update nodeSearchQuery for visual highlighting
  const labels = newSelection.map(id => nodeIdToLabel(graph, id) || id);
  useKGStore.setState({
    nodeSearchQuery: labels.join(','),
  });

  // Get detailed info for each node
  const nodeDetails = newSelection.map(id => {
    const attrs = graph.getNodeAttributes(id);
    return {
      id,
      label: attrs.label || id,
      nodeType: attrs.nodeType || 'Unknown',
      degree: graph.degree(id),
      // biome-ignore lint/suspicious/noExplicitAny: Node properties can be of any type
      properties: attrs as Record<string, any>,
    };
  });

  return {
    success: true,
    data: {
      selectedIds: newSelection,
      selectedLabels: labels,
      count: newSelection.length,
      nodeDetails,
      summary: `Selected ${newSelection.length} nodes for detailed view: ${labels.slice(0, 3).join(', ')}${labels.length > 3 ? '...' : ''}`,
    },
  };
}

/**
 * Clear all selections
 */
export function clearSelection(context: ToolContext): ToolResult {
  const graph = getGraph(context);

  // Reset node highlights
  graph.updateEachNodeAttributes((_node, attrs) => {
    attrs.highlighted = false;
    attrs.zIndex = undefined;
    return attrs;
  });

  return {
    success: true,
    data: { cleared: true },
  };
}

// ============================================================================
// Tool Registry Export
// ============================================================================

export const KG_TOOLS = {
  // Graph Query
  searchNodes,
  getNodeProperties,
  findSimplePaths,
  getNeighborhood,
  filterSubgraph,
  computeCentrality,
  retrieveRelevantContext,
  extractSubgraph,

  // Analysis
  analyzeCommunities,
  applyDWPC,
  applyGSEA,
  computeNetworkStatistics,
  expandContext,

  // Visualization
  highlightNodes,
  filterByNodeType,
  listAvailableProperties,
  applyNodeColorByProperty,
  applyNodeSizeByProperty,
  updateEdgeStyle,
  filterByEdgeWeight,
  filterByNodeDegree,

  // Interaction
  clickNode,
  clickEdge,
  selectMultipleNodes,
  clearSelection,
};

export type KGToolName = keyof typeof KG_TOOLS;
