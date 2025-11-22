/**
 * Knowledge Graph Chat Type Definitions
 *
 * SINGLE SOURCE OF TRUTH: Zod schemas → inferred types
 *
 * Pattern:
 * 1. Define zod input schemas
 * 2. Define zod output schemas
 * 3. Export inferred TypeScript types via z.infer
 * 4. Create tool() definitions for AI SDK type inference
 * 5. Export KGUITools and KGUIMessage types
 */

import type { InferUITools, ToolSet, UIDataTypes, UIMessage } from 'ai';
import { tool } from 'ai';
import { z } from 'zod';

// ============================================================================
// Zod Schemas - Input & Output (Single Source of Truth)
// ============================================================================

// ------------------------
// Graph Query Tools (8)
// ------------------------

// searchNodes
export const searchNodesInputSchema = z.object({
  query: z.string().describe('Search query for node labels'),
  nodeType: z.string().optional().describe('Filter by specific node type'),
  // NOTE: All numeric inputs converted to string to avoid agent validation failures. Provide numeric string.
  limit: z.string().optional().default('20').describe('Maximum results to return (numeric string)'),
});

export const searchNodesOutputSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      nodeType: z.string(),
      degree: z.number(),
    }),
  ),
  count: z.number(),
  truncated: z.boolean(),
});

export type SearchNodesInput = z.infer<typeof searchNodesInputSchema>;
export type SearchNodesOutput = z.infer<typeof searchNodesOutputSchema>;

// getNodeProperties
export const getNodePropertiesInputSchema = z.object({
  nodeIds: z.array(z.string()).describe('Array of node IDs to get properties for'),
});

export const getNodePropertiesOutputSchema = z.object({
  properties: z.array(z.record(z.string(), z.any())),
});
export type GetNodePropertiesInput = z.infer<typeof getNodePropertiesInputSchema>;
export type GetNodePropertiesOutput = z.infer<typeof getNodePropertiesOutputSchema>;

// findPaths
export const findSimplePathsInputSchema = z.object({
  sourceLabelOrId: z.string().describe('Source node label or ID'),
  targetLabelOrId: z.string().describe('Target node label or ID'),
  maxLength: z.string().optional().default('5').describe('Maximum path length (numeric string)'),
  maxPaths: z.string().optional().default('100').describe('Maximum paths to find (numeric string)'),
});

export const findSimplePathsOutputSchema = z.object({
  paths: z.array(
    z.object({
      nodeIds: z.array(z.string()),
      nodeLabels: z.array(z.string()),
      length: z.number(),
    }),
  ),
  count: z.number(),
  sourceId: z.string(),
  targetId: z.string(),
  summary: z.string().optional(),
});

export type FindSimplePathsInput = z.infer<typeof findSimplePathsInputSchema>;
export type FindSimplePathsOutput = z.infer<typeof findSimplePathsOutputSchema>;

// getNeighborhood
export const getNeighborhoodInputSchema = z.object({
  nodeLabelsOrIds: z.array(z.string()).describe('Center node labels or IDs'),
  hops: z.string().optional().default('1').describe('Number of hops (numeric string)'),
});

export const getNeighborhoodOutputSchema = z.object({
  neighbors: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      nodeType: z.string(),
    }),
  ),
  edges: z.array(
    z.object({
      source: z.string(),
      target: z.string(),
      type: z.string(),
    }),
  ),
  centerNodeIds: z.array(z.string()),
});

export type GetNeighborhoodInput = z.infer<typeof getNeighborhoodInputSchema>;
export type GetNeighborhoodOutput = z.infer<typeof getNeighborhoodOutputSchema>;

// filterSubgraph
export const filterSubgraphInputSchema = z.object({
  nodeTypes: z.array(z.string()).optional().describe('Filter by node types'),
  edgeTypes: z.array(z.string()).optional().describe('Filter by edge types'),
  propertyConditions: z
    .array(
      z.object({
        property: z.string(),
        operator: z.enum(['=', '>', '<', '>=', '<=']),
        // All values coerced to string; tool implementation will parse numeric/boolean semantics.
        value: z.string(),
      }),
    )
    .optional()
    .describe('Property filter conditions'),
});

export const filterSubgraphOutputSchema = z.object({
  matchingNodes: z.array(z.string()),
  matchingEdges: z.array(z.string()),
});

export type FilterSubgraphInput = z.infer<typeof filterSubgraphInputSchema>;
export type FilterSubgraphOutput = z.infer<typeof filterSubgraphOutputSchema>;

