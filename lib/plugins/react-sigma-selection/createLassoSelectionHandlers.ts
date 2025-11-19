'use client';

import type { Quadtree } from 'd3-quadtree';
import type { Attributes } from 'graphology-types';
import type Sigma from 'sigma';
import type { MouseCoords } from 'sigma/types';
import throttle from 'throttleit';
import { clearCanvas, drawLassoPath, initializeCanvas } from './canvas-utils';
import { closePolygon } from './geometry-utils';
import { queryNodesInPolygon } from './spatial-index';
import type {
  LassoSelectionState,
  Point,
  QuadtreeNodeData,
  SelectionEventHandlers,
  SelectionPluginConfig,
} from './types';

/**
 * Create lasso selection event handlers
 * @param sigma - Sigma instance
 * @param config - Selection plugin configuration
 * @param state - Mutable state object
 * @param Object.assign - State update function
 * @param spatialIndexRef - Shared spatial index ref
 * @returns Event handlers object
 */
export function createLassoSelectionHandlers(
  sigma: Sigma<Attributes, Attributes>,
  config: Required<SelectionPluginConfig>,
  state: LassoSelectionState,
  spatialIndexRef: React.RefObject<Quadtree<QuadtreeNodeData> | null>,
): SelectionEventHandlers {
  // Initialize canvas if needed
  if (!state.canvas) {
    state.canvas = initializeCanvas(sigma);
  }

  // Throttled path drawing
  const updateLassoPath = throttle((path: Point[]) => {
    if (state.canvas && path.length > 1) {
      const ctx = state.canvas.getContext('2d');
      if (ctx) {
        drawLassoPath(ctx, path, sigma, true);
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
        lassoPath: [mousePosition],
      });

      if (state.canvas) {
        state.canvas.style.cursor = 'crosshair';
      }
    },

    mousemovebody: (e: MouseCoords) => {
      if (!state.isSelecting) return;

      e.preventSigmaDefault();

      const mousePosition = sigma.viewportToGraph(e);

      const newPath = [...state.lassoPath, mousePosition];
      Object.assign(state, { lassoPath: newPath });
      updateLassoPath(newPath);
    },

    mouseup: () => {
      if (!state.isSelecting) return;

      Object.assign(state, { isSelecting: false });

      // Check if this was a click (not a drag)
      if (state.startPosition && state.lassoPath.length > 0) {
        const lastPoint = state.lassoPath[state.lassoPath.length - 1];
        const dx = Math.abs(lastPoint.x - state.startPosition.x);
        const dy = Math.abs(lastPoint.y - state.startPosition.y);
        const dragDistance = Math.sqrt(dx * dx + dy * dy);

        if (dragDistance < 5) {
          // This was a click, not a drag - clear selection
          if (state.canvas) {
            clearCanvas(state.canvas);
          }
          config.onSelectionChange([]);
          Object.assign(state, {
            lassoPath: [],
            startPosition: null,
          });
          if (state.canvas) {
            state.canvas.style.cursor = 'default';
          }
          return;
        }
      }

      // Finalize selection with closed polygon
      if (state.lassoPath.length > 2 && spatialIndexRef.current) {
        const closedPath = closePolygon(state.lassoPath);
        const graph = sigma.getGraph();
        const nodeIds = queryNodesInPolygon(spatialIndexRef.current, graph, closedPath, config.shouldIncludeNode);

        if (nodeIds.length > 0) {
          config.onSelectionChange(nodeIds);
        }
      }

      // clear canvas overlay
      if (state.canvas) {
        clearCanvas(state.canvas);
        state.canvas.style.cursor = 'default';
      }

      // Clear drawing state
      Object.assign(state, {
        lassoPath: [],
        startPosition: null,
      });
    },
  };
}
