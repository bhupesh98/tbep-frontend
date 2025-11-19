/**
 * Knowledge Graph Renderer Utility
 * Applies styling to knowledge graph nodes and edges based on their types
 */

import type Graph from 'graphology';
import type { Attributes } from 'graphology-types';
import type { EdgeAttributes, NodeAttributes } from '../interface';

/**
 * Predefined color palette for common node types
 * These take priority over auto-generated colors
 */
export const PREDEFINED_TYPE_COLORS: Record<string, string> = {
  Gene: '#3b82f6', // blue-500
  Disease: '#ef4444', // red-500
  Protein: '#10b981', // green-500
  Pathways: '#f59e0b', // amber-500
  Drug: '#8b5cf6', // violet-500
  Phenotypes: '#ec4899', // pink-500
  Tissue: '#06b6d4', // cyan-500
  CellType: '#14b8a6', // teal-500
};

/**
 * Color palette for dynamic type assignment (50 distinct colors)
 * Generated from various hue ranges to ensure visual distinction
 */
export const DYNAMIC_COLOR_PALETTE = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#0ea5e9',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
  '#f43f5e',
  '#fb7185',
  '#fda4af',
  '#fbbf24',
  '#a3e635',
  '#4ade80',
  '#34d399',
  '#2dd4bf',
  '#22d3ee',
  '#38bdf8',
  '#60a5fa',
  '#818cf8',
  '#a78bfa',
  '#c084fc',
  '#e879f9',
  '#f472b6',
  '#fb923c',
  '#fdba74',
  '#fcd34d',
  '#bef264',
  '#86efac',
  '#6ee7b7',
  '#5eead4',
  '#7dd3fc',
  '#93c5fd',
  '#a5b4fc',
  '#c4b5fd',
  '#d8b4fe',
  '#f0abfc',
  '#f9a8d4',
  '#fca5a5',
  '#fed7aa',
  '#fde68a',
  '#d9f99d',
];

/**
 * Default visual settings
 */
export const DEFAULT_NODE_SIZE = 5;
export const DEFAULT_NODE_COLOR = '#6b7280'; // gray-500
export const DEFAULT_EDGE_COLOR = '#d1d5db'; // gray-300
export const DEFAULT_NODE_TYPE = 'general';

/**
 * Curvature calculation for parallel edges
 * Uses exponential scaling to prevent excessive curves
 * Based on Sigma.js storybook implementation
 */
const AMPLITUDE = 3.5;
const DEFAULT_EDGE_CURVATURE = 0.15;

export function getCurvature(index: number, maxIndex: number): number {
  if (maxIndex <= 0) return 0;

  // Exponential scaling formula
  const scale = (1 - Math.exp(-maxIndex / AMPLITUDE)) / maxIndex;
  return AMPLITUDE * scale * DEFAULT_EDGE_CURVATURE * index;
}

/**
 * Generate dynamic color mapping for all node types in the graph
 * - Predefined types use their assigned colors
 * - Top 50 types by count get colors from the dynamic palette
 * - Remaining types get the default color
 */
export function generateTypeColorMap(graph: Graph<NodeAttributes, EdgeAttributes, Attributes>): Map<string, string> {
  // Count occurrences of each type
  const typeCounts = new Map<string, number>();
  graph.forEachNode((_, attributes) => {
    const nodeType = (attributes.nodeType as string) || 'Unknown';
    typeCounts.set(nodeType, (typeCounts.get(nodeType) || 0) + 1);
  });

  // Sort types by count (descending)
  const sortedTypes = Array.from(typeCounts.entries()).sort((a, b) => b[1] - a[1]);

  // Assign colors
  const colorMap = new Map<string, string>();
  let dynamicColorIndex = 0;

  for (const [nodeType] of sortedTypes) {
    // Check if predefined color exists
    if (PREDEFINED_TYPE_COLORS[nodeType]) {
      colorMap.set(nodeType, PREDEFINED_TYPE_COLORS[nodeType]);
    } else if (dynamicColorIndex < DYNAMIC_COLOR_PALETTE.length) {
      // Assign from dynamic palette (up to 50 types)
      colorMap.set(nodeType, DYNAMIC_COLOR_PALETTE[dynamicColorIndex]);
      dynamicColorIndex++;
    } else {
      // Beyond 50 types, use default color
      colorMap.set(nodeType, DEFAULT_NODE_COLOR);
    }
  }

  return colorMap;
}

/**
 * Apply knowledge graph styling to nodes and edges
 * - Sets node colors based on nodeType attribute with dynamic color assignment
 * - Analyzes parallel edges and sets edge type (straight/curved)
 * - Calculates curvature for parallel edges
 */