// computeCentrality
export const computeCentralityInputSchema = z.object({
  metric: z.enum(['degree', 'betweenness', 'closeness', 'eigenvector']).describe('Centrality metric to compute'),
  nodeIds: z.array(z.string()).optional().describe('Specific nodes to compute (optional, computes all if omitted)'),
});

export const computeCentralityOutputSchema = z.object({
  rankings: z.array(
    z.object({
      nodeId: z.string(),
      label: z.string(),
      score: z.number(),
    }),
  ),
});

export type ComputeCentralityInput = z.infer<typeof computeCentralityInputSchema>;
export type ComputeCentralityOutput = z.infer<typeof computeCentralityOutputSchema>;

// retrieveRelevantContext
export const retrieveRelevantContextInputSchema = z.object({
  query: z.string().describe('Query for BM25 search'),
  topK: z.string().optional().default('30').describe('Number of results to retrieve (numeric string)'),
});

export const retrieveRelevantContextOutputSchema = z.object({
  relevantNodes: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      score: z.number(),
      nodeType: z.string(),
    }),
  ),
  subgraphSize: z.number(),
});

export type RetrieveRelevantContextInput = z.infer<typeof retrieveRelevantContextInputSchema>;
export type RetrieveRelevantContextOutput = z.infer<typeof retrieveRelevantContextOutputSchema>;

// extractSubgraph
export const extractSubgraphInputSchema = z.object({
  nodeIds: z.array(z.string()).describe('Node IDs to extract'),
  includeNeighbors: z.string().optional().default('false').describe('Include 1-hop neighbors (boolean string)'),
});

export const extractSubgraphOutputSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      type: z.string(),
      degree: z.number(),
    }),
  ),
  edges: z.array(
    z.object({
      source: z.string(),
      target: z.string(),
      type: z.string(),
    }),
  ),
  statistics: z.object({
    nodeCount: z.number(),
    edgeCount: z.number(),
    nodesByType: z.record(z.string(), z.number()),
    topCentralNodes: z.array(z.string()),
  }),
});

export type ExtractSubgraphInput = z.infer<typeof extractSubgraphInputSchema>;
export type ExtractSubgraphOutput = z.infer<typeof extractSubgraphOutputSchema>;

// ------------------------
// Analysis Tools (5)
// ------------------------

// analyzeCommunities
export const analyzeCommunitiesInputSchema = z.object({
  resolution: z.string().optional().default('1').describe('Louvain resolution parameter (numeric string, e.g. 1)'),
  weighted: z.string().optional().default('false').describe('Use edge weights for clustering (boolean string)'),
  minCommunitySize: z.string().optional().default('3').describe('Minimum community size to display (numeric string)'),
});

export const analyzeCommunitiesOutputSchema = z.object({
  communities: z.array(
    z.object({
      id: z.number(),
      nodeCount: z.number(),
      topNodes: z.array(
        z.object({
          id: z.string(),
          label: z.string(),
        }),
      ),
    }),
  ),
  modularity: z.number(),
  summary: z.string().optional(),
});

export type AnalyzeCommunitiesInput = z.infer<typeof analyzeCommunitiesInputSchema>;
export type AnalyzeCommunitiesOutput = z.infer<typeof analyzeCommunitiesOutputSchema>;

// applyDWPC
export const applyDWPCInputSchema = z.object({
  sourceLabelOrId: z.string().describe('Source node'),
  targetLabelOrId: z.string().describe('Target node'),
  damping: z.string().optional().default('0.5').describe('Damping factor (numeric string between 0 and 1)'),
  maxHops: z.string().optional().default('5').describe('Maximum hops to search (numeric string)'),
  maxPaths: z.string().optional().default('10000').describe('Maximum paths to find (numeric string)'),
});

export const applyDWPCOutputSchema = z.object({
  dwpcScore: z.number(),
  paths: z.array(
    z.object({
      nodeIds: z.array(z.string()),
      nodeLabels: z.array(z.string()),
      metapath: z.string(),
    }),
  ),
  sourceId: z.string(),
  targetId: z.string(),
  explanation: z.string().optional(),
  topMetapaths: z
    .array(
      z.object({
        metapath: z.string(),
        count: z.number(),
      }),
    )
    .optional(),
  summary: z.string().optional(),
});

export type ApplyDWPCInput = z.infer<typeof applyDWPCInputSchema>;
export type ApplyDWPCOutput = z.infer<typeof applyDWPCOutputSchema>;

