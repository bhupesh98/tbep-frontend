'use client';

import { useSigma } from '@react-sigma/core';
import type { Quadtree } from 'd3-quadtree';
import type AbstractGraph from 'graphology-types';
import type { Attributes } from 'graphology-types';
import { useImperativeHandle, useRef, useState } from 'react';
import { createBoxSelectionHandlers } from '../createBoxSelectionHandlers';
import { createLassoSelectionHandlers } from '../createLassoSelectionHandlers';
import { buildSpatialIndex } from '../spatial-index';
import type {
  BoxSelectionState,
  LassoSelectionState,
  QuadtreeNodeData,
  SelectionEventHandlers,
  SelectionPluginConfig,
  SelectionPluginHandle,
} from '../types';

/**
 * SelectionPlugin - Orchestrates box and lasso selection for Sigma.js graphs
 * Provides imperative API for activating different selection modes
 */
export function SelectionPlugin(props: SelectionPluginConfig & { ref?: React.Ref<SelectionPluginHandle> }) {
  const { selectedNodeType = 'border', onSelectionChange, shouldIncludeNode, autoRegisterEvents = true, ref } = props;

  const sigma = useSigma<Attributes, Attributes>();
  const [activeMode, setActiveMode] = useState<'box' | 'lasso' | null>(null);
  const [_currentSelection, setCurrentSelection] = useState<string[]>([]);

  // Shared spatial index for both selection modes
  const spatialIndexRef = useRef<Quadtree<QuadtreeNodeData> | null>(null);
  const spatialIndexInitializedRef = useRef(false);

  // State refs for box selection
  const boxStateRef = useRef<BoxSelectionState>({
    isSelecting: false,
    selectionBox: null,
    selectedNodeIds: [],
    canvas: null,
    startPosition: null,
  });

  // State refs for lasso selection
  const lassoStateRef = useRef<LassoSelectionState>({
    isSelecting: false,
    lassoPath: [],
    canvas: null,
    startPosition: null,
  });

  const config: Required<SelectionPluginConfig> = {
    selectedNodeType,
    onSelectionChange,
    shouldIncludeNode: shouldIncludeNode || (() => true),
    autoRegisterEvents,
  };

  // Initialize shared spatial index once
  if (!spatialIndexInitializedRef.current) {
    const graph = sigma.getGraph();
    spatialIndexRef.current = buildSpatialIndex(graph);
    spatialIndexInitializedRef.current = true;

    // Listen for afterRender to rebuild spatial index when graph changes
    sigma.on('afterRender', () => {
      spatialIndexRef.current = buildSpatialIndex(graph);
    });
  }

  // Apply visual updates to selected nodes
  const applySelectionVisuals = (nodeIds: string[]) => {
    const graph = sigma.getGraph() as AbstractGraph<Attributes, Attributes>;

    // Clear previous selection visuals
    graph.updateEachNodeAttributes((_node, attrs) => {
      if (attrs.selectedByPlugin) {
        return {
          ...attrs,
          type: attrs.originalPluginType || 'circle',
          highlighted: false,
          selectedByPlugin: undefined,
          originalPluginType: undefined,
        };
      }
      return attrs;
    });

    // Apply new selection visuals
    for (const nodeId of nodeIds) {
      if (!graph.hasNode(nodeId)) continue;

      graph.updateNodeAttributes(nodeId, attrs => ({
        ...attrs,
        originalPluginType: attrs.type || 'circle',
        type: selectedNodeType,
        highlighted: true,
        selectedByPlugin: true,
      }));
    }

    sigma.refresh();
    setCurrentSelection(nodeIds);
  };

  // Expose imperative methods via ref
  useImperativeHandle(ref, () => ({
    activateBoxSelection: () => {
      setActiveMode('box');
      applySelectionVisuals([]);
      onSelectionChange([]);
    },

    activateLassoSelection: () => {
      setActiveMode('lasso');
      applySelectionVisuals([]);
      onSelectionChange([]);
    },

    clearSelection: () => {
      applySelectionVisuals([]);
      onSelectionChange([]);
    },

    deactivate: () => {
      setActiveMode(null);
      applySelectionVisuals([]);
      onSelectionChange([]);
    },

    isActive: () => {
      return activeMode !== null;
    },

    getEventHandlers: (): SelectionEventHandlers | null => {
      if (activeMode === null) return null;

      // Wrap onSelectionChange to apply visuals
      const wrappedConfig = {
        ...config,
        onSelectionChange: (nodeIds: string[]) => {
          applySelectionVisuals(nodeIds);
          config.onSelectionChange(nodeIds);
        },
      };

      if (activeMode === 'box') {
        return createBoxSelectionHandlers(sigma, wrappedConfig, boxStateRef.current, spatialIndexRef);
      }

      if (activeMode === 'lasso') {
        return createLassoSelectionHandlers(sigma, wrappedConfig, lassoStateRef.current, spatialIndexRef);
      }

      return null;
    },
  }));

  // Note: When autoRegisterEvents is false, components don't render
  // Event handlers are accessed via getEventHandlers() method
  return null;
}
