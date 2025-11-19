/**
 * @module react-sigma-selection
 * Standalone selection plugin for @react-sigma/core
 * Provides box and lasso selection capabilities for Sigma.js graphs
 */

export { SelectionPlugin } from './components/SelectionPlugin';
export { createBoxSelectionHandlers } from './createBoxSelectionHandlers';
export { createLassoSelectionHandlers } from './createLassoSelectionHandlers';
export type {
  LassoPath,
  Point,
  SelectionBox,
  SelectionEventHandlers,
  SelectionPluginConfig,
  SelectionPluginHandle,
} from './types';