// applyGSEA
export const applyGSEAInputSchema = z.object({
  geneNames: z.array(z.string()).describe('Gene names for GSEA'),
});

export const applyGSEAOutputSchema = z.object({
  enrichedPathways: z.array(
    z.object({
      Pathway: z.string(),
      Overlap: z.string(),
      'P-value': z.string(),
      'Adjusted P-value': z.string(),
      'Odds Ratio': z.string(),
      'Combined Score': z.string(),
      Genes: z.string(),
    }),
  ),
  inputGeneNames: z.array(z.string()),
});

export type ApplyGSEAInput = z.infer<typeof applyGSEAInputSchema>;
export type ApplyGSEAOutput = z.infer<typeof applyGSEAOutputSchema>;

// computeNetworkStatistics
export const computeNetworkStatisticsInputSchema = z.object({});

export const computeNetworkStatisticsOutputSchema = z.object({
  density: z.number(),
  diameter: z.number(),
  avgDegree: z.number(),
  visibleNodeCount: z.number(),
  visibleEdgeCount: z.number(),
});

export type ComputeNetworkStatisticsInput = z.infer<typeof computeNetworkStatisticsInputSchema>;
export type ComputeNetworkStatisticsOutput = z.infer<typeof computeNetworkStatisticsOutputSchema>;

// expandContext
export const expandContextInputSchema = z.object({
  currentNodeIds: z.array(z.string()).describe('Current node set (ENSEMBL IDs not Gene Symbols)'),
  expansionStrategy: z.enum(['neighbors', 'pathBased']).describe('How to expand'),
  depth: z.string().optional().default('1').describe('Expansion depth (numeric string)'),
});

export const expandContextOutputSchema = z.object({
  newNodes: z.array(z.string()),
  totalNodes: z.number(),
  summary: z.string(),
});

export type ExpandContextInput = z.infer<typeof expandContextInputSchema>;
export type ExpandContextOutput = z.infer<typeof expandContextOutputSchema>;

// ------------------------
// Visualization Tools (10)
// ------------------------

// highlightNodes
export const highlightNodesInputSchema = z.object({
  nodeLabelsOrIds: z.array(z.string()).describe('Nodes to highlight'),
});

export const highlightNodesOutputSchema = z.object({
  highlightedNodes: z.array(z.string()),
  highlightedLabels: z.array(z.string()).optional(),
  count: z.number(),
  summary: z.string().optional(),
});

export type HighlightNodesInput = z.infer<typeof highlightNodesInputSchema>;
export type HighlightNodesOutput = z.infer<typeof highlightNodesOutputSchema>;

// filterByNodeType
export const filterByNodeTypeInputSchema = z.object({
  nodeType: z.string().describe('Node type to filter'),
  visible: z.string().describe('Show or hide this node type (boolean string)'),
});

export const filterByNodeTypeOutputSchema = z.object({
  nodeType: z.string(),
  visible: z.boolean(),
  affectedNodes: z.number(),
});

export type FilterByNodeTypeInput = z.infer<typeof filterByNodeTypeInputSchema>;
export type FilterByNodeTypeOutput = z.infer<typeof filterByNodeTypeOutputSchema>;

// listAvailableProperties
export const listAvailablePropertiesInputSchema = z.object({
  query: z.string().describe('Search query for properties (REQUIRED)'),
  nodeType: z.string().optional().describe('Filter by node type'),
  limit: z.string().optional().default('50').describe('Maximum results (numeric string)'),
});

export const listAvailablePropertiesOutputSchema = z.object({
  properties: z.array(
    z.object({
      name: z.string(),
      nodeType: z.string(),
      source: z.enum(['file', 'backend']),
      isCategory: z.boolean().optional(),
    }),
  ),
  count: z.number(),
  truncated: z.boolean(),
});

export type ListAvailablePropertiesInput = z.infer<typeof listAvailablePropertiesInputSchema>;
export type ListAvailablePropertiesOutput = z.infer<typeof listAvailablePropertiesOutputSchema>;

// applyNodeColorByProperty
export const applyNodeColorByPropertyInputSchema = z.object({
  nodeType: z.string().describe('Node type to apply property to'),
  propertyName: z.string().describe('Property name or category (for Gene nodes)'),
});

export const applyNodeColorByPropertyOutputSchema = z.object({
  appliedToNodeType: z.string(),
  propertyName: z.string(),
  nodeCount: z.number(),
  topCandidates: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
      }),
    )
    .optional(),
  bottomCandidates: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
      }),
    )
    .optional(),
  summary: z.string().optional(),
});

