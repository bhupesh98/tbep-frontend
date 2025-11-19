import { type Quadtree, quadtree } from 'd3-quadtree';
import type AbstractGraph from 'graphology-types';
import type { Attributes } from 'graphology-types';
import { isNodeInPolygon, isPointInBox } from './geometry-utils';
import type { Point, QuadtreeNodeData, SelectionBox } from './types';

/**
 * Quadtree node data structure
 */

/**
 * Build spatial index (quadtree) from graph nodes
 * Builds index once for all nodes, hidden nodes filtered during query
 * @param graph - Graphology graph instance
 * @returns Quadtree spatial index
 */
export function buildSpatialIndex(graph: AbstractGraph<Attributes, Attributes>): Quadtree<QuadtreeNodeData> {
  const nodes: QuadtreeNodeData[] = [];

  graph.forEachNode((nodeId, attributes) => {
    const x = attributes.x as number | undefined;
    const y = attributes.y as number | undefined;

    if (x !== undefined && y !== undefined) {
      nodes.push({ id: nodeId, x, y });
    }
  });

  return quadtree<QuadtreeNodeData>()
    .x(d => d.x)
    .y(d => d.y)
    .addAll(nodes);
}

/**
 * Query nodes within a box selection
 * @param quadtreeIndex - Spatial index
 * @param graph - Graphology graph
 * @param box - Selection box
 * @param shouldIncludeNode - Optional filter function
 * @returns Array of selected node IDs
 */
export function queryNodesInBox(
  quadtreeIndex: Quadtree<QuadtreeNodeData>,
  graph: AbstractGraph<Attributes, Attributes>,
  box: SelectionBox,
  shouldIncludeNode?: (nodeId: string, attributes: Attributes) => boolean,
): string[] {
  const selectedNodes: string[] = [];

  const minX = Math.min(box.startX, box.endX);
  const maxX = Math.max(box.startX, box.endX);
  const minY = Math.min(box.startY, box.endY);
  const maxY = Math.max(box.startY, box.endY);

  // Query quadtree for nodes in region
  quadtreeIndex.visit((node, x1, y1, x2, y2) => {
    // Check if this quadrant intersects with selection box
    if (x1 > maxX || x2 < minX || y1 > maxY || y2 < minY) {
      return true; // Skip this branch
    }

    // Check if this is a leaf node (length is undefined for leaves, 4 for internal nodes)
    if (!node.length) {
      // Leaf node - iterate through the linked list of data points
      type LeafNode = { data: QuadtreeNodeData; next?: LeafNode };
      let leaf: LeafNode | undefined = node as LeafNode;

      while (leaf) {
        const quadNode = leaf.data;
        const nodeId = quadNode.id;

        // Skip if nodeId is invalid or node doesn't exist in graph
        if (nodeId && graph.hasNode(nodeId)) {
          const attributes = graph.getNodeAttributes(nodeId);

          // Check if node should be included
          const isHidden = attributes.hidden === true;
          const passesFilter = shouldIncludeNode ? shouldIncludeNode(nodeId, attributes) : true;

          // Use a small margin (5 units) to make selection more forgiving
          if (!isHidden && passesFilter && isPointInBox(quadNode.x, quadNode.y, box, 5)) {
            selectedNodes.push(nodeId);
          }
        }

        // Move to next node in the linked list
        leaf = leaf.next;
      }
    }

    return false; // Continue visiting
  });

  return selectedNodes;
}

/**
 * Query nodes within a lasso polygon
 * @param quadtreeIndex - Spatial index
 * @param graph - Graphology graph
 * @param polygon - Lasso polygon points
 * @param shouldIncludeNode - Optional filter function
 * @returns Array of selected node IDs
 */
export function queryNodesInPolygon(
  quadtreeIndex: Quadtree<QuadtreeNodeData>,
  graph: AbstractGraph<Attributes, Attributes>,
  polygon: Point[],
  shouldIncludeNode?: (nodeId: string, attributes: Attributes) => boolean,
): string[] {
  const selectedNodes: string[] = [];

  // Get bounding box of polygon for broad-phase query
  const minX = Math.min(...polygon.map(p => p.x));
  const maxX = Math.max(...polygon.map(p => p.x));
  const minY = Math.min(...polygon.map(p => p.y));
  const maxY = Math.max(...polygon.map(p => p.y));

  // Query quadtree for nodes in bounding box
  quadtreeIndex.visit((node, x1, y1, x2, y2) => {
    // Check if this quadrant intersects with bounding box
    if (x1 > maxX || x2 < minX || y1 > maxY || y2 < minY) {
      return true; // Skip this branch
    }

    // Check if this is a leaf node (length is undefined for leaves, 4 for internal nodes)
    if (!node.length) {
      // Leaf node - iterate through the linked list of data points
      type LeafNode = { data: QuadtreeNodeData; next?: LeafNode };
      let leaf: LeafNode | undefined = node as LeafNode;

      while (leaf) {
        const quadNode = leaf.data;
        const nodeId = quadNode.id;

        // Skip if nodeId is invalid or node doesn't exist in graph
        if (nodeId && graph.hasNode(nodeId)) {
          const attributes = graph.getNodeAttributes(nodeId);

          // Check if node should be included
          const isHidden = attributes.hidden === true;
          const passesFilter = shouldIncludeNode ? shouldIncludeNode(nodeId, attributes) : true;

          // Precise polygon containment test
          if (!isHidden && passesFilter && isNodeInPolygon(quadNode.x, quadNode.y, polygon)) {
            selectedNodes.push(nodeId);
          }
        }

        // Move to next node in the linked list
        leaf = leaf.next;
      }
    }

    return false; // Continue visiting
  });

  return selectedNodes;
}