export async function applyKnowledgeGraphStyling(
  graph: Graph<NodeAttributes, EdgeAttributes, Attributes>,
): Promise<void> {
  // Generate dynamic color mapping for all node types
  const typeColorMap = generateTypeColorMap(graph);

  // Apply node styling
  graph.forEachNode((node, attributes) => {
    const nodeType = (attributes.nodeType as string) || 'Unknown';
    const assignedColor = typeColorMap.get(nodeType) || DEFAULT_NODE_COLOR;

    graph.setNodeAttribute(node, 'color', attributes.color || assignedColor);
    graph.setNodeAttribute(node, 'size', attributes.size || DEFAULT_NODE_SIZE);

    // Store original label for restoration when hovering/clicking
    if (attributes.label && !attributes.originalLabel) {
      graph.setNodeAttribute(node, 'originalLabel', attributes.label);
    }
  });

  // Index parallel edges (CRITICAL: must be done before edge styling)

  const indexParallelEdgesIndex = await import('@sigma/edge-curve').then(mod => mod.indexParallelEdgesIndex);
  indexParallelEdgesIndex(graph);

  // Apply edge styling based on parallel edge analysis
  graph.forEachEdge((edge, attributes) => {
    const parallelIndex = attributes.parallelIndex as number | undefined;
    const parallelMinIndex = attributes.parallelMinIndex as number | undefined;
    const parallelMaxIndex = attributes.parallelMaxIndex as number | undefined;
    const isUndirected = attributes.undirected === true;

    let edgeType: string;
    let curvature = 0;

    // Determine if edge has parallel edges
    const hasParallelEdges = parallelIndex !== undefined && parallelIndex > 0;
    const isBidirectional = parallelMinIndex !== undefined;

    if (isUndirected) {
      // Undirected edges
      if (hasParallelEdges || isBidirectional) {
        // Multiple undirected edges between same nodes
        edgeType = 'curvedUndirected';
        if (isBidirectional && parallelIndex !== 0) {
          curvature = getCurvature(parallelIndex ?? 0, parallelMaxIndex ?? 0);
        } else if (hasParallelEdges) {
          curvature = getCurvature(parallelIndex, parallelMaxIndex ?? 0);
        }
      } else {
        // Single undirected edge
        edgeType = 'rectangle';
      }
    } else {
      // Directed edges
      if (isBidirectional) {
        // Bidirectional edges - first edge in each direction stays straight, rest curve
        if (parallelIndex !== 0) {
          edgeType = 'curved';
          curvature = getCurvature(parallelIndex ?? 0, parallelMaxIndex ?? 0);
        } else {
          edgeType = 'straight';
        }
      } else if (hasParallelEdges) {
        // Same-direction parallel edges - first edge stays straight, rest curve
        edgeType = 'curved';
        curvature = getCurvature(parallelIndex, parallelMaxIndex ?? 0);
      } else {
        // Single directed edge
        edgeType = 'straight';
      }
    }

    // biome-ignore lint/suspicious/noExplicitAny: Dynamic attribute setting requires any type
    graph.setEdgeAttribute(edge, 'type', edgeType as any);
    graph.setEdgeAttribute(edge, 'curvature', curvature);

    // Set default color if not present
    if (!attributes.color) {
      graph.setEdgeAttribute(edge, 'color', DEFAULT_EDGE_COLOR);
    }
  });
}

/**
 * Extract node types from the graph for legend generation
 */
export function extractNodeTypes<
  NodeAttributes extends Attributes = Attributes,
  EdgeAttributes extends Attributes = Attributes,
  GraphAttributes extends Attributes = Attributes,
>(graph: Graph<NodeAttributes, EdgeAttributes, GraphAttributes>): Map<string, number> {
  const typeCounts = new Map<string, number>();

  graph.forEachNode((_, attributes) => {
    const nodeType = (attributes.nodeType as string) || 'Unknown';
    typeCounts.set(nodeType, (typeCounts.get(nodeType) || 0) + 1);
  });

  return typeCounts;
}

/**
 * Faded color for inactive nodes when property is applied
 */
export const FADED_NODE_COLOR = '#E2E2E2';

/**
 * Apply smart border treatment based on active color and size properties
 * Only affects nodes that don't have either property applied
 * Preserves original colors from typeColorMap
 *
 * @param graph - The graph instance
 * @param activeColorNodeTypes - Set of nodeTypes with color property applied
 * @param activeSizeNodeTypes - Set of nodeTypes with size property applied
 * @param typeColorMap - Map of nodeType to their original colors (from generateTypeColorMap)
 */
export function applySmartBorderTreatment(
  graph: Graph<NodeAttributes, EdgeAttributes, Attributes>,
  activeColorNodeTypes: Set<string>,
  activeSizeNodeTypes: Set<string>,
  typeColorMap: Map<string, string>,
): void {
  // Combine both active property sets
  const allActiveNodeTypes = new Set([...activeColorNodeTypes, ...activeSizeNodeTypes]);

  // If no properties applied, restore all to normal
  if (allActiveNodeTypes.size === 0) {
    graph.updateEachNodeAttributes((_node, attr) => {
      const nodeType = (attr.nodeType as string) || 'Unknown';
      attr.type = 'circle';
      attr.borderColor = undefined;
      // Restore original color from typeColorMap
      attr.color = typeColorMap.get(nodeType) || DEFAULT_NODE_COLOR;
      return attr;
    });
    return;
  }

  // Apply border treatment to inactive nodeTypes
  graph.updateEachNodeAttributes((_node, attr) => {
    const nodeType = (attr.nodeType as string) || 'Unknown';

    if (allActiveNodeTypes.has(nodeType)) {
      // This nodeType has a property applied - use normal rendering
      attr.type = 'circle';
      attr.borderColor = undefined;
      // Keep existing color (set by color analysis) or restore from map
      if (!attr.color || attr.color === FADED_NODE_COLOR) {
        attr.color = typeColorMap.get(nodeType) || DEFAULT_NODE_COLOR;
      }
    } else {
      // This nodeType doesn't have any property - apply border treatment
      attr.type = 'border';
      attr.color = FADED_NODE_COLOR;
      // Use original color as border
      const originalColor = typeColorMap.get(nodeType) || DEFAULT_NODE_COLOR;
      attr.borderColor = originalColor;
    }

    return attr;
  });
}

/**
 * @deprecated Use applySmartBorderTreatment instead
 * Kept for backward compatibility
 */
export function applyInactiveNodeBorderTreatment(
  graph: Graph<NodeAttributes, EdgeAttributes, Attributes>,
  activePropertyNodeType: string | null,
  typeColorMap: Map<string, string>,
): void {
  const activeSet = activePropertyNodeType ? new Set([activePropertyNodeType]) : new Set<string>();
  applySmartBorderTreatment(graph, activeSet, new Set(), typeColorMap);
}