export type ApplyNodeColorByPropertyInput = z.infer<typeof applyNodeColorByPropertyInputSchema>;
export type ApplyNodeColorByPropertyOutput = z.infer<typeof applyNodeColorByPropertyOutputSchema>;

// applyNodeSizeByProperty
export const applyNodeSizeByPropertyInputSchema = z.object({
  nodeType: z.string().describe('Node type to apply property to'),
  propertyName: z.string().describe('Property name or category (for Gene nodes)'),
});

export const applyNodeSizeByPropertyOutputSchema = z.object({
  appliedToNodeType: z.string(),
  propertyName: z.string(),
  nodeCount: z.number(),
  topCandidates: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
      }),
    )
    .optional(),
  bottomCandidates: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
      }),
    )
    .optional(),
  summary: z.string().optional(),
});

export type ApplyNodeSizeByPropertyInput = z.infer<typeof applyNodeSizeByPropertyInputSchema>;
export type ApplyNodeSizeByPropertyOutput = z.infer<typeof applyNodeSizeByPropertyOutputSchema>;

// updateEdgeStyle
export const updateEdgeStyleInputSchema = z.object({
  edgeIds: z.array(z.string()).optional().describe('Specific edge IDs (optional, updates all if omitted)'),
  color: z.string().optional().describe('Edge color'),
  width: z.string().optional().describe('Edge width (numeric string)'),
  opacity: z.string().optional().describe('Edge opacity (numeric string between 0 and 1)'),
});

export const updateEdgeStyleOutputSchema = z.object({
  updatedCount: z.number(),
});

export type UpdateEdgeStyleInput = z.infer<typeof updateEdgeStyleInputSchema>;
export type UpdateEdgeStyleOutput = z.infer<typeof updateEdgeStyleOutputSchema>;

// filterByEdgeWeight
export const filterByEdgeWeightInputSchema = z.object({
  edgeWeightCutoff: z.string().describe('Minimum edge weight (numeric string between 0 and 1)'),
});

export const filterByEdgeWeightOutputSchema = z.object({
  visibleEdges: z.number(),
  hiddenEdges: z.number(),
  appliedCutoff: z.number(),
});

export type FilterByEdgeWeightInput = z.infer<typeof filterByEdgeWeightInputSchema>;
export type FilterByEdgeWeightOutput = z.infer<typeof filterByEdgeWeightOutputSchema>;

// filterByNodeDegree
export const filterByNodeDegreeInputSchema = z.object({
  minDegree: z.string().describe('Minimum node degree (numeric string)'),
});

export const filterByNodeDegreeOutputSchema = z.object({
  visibleNodes: z.number(),
  hiddenNodes: z.number(),
  appliedCutoff: z.number(),
});

export type FilterByNodeDegreeInput = z.infer<typeof filterByNodeDegreeInputSchema>;
export type FilterByNodeDegreeOutput = z.infer<typeof filterByNodeDegreeOutputSchema>;

// ------------------------
// Interaction Tools (4)
// ------------------------

// clickNode
export const clickNodeInputSchema = z.object({
  nodeLabelOrId: z.string().describe('Node to click/select'),
});

export const clickNodeOutputSchema = z.object({
  nodeId: z.string(),
  label: z.string(),
  properties: z.record(z.string(), z.any()),
  neighbors: z.number(),
});
export type ClickNodeInput = z.infer<typeof clickNodeInputSchema>;
export type ClickNodeOutput = z.infer<typeof clickNodeOutputSchema>;

// clickEdge
export const clickEdgeInputSchema = z.object({
  sourceId: z.string().describe('Source node ID'),
  targetId: z.string().describe('Target node ID'),
});

export const clickEdgeOutputSchema = z.object({
  edgeId: z.string(),
  source: z.string(),
  target: z.string(),
  type: z.string(),
  properties: z.record(z.string(), z.any()),
});
export type ClickEdgeInput = z.infer<typeof clickEdgeInputSchema>;
export type ClickEdgeOutput = z.infer<typeof clickEdgeOutputSchema>;

// selectMultipleNodes
export const selectMultipleNodesInputSchema = z.object({
  nodeLabelsOrIds: z.array(z.string()).describe('Nodes to select'),
  append: z.string().optional().default('false').describe('Append to existing selection or replace (boolean string)'),
});

