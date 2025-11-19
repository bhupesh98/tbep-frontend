import type { Point, SelectionBox } from './types';

/**
 * Test if a point is inside a polygon using ray-casting algorithm
 * @param nodeX - X coordinate of the point
 * @param nodeY - Y coordinate of the point
 * @param polygon - Array of polygon vertices
 * @returns true if point is inside polygon
 */
export function isNodeInPolygon(nodeX: number, nodeY: number, polygon: Point[]): boolean {
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect = yi > nodeY !== yj > nodeY && nodeX < ((xj - xi) * (nodeY - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Test if a point is inside a box (with optional margin for node size)
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param box - Selection box
 * @param margin - Optional margin to account for node size (default 0)
 * @returns true if point is inside box
 */
export function isPointInBox(x: number, y: number, box: SelectionBox, margin = 0): boolean {
  const minX = Math.min(box.startX, box.endX) - margin;
  const maxX = Math.max(box.startX, box.endX) + margin;
  const minY = Math.min(box.startY, box.endY) - margin;
  const maxY = Math.max(box.startY, box.endY) + margin;

  return x >= minX && x <= maxX && y >= minY && y <= maxY;
}

/**
 * Close a polygon by connecting last point to first point
 * @param points - Array of points
 * @returns Closed polygon
 */
export function closePolygon(points: Point[]): Point[] {
  if (points.length < 2) return points;
  if (points[0].x === points[points.length - 1].x && points[0].y === points[points.length - 1].y) {
    return points;
  }
  return [...points, { x: points[0].x, y: points[0].y }];
}

/**
 * Smooth a path using Catmull-Rom spline interpolation
 * @param points - Array of points to smooth
 * @param tension - Tension parameter (0 = straight lines, 0.5 = default)
 * @returns Smoothed path with interpolated points
 */
export function smoothLassoPath(points: Point[], tension = 0.5): Point[] {
  if (points.length < 3) return points;

  const smoothed: Point[] = [];
  const alpha = tension;

  // Add first point
  smoothed.push(points[0]);

  // Catmull-Rom interpolation
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    // Interpolate between p1 and p2
    const steps = 10;
    for (let t = 0; t <= steps; t++) {
      const tt = t / steps;
      const tt2 = tt * tt;
      const tt3 = tt2 * tt;

      const q0 = -alpha * tt3 + 2 * alpha * tt2 - alpha * tt;
      const q1 = (2 - alpha) * tt3 + (alpha - 3) * tt2 + 1;
      const q2 = (alpha - 2) * tt3 + (3 - 2 * alpha) * tt2 + alpha * tt;
      const q3 = alpha * tt3 - alpha * tt2;

      const x = q0 * p0.x + q1 * p1.x + q2 * p2.x + q3 * p3.x;
      const y = q0 * p0.y + q1 * p1.y + q2 * p2.y + q3 * p3.y;

      smoothed.push({ x, y });
    }
  }

  // Add last point
  smoothed.push(points[points.length - 1]);

  return smoothed;
}
