import type { Attributes } from 'graphology-types';
import type Sigma from 'sigma';
import { smoothLassoPath } from './geometry-utils';
import type { Point, SelectionBox } from './types';

/**
 * Initialize and get the mouse canvas layer from Sigma
 * @param sigma - Sigma instance
 * @returns Mouse canvas element
 */
export function initializeCanvas(sigma: Sigma<Attributes, Attributes>): HTMLCanvasElement {
  return sigma.getCanvases().mouse;
}

/**
 * Clear the canvas using requestAnimationFrame for Chromium compatibility
 * @param canvas - Canvas element to clear
 */
export function clearCanvas(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  requestAnimationFrame(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });
}

/**
 * Draw selection box on canvas
 * @param ctx - Canvas rendering context
 * @param box - Selection box in graph coordinates
 * @param sigma - Sigma instance for coordinate conversion
 */
export function drawSelectionBox(
  ctx: CanvasRenderingContext2D,
  box: SelectionBox,
  sigma: Sigma<Attributes, Attributes>,
): void {
  // Convert graph coordinates to viewport coordinates
  const start = sigma.graphToViewport({ x: box.startX, y: box.startY });
  const end = sigma.graphToViewport({ x: box.endX, y: box.endY });

  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  // Clear previous drawing
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Draw selection box
  ctx.fillStyle = 'rgba(229, 229, 229, 0.5)';
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
  ctx.lineWidth = 2;
  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x, y, width, height);
}

/**
 * Draw lasso path on canvas
 * @param ctx - Canvas rendering context
 * @param points - Lasso path points in graph coordinates
 * @param sigma - Sigma instance for coordinate conversion
 * @param smooth - Whether to apply path smoothing
 */
export function drawLassoPath(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  sigma: Sigma<Attributes, Attributes>,
  smooth = true,
): void {
  if (points.length < 2) return;

  // Apply smoothing if requested
  const pathPoints = smooth ? smoothLassoPath(points, 0.5) : points;

  // Convert graph coordinates to viewport coordinates
  const viewportPoints = pathPoints.map(p => sigma.graphToViewport({ x: p.x, y: p.y }));

  // Clear previous drawing
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Draw lasso path
  ctx.beginPath();
  ctx.moveTo(viewportPoints[0].x, viewportPoints[0].y);

  for (let i = 1; i < viewportPoints.length; i++) {
    ctx.lineTo(viewportPoints[i].x, viewportPoints[i].y);
  }

  // Close the path
  ctx.closePath();

  // Style the path
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
  ctx.lineWidth = 2;
  ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';

  ctx.fill();
  ctx.stroke();
}