export const selectMultipleNodesOutputSchema = z.object({
  selectedIds: z.array(z.string()),
  selectedLabels: z.array(z.string()),
  count: z.number(),
  nodeDetails: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        nodeType: z.string(),
        degree: z.number(),
        properties: z.record(z.string(), z.any()),
      }),
    )
    .optional(),
  summary: z.string().optional(),
});

export type SelectMultipleNodesInput = z.infer<typeof selectMultipleNodesInputSchema>;
export type SelectMultipleNodesOutput = z.infer<typeof selectMultipleNodesOutputSchema>;

// clearSelection
export const clearSelectionInputSchema = z.object({});

export const clearSelectionOutputSchema = z.object({
  cleared: z.boolean(),
});

export type ClearSelectionInput = z.infer<typeof clearSelectionInputSchema>;
export type ClearSelectionOutput = z.infer<typeof clearSelectionOutputSchema>;

// ============================================================================
// Tool Definitions for AI SDK (Type Inference Only)
// ============================================================================

/**
 * KG Tools - Client-side tool definitions for type inference
 *
 * IMPORTANT: These are NOT executed directly!
 * - For backend execution: Tools are sent to /kg-chat API endpoint
 * - For client-side execution: onToolCall handler in KGChat.tsx dispatches to lib/kg-tools.ts
 *
 * These definitions exist ONLY for TypeScript type inference via InferUITools
 */
export const kgTools = {
  // Graph Query Tools (8)
  searchNodes: tool({
    name: 'searchNodes',
    description: 'Search for nodes by label using fuzzy matching. Only returns visible nodes.',
    inputSchema: searchNodesInputSchema,
    outputSchema: searchNodesOutputSchema,
  }),
  getNodeProperties: tool({
    description: 'Get all properties for specific nodes. Excludes hidden nodes.',
    inputSchema: getNodePropertiesInputSchema,
    outputSchema: getNodePropertiesOutputSchema,
  }),
  findSimplePaths: tool({
    description:
      'Find simple paths between two nodes using graphology-simple-path. Returns shortest paths first. Excludes paths through hidden nodes.',
    inputSchema: findSimplePathsInputSchema,
    outputSchema: findSimplePathsOutputSchema,
  }),
  getNeighborhood: tool({
    description: 'Get immediate neighbors of node(s). Excludes hidden neighbors.',
    inputSchema: getNeighborhoodInputSchema,
    outputSchema: getNeighborhoodOutputSchema,
  }),
  filterSubgraph: tool({
    description: 'Filter graph by node types, edge types, or property conditions. Only returns visible entities.',
    inputSchema: filterSubgraphInputSchema,
    outputSchema: filterSubgraphOutputSchema,
  }),
  computeCentrality: tool({
    description:
      'Calculate centrality metrics (degree, betweenness, closeness, eigenvector). Only computes for visible nodes.',
    inputSchema: computeCentralityInputSchema,
    outputSchema: computeCentralityOutputSchema,
  }),
  retrieveRelevantContext: tool({
    description: 'BM25 search + graph expansion for context retrieval. Only returns visible nodes.',
    inputSchema: retrieveRelevantContextInputSchema,
    outputSchema: retrieveRelevantContextOutputSchema,
  }),
  extractSubgraph: tool({
    description: 'Extract subgraph and format as structured JSON. Excludes hidden entities.',
    inputSchema: extractSubgraphInputSchema,
    outputSchema: extractSubgraphOutputSchema,
  }),

  // Analysis Tools (5)
  analyzeCommunities: tool({
    description: 'Detect communities with Louvain algorithm. Only includes visible nodes.',
    inputSchema: analyzeCommunitiesInputSchema,
    outputSchema: analyzeCommunitiesOutputSchema,
  }),
  applyDWPC: tool({
    description: 'Degree-Weighted Path Count (DWPC) between two nodes. Excludes paths through hidden nodes.',
    inputSchema: applyDWPCInputSchema,
    outputSchema: applyDWPCOutputSchema,
  }),
  applyGSEA: tool({
    description: 'Gene Set Enrichment Analysis (GSEA) via Python backend. Only works with Gene nodes.',
    inputSchema: applyGSEAInputSchema,
    outputSchema: applyGSEAOutputSchema,
  }),
  computeNetworkStatistics: tool({
    description: 'Compute overall graph metrics. Only computes for visible nodes/edges.',
    inputSchema: computeNetworkStatisticsInputSchema,
    outputSchema: computeNetworkStatisticsOutputSchema,
  }),
  expandContext: tool({
    description: 'Expand existing subgraph with neighbors or paths. Only adds visible nodes.',
    inputSchema: expandContextInputSchema,
    outputSchema: expandContextOutputSchema,
  }),

  // Visualization Tools (10)
  highlightNodes: tool({
    description: 'Highlight nodes and zoom camera to them.',
    inputSchema: highlightNodesInputSchema,
    outputSchema: highlightNodesOutputSchema,
  }),
  filterByNodeType: tool({
    description: 'Show or hide nodes by type.',
    inputSchema: filterByNodeTypeInputSchema,
    outputSchema: filterByNodeTypeOutputSchema,
  }),
  listAvailableProperties: tool({
    description:
      'Search for available properties by query. CRITICAL: Query is REQUIRED - too many properties to list without filtering.',
    inputSchema: listAvailablePropertiesInputSchema,
    outputSchema: listAvailablePropertiesOutputSchema,
  }),
  applyNodeColorByProperty: tool({
    description:
      'Map node color to property value. CRITICAL: For Gene nodes, use category names (DEG, Pathway, etc.). For other nodes, use individual property names. Call listAvailableProperties first.',
    inputSchema: applyNodeColorByPropertyInputSchema,
    outputSchema: applyNodeColorByPropertyOutputSchema,
  }),
  applyNodeSizeByProperty: tool({
    description:
      'Map node size to property value. CRITICAL: For Gene nodes, use category names (DEG, Pathway, etc.). For other nodes, use individual property names. Call listAvailableProperties first.',
    inputSchema: applyNodeSizeByPropertyInputSchema,
    outputSchema: applyNodeSizeByPropertyOutputSchema,
  }),
  updateEdgeStyle: tool({
    description: 'Update edge visual styling (color, width, opacity).',
    inputSchema: updateEdgeStyleInputSchema,
    outputSchema: updateEdgeStyleOutputSchema,
  }),
  filterByEdgeWeight: tool({
    description: 'Filter edges by minimum weight threshold.',
    inputSchema: filterByEdgeWeightInputSchema,
    outputSchema: filterByEdgeWeightOutputSchema,
  }),
  filterByNodeDegree: tool({
    description: 'Filter nodes by minimum degree threshold.',
    inputSchema: filterByNodeDegreeInputSchema,
    outputSchema: filterByNodeDegreeOutputSchema,
  }),

  // Interaction Tools (4)
  clickNode: tool({
    description: 'Select/click a specific node.',
    inputSchema: clickNodeInputSchema,
    outputSchema: clickNodeOutputSchema,
  }),
  clickEdge: tool({
    description: 'Select/click a specific edge by source and target.',
    inputSchema: clickEdgeInputSchema,
    outputSchema: clickEdgeOutputSchema,
  }),
  selectMultipleNodes: tool({
    description: 'Select multiple nodes at once for showing details.',
    inputSchema: selectMultipleNodesInputSchema,
    outputSchema: selectMultipleNodesOutputSchema,
  }),
  clearSelection: tool({
    description: 'Clear all node/edge selections.',
    inputSchema: clearSelectionInputSchema,
    outputSchema: clearSelectionOutputSchema,
  }),
} satisfies ToolSet;

