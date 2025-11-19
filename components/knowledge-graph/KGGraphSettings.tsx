'use client';

import { useSetSettings, useSigma } from '@react-sigma/core';
import { useEffect, useState } from 'react';
import { FADED_EDGE_COLOR, HIGHLIGHTED_EDGE_COLOR } from '@/lib/data';
import { applySmartBorderTreatment, generateTypeColorMap } from '@/lib/graph';
import { useKGStore } from '@/lib/hooks';
import type { EdgeAttributes, NodeAttributes } from '@/lib/interface';

/**
 * KnowledgeGraphSettings
 * Simplified settings for knowledge graph visualization
 * - Assigns x/y positions to nodes via nodeReducer
 * - Handles node/edge highlighting on hover
 */
export function KGGraphSettings({
  clickedNodesRef,
  highlightedNodesRef,
}: {
  clickedNodesRef?: React.RefObject<Set<string>>;
  highlightedNodesRef?: React.RefObject<Set<string>>;
}) {
  const sigma = useSigma<NodeAttributes, EdgeAttributes>();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const setSettings = useSetSettings<NodeAttributes, EdgeAttributes>();
  const highlightNeighborNodes = useKGStore(state => state.highlightNeighborNodes);
  const graph = sigma.getGraph();

  // Track hovered node
  useEffect(() => {
    sigma.on('enterNode', e => setHoveredNode(e.node));
    sigma.on('leaveNode', () => setHoveredNode(null));
  }, [sigma]);

  // Track active property nodeTypes for label hiding
  const activePropertyNodeTypes = useKGStore(state => state.activePropertyNodeTypes);

  useEffect(() => {
    if (!graph || graph.order === 0) return;
    // Generate type color map for consistent colors
    const typeColorMap = generateTypeColorMap(graph);

    // Apply smart border treatment based on both color and size properties
    applySmartBorderTreatment(graph, activePropertyNodeTypes.color, activePropertyNodeTypes.size, typeColorMap);
  }, [graph, activePropertyNodeTypes]);

  // Node and edge reducers for positioning and highlighting
  // biome-ignore lint/correctness/useExhaustiveDependencies: not needed
  useEffect(() => {
    setSettings({
      nodeReducer(node, data) {
        // Assign random x/y positions if not set (required for Sigma rendering)
        if (!data.x) data.x = Math.random() * 1000;
        if (!data.y) data.y = Math.random() * 1000;

        const isHoveredOrClicked = node === hoveredNode || clickedNodesRef?.current.has(node);
        const isSearched = highlightedNodesRef?.current.has(node);
        const nodeType = (data.nodeType as string) || '';

        // Store original label reference
        const originalLabel = data.originalLabel || data.label;
        if (!data.originalLabel) {
          data.originalLabel = originalLabel; // Store once for future reference
        }

        // Truncate long labels to prevent overlap (max 25 characters)
        const maxLabelLength = 25;
        const truncateLabel = (label: string | undefined) => {
          if (!label) return label;
          return label.length > maxLabelLength ? `${label.substring(0, maxLabelLength)}...` : label;
        };

        // Combine color and size Sets to get all active node types
        const allActiveNodeTypes = new Set([...activePropertyNodeTypes.color, ...activePropertyNodeTypes.size]);

        // Hide labels for non-active node types when a property is applied (unless hovered/clicked/searched)
        // Note: Selection plugin handles its own visual updates via graph.updateNodeAttributes
        if (allActiveNodeTypes.size > 0 && !isHoveredOrClicked && !isSearched && !data.selectedByPlugin) {
          // If this nodeType doesn't have any active property, hide its label
          if (!allActiveNodeTypes.has(nodeType)) {
            data.label = '';
          }
        }

        // Highlight logic
        if (hoveredNode) {
          if (isHoveredOrClicked) {
            // Clicked nodes - keep highlighted, show full label
            data.highlighted = true;
            data.label = originalLabel;
            data.forceLabel = true; // Force label to show
          } else if (!data.hidden && highlightNeighborNodes && graph.neighbors(hoveredNode).includes(node)) {
            // Neighbors of hovered node - set to border type, show truncated label
            data.type = 'border';
            data.highlighted = true;
            data.label = truncateLabel(originalLabel);
            data.forceLabel = true; // Force label to show
          } else {
            // Fade other nodes
            data.color = '#E2E2E2';
            data.highlighted = false;
          }
        } else if (isSearched && allActiveNodeTypes.size > 0) {
          // If node is searched but not currently hovered, restore its label (full label, no truncation)
          data.label = originalLabel;
          data.forceLabel = true;
        }

        // Apply truncation to all visible labels (unless force label is set for hover/click/search)
        if (data.label && !data.forceLabel && !isSearched) {
          data.label = truncateLabel(data.label);
        }

        return data;
      },
      edgeReducer(edge, data) {
        // Highlight edges connected to hovered node
        if (hoveredNode) {
          if (graph.extremities(edge).includes(hoveredNode)) {
            data.color = HIGHLIGHTED_EDGE_COLOR;
            data.zIndex = 100;
          } else {
            data.color = FADED_EDGE_COLOR;
          }
        }
        return data;
      },
    });
  }, [hoveredNode, setSettings, clickedNodesRef, activePropertyNodeTypes]);

  return null;
}
