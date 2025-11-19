'use client';

import type { Quadtree } from 'd3-quadtree';
import type { Attributes } from 'graphology-types';
import type Sigma from 'sigma';
import type { MouseCoords } from 'sigma/types';
import throttle from 'throttleit';
import { clearCanvas, drawSelectionBox, initializeCanvas } from './canvas-utils';
import { queryNodesInBox } from './spatial-index';
import type {
  BoxSelectionState,
  QuadtreeNodeData,
  SelectionBox,
  SelectionEventHandlers,
  SelectionPluginConfig,
} from './types';

/**
 * Create box selection event handlers
 * @param sigma - Sigma instance
 * @param config - Selection plugin configuration
 * @param state - Mutable state object
 * @param Object.assign - State update function
 * @param spatialIndexRef - Shared spatial index ref
 * @returns Event handlers object
 */
export function createBoxSelectionHandlers(
  sigma: Sigma<Attributes, Attributes>,
  config: Required<SelectionPluginConfig>,
  state: BoxSelectionState,
  spatialIndexRef: React.RefObject<Quadtree<QuadtreeNodeData> | null>,
): SelectionEventHandlers {
  // Initialize canvas if needed
  if (!state.canvas) {
    state.canvas = initializeCanvas(sigma);
  }

  // Throttled selection update
  const updateSelection = throttle((box: SelectionBox) => {
    if (!spatialIndexRef.current) return;

    const graph = sigma.getGraph();
    const nodeIds = queryNodesInBox(spatialIndexRef.current, graph, box, config.shouldIncludeNode);

    Object.assign(state, { selectedNodeIds: nodeIds });

    // Draw selection box
    if (state.canvas) {
      const ctx = state.canvas.getContext('2d');
      if (ctx) {
        drawSelectionBox(ctx, box, sigma);
      }
    }
  }, 50);

  return {
    mousedown: (e: MouseCoords) => {
      e.preventSigmaDefault();
      e.original.preventDefault();

      const mousePosition = sigma.viewportToGraph(e);

      state.startPosition = mousePosition;
      Object.assign(state, {
        isSelecting: true,
        selectionBox: {
          startX: mousePosition.x,
          startY: mousePosition.y,
          endX: mousePosition.x,
          endY: mousePosition.y,
        },
      });

      if (state.canvas) {
        state.canvas.style.cursor = 'crosshair';
      }
    },

    mousemovebody: (e: MouseCoords) => {
      if (!state.isSelecting || !state.selectionBox) return;

      e.preventSigmaDefault();

      const mousePosition = sigma.viewportToGraph(e);

      const updatedBox: SelectionBox = {
        ...state.selectionBox,
        endX: mousePosition.x,
        endY: mousePosition.y,
      };

      Object.assign(state, { selectionBox: updatedBox });
      updateSelection(updatedBox);
    },

    mouseup: () => {
      if (!state.isSelecting) return;

      Object.assign(state, { isSelecting: false });

      // Check if this was a click (not a drag)
      if (state.startPosition && state.selectionBox) {
        const dx = Math.abs(state.selectionBox.endX - state.selectionBox.startX);
        const dy = Math.abs(state.selectionBox.endY - state.selectionBox.startY);
        const dragDistance = Math.sqrt(dx * dx + dy * dy);

        if (dragDistance < 5) {
          // This was a click, not a drag - clear selection
          if (state.canvas) {
            clearCanvas(state.canvas);
            state.canvas.style.cursor = 'default';
          }
          config.onSelectionChange([]);
          Object.assign(state, {
            selectionBox: null,
            startPosition: null,
          });
          return;
        }
      }

      // Finalize selection - notify callback without clearing state
      if (state.selectedNodeIds.length > 0) {
        config.onSelectionChange(state.selectedNodeIds);
      }

      // clear canvas overlay
      if (state.canvas) {
        clearCanvas(state.canvas);
        state.canvas.style.cursor = 'default';
      }

      // Clear drawing state but keep selectedNodeIds for persistent selection
      Object.assign(state, {
        selectionBox: null,
        startPosition: null,
      });
    },
  };
}