// ============================================================================
// Type Inference - Extract types from tool definitions
// ============================================================================

/**
 * Inferred tool types from kgTools definition
 * Provides full type safety for tool inputs/outputs in messages
 */
export type KGUITools = InferUITools<typeof kgTools>;

/**
 * Custom UIMessage type for Knowledge Graph Chat
 *
 * Type Parameters:
 * - Metadata: never (no custom metadata needed)
 * - Data Parts: UIDataTypes (standard data parts - text, file, etc.)
 * - Tools: KGUITools (our 27 KG tools with full type safety)
 */
export type KGUIMessage = UIMessage<never, UIDataTypes, KGUITools>;

// ============================================================================
// Type Guards and Utilities
// ============================================================================

/**
 * Type guard to check if a tool call is for a specific tool
 */
export function isToolCall<T extends keyof KGUITools>(
  part: KGUIMessage['parts'][number],
  toolName: T,
): part is Extract<KGUIMessage['parts'][number], { type: `tool-${T}` }> {
  return part.type === `tool-${toolName}`;
}

/**
 * Extract tool name from part type (e.g., 'tool-searchNodes' -> 'searchNodes')
 */
export function extractToolName(partType: string): string {
  return partType.replace('tool-', '');
}

/**
 * Check if a message part is a tool-related part
 */
export function isToolPart(part: KGUIMessage['parts'][number]): boolean {
  return part.type.startsWith('tool-');
}
