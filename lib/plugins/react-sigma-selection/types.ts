import type { Attributes } from 'graphology-types';
import type { MouseCoords } from 'sigma/types';

/**
 * Configuration for the SelectionPlugin
 */
export interface SelectionPluginConfig {
  /**
   * Node type to apply to selected nodes
   * @default 'border'
   */
  selectedNodeType?: string;

  /**
   * Callback invoked when selection changes
   * @param nodeIds - Array of selected node IDs
   */
  onSelectionChange: (nodeIds: string[]) => void;

  /**
   * Optional filter function to determine if a node should be included in selection
   * @param nodeId - Node identifier
   * @param attributes - Node attributes
   * @returns true if node should be selectable
   */
  shouldIncludeNode?: (nodeId: string, attributes: Attributes) => boolean;

  /**
   * Whether to automatically register event handlers
   * If false, use getEventHandlers() to manually integrate with existing event system
   * @default true
   */
  autoRegisterEvents?: boolean;
}

/**
 * Selection event handlers that can be integrated into existing event system
 */
export interface SelectionEventHandlers {
  mousedown: (e: MouseCoords) => void;
  mousemovebody: (e: MouseCoords) => void;
  mouseup: () => void;
}

/**
 * Imperative handle for the SelectionPlugin component
 */
export interface SelectionPluginHandle {
  /**
   * Activate box selection mode
   */
  activateBoxSelection: () => void;

  /**
   * Activate lasso selection mode
   */
  activateLassoSelection: () => void;

  /**
   * Clear current selection
   */
  clearSelection: () => void;

  /**
   * Deactivate selection mode (go back to normal/individual mode)
   */
  deactivate: () => void;

  /**
   * Check if selection is currently active
   * @returns true if selection mode is active
   */
  isActive: () => boolean;

  /**
   * Get event handlers for manual registration (when autoRegisterEvents is false)
   * @returns Object with mousedown, mousemovebody, and mouseup handlers or null if not active
   */
  getEventHandlers: () => SelectionEventHandlers | null;
}

/**
 * Selection box coordinates in graph space
 */
export interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

/**
 * Lasso path with points in graph space
 */
export interface LassoPath {
  points: Array<{ x: number; y: number }>;
  closed: boolean;
}

/**
 * Point in 2D space
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Quadtree node "data" structure
 */
export interface QuadtreeNodeData {
  id: string;
  x: number;
  y: number;
}

/**
 * Shared state for box selection
 */
export interface BoxSelectionState {
  isSelecting: boolean;
  selectionBox: SelectionBox | null;
  selectedNodeIds: string[];
  canvas: HTMLCanvasElement | null;
  startPosition: Point | null;
}

/**
 * Shared state for lasso selection
 */
export interface LassoSelectionState {
  isSelecting: boolean;
  lassoPath: Point[];
  canvas: HTMLCanvasElement | null;
  startPosition: Point | null;
}
