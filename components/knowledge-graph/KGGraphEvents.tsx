'use client';

import { useCamera, useRegisterEvents, useSigma } from '@react-sigma/core';
import type Graph from 'graphology';
import { useEffect, useRef, useState } from 'react';
import { HIGHLIGHTED_EDGE_COLOR } from '@/lib/data';
import { FADED_NODE_COLOR, generateTypeColorMap } from '@/lib/graph/knowledge-graph-renderer';
import { useKGStore } from '@/lib/hooks';
import type { EdgeAttributes, NodeAttributes } from '@/lib/interface';
import { Trie } from '@/lib/trie';
import { KGPopupTable } from './KGPopupTable';

// Helper: Restore node to its appropriate type based on state
const restoreNodeType = (
  graph: Graph<NodeAttributes, EdgeAttributes>,
  node: string,
  highlightedNodes: Set<string>,
  clickedNodes: Set<string>,
  activePropertyNodeTypes: { color: Set<string>; size: Set<string> },
) => {
  graph.updateNodeAttributes(node, attr => {
    if (highlightedNodes.has(node) || clickedNodes.has(node)) {
      attr.type = 'border';
      attr.highlighted = highlightedNodes.has(node);
    } else {
      // Check if border treatment should be applied based on combined Sets
      const nodeType = (attr.nodeType as string) || 'Unknown';
      const allActiveNodeTypes = new Set([...activePropertyNodeTypes.color, ...activePropertyNodeTypes.size]);
      const shouldHaveBorderTreatment = allActiveNodeTypes.size > 0 && !allActiveNodeTypes.has(nodeType);

      if (shouldHaveBorderTreatment) {
        // Restore border treatment (faded with colored border)
        attr.type = 'border';
        attr.color = FADED_NODE_COLOR;
        // Get original color for border
        const typeColorMap = generateTypeColorMap(graph);
        attr.borderColor = typeColorMap.get(nodeType) || attr.borderColor;
      } else {
        // Normal circle rendering
        attr.type = 'circle';
      }
      attr.highlighted = false;
    }
    return attr;
  });
};

// Helper: Highlight edge and its extremity nodes
const highlightEdge = (graph: Graph<NodeAttributes, EdgeAttributes>, edgeId: string) => {
  graph.updateEdgeAttributes(edgeId, attr => {
    if (!attr.altColor) attr.altColor = attr.color;
    attr.color = HIGHLIGHTED_EDGE_COLOR;
    return attr;
  });
  for (const node of graph.extremities(edgeId)) {
    graph.updateNodeAttributes(node, attr => {
      attr.type = 'border';
      attr.highlighted = true;
      return attr;
    });
  }
};

// Helper: Clear edge highlighting and restore extremity nodes
const clearEdgeHighlight = (
  graph: Graph<NodeAttributes, EdgeAttributes>,
  edgeId: string,
  highlightedNodes: Set<string>,
  clickedNodes: Set<string>,
  activePropertyNodeTypes: { color: Set<string>; size: Set<string> },
) => {
  if (!graph.hasEdge(edgeId)) return;
  graph.updateEdgeAttributes(edgeId, attr => {
    attr.color = attr.altColor;
    return attr;
  });
  for (const node of graph.extremities(edgeId)) {
    restoreNodeType(graph, node, highlightedNodes, clickedNodes, activePropertyNodeTypes);
  }
};

/**
 * KnowledgeGraphEvents
 * Event handling for knowledge graph visualization
 */
export function KGGraphEvents({
  clickedNodesRef,
  highlightedNodesRef,
}: {
  clickedNodesRef: React.RefObject<Set<string>>;
  highlightedNodesRef: React.RefObject<Set<string>>;
}) {
  const sigma = useSigma<NodeAttributes, EdgeAttributes>();
  const registerEvents = useRegisterEvents();
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [clickedNode, setClickedNode] = useState<string | null>(null);
  const [clickedEdge, setClickedEdge] = useState<string | null>(null);
  const clickedEdgeRef = useRef<string | null>(null);
  const nodeSearchQuery = useKGStore(state => state.nodeSearchQuery);
  const activePropertyNodeTypes = useKGStore(state => state.activePropertyNodeTypes);
  const highlightNeighborNodes = useKGStore(state => state.highlightNeighborNodes);
  const trieRef = useRef(new Trie<{ key: string; value: string }>());

  const { gotoNode } = useCamera();

  // biome-ignore lint/correctness/useExhaustiveDependencies: not needed
  useEffect(() => {
    if (trieRef.current.size === 0) {
      if (graph.order === 0) return; // Graph not yet populated
      const nodeArr = graph.mapNodes((node, attributes) => ({
        key: attributes.label || node,
        value: node,
      })) as { key: string; value: string }[];
      if (!Array.isArray(nodeArr) || nodeArr.length === 0) return;
      trieRef.current = Trie.fromArray(nodeArr, 'key');
    }
    const prefix = nodeSearchQuery.split(/[\n,]/).pop()?.trim() || '';
    if (prefix.length === 0) return;
    const suggestions = trieRef.current.search(prefix).map(s => s.key);
    useKGStore.setState({ nodeSuggestions: suggestions });
  }, [nodeSearchQuery]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: nodeSearchQuery only needed
  useEffect(() => {
    const graph = sigma.getGraph();
    if (trieRef.current.size === 0) return;
    const nodeIds = new Set(
      nodeSearchQuery
        .toUpperCase()
        .split(/[\n,]/)
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(s => trieRef.current.get(s)?.value || s)
        .filter(s => graph.hasNode(s)),
    ) as Set<string>;

    const previousHighlightedNodes = highlightedNodesRef.current;
    for (const node of previousHighlightedNodes) {
      if (nodeIds.has(node) || !graph.hasNode(node)) continue;
      graph.removeNodeAttribute(node, 'highlighted');
      const allActiveNodeTypes = new Set([...activePropertyNodeTypes.color, ...activePropertyNodeTypes.size]);
      if (allActiveNodeTypes.size && !allActiveNodeTypes.has(graph.getNodeAttribute(node, 'nodeType') || 'Unknown')) {
        continue;
      }
      graph.setNodeAttribute(node, 'type', 'circle');
    }
    let count = 0;
    for (const node of nodeIds) {
      if (previousHighlightedNodes.has(node) || !graph.hasNode(node) || graph.getNodeAttribute(node, 'hidden') === true)
        continue;
      graph.setNodeAttribute(node, 'type', 'border');
      graph.setNodeAttribute(node, 'highlighted', true);
      if (++count === nodeIds.size) gotoNode(node, { duration: 100 });
    }
    highlightedNodesRef.current = nodeIds;
    // Force sigma refresh to update nodeReducer with new highlighted nodes
    sigma.refresh();
  }, [nodeSearchQuery, sigma]);

  // Register event handlers
  // biome-ignore lint/correctness/useExhaustiveDependencies: activePropertyNodeTypes read from store in callbacks
  useEffect(() => {
    const graph = sigma.getGraph();

    registerEvents({
      // Edge hover effects
      enterEdge: e => {
        highlightEdge(graph, e.edge);
      },
      leaveEdge: e => {
        if (clickedEdgeRef.current === e.edge) return;
        clearEdgeHighlight(
          graph,
          e.edge,
          highlightedNodesRef.current,
          clickedNodesRef.current,
          activePropertyNodeTypes,
        );
      },

      // Node drag and drop
      downNode: e => {
        setDraggedNode(e.node);
      },

      mousemovebody: e => {
        if (!draggedNode) return;

        // Update node position
        const pos = sigma.viewportToGraph(e);
        graph.setNodeAttribute(draggedNode, 'x', pos.x);
        graph.setNodeAttribute(draggedNode, 'y', pos.y);

        // Prevent camera movement
        e.preventSigmaDefault();
        e.original.preventDefault();
        e.original.stopPropagation();
      },

      mouseup: () => {
        if (draggedNode) {
          setDraggedNode(null);
        } else if (clickedNode) {
          clickedNodesRef.current.delete(clickedNode);
          // Clear neighbors from clicked set and restore their state
          graph.forEachNeighbor(clickedNode, (neighbor, _attr) => {
            clickedNodesRef.current.delete(neighbor);
            // Don't restore if it's in highlighted/searched nodes
            if (highlightedNodesRef.current.has(neighbor)) return;
            // Restore to appropriate type
            restoreNodeType(
              graph,
              neighbor,
              highlightedNodesRef.current,
              clickedNodesRef.current,
              activePropertyNodeTypes,
            );
          });
          restoreNodeType(
            graph,
            clickedNode,
            highlightedNodesRef.current,
            clickedNodesRef.current,
            activePropertyNodeTypes,
          );
          setClickedNode(null);
          sigma.refresh();
        } else if (clickedEdgeRef.current) {
          clearEdgeHighlight(
            graph,
            clickedEdgeRef.current,
            highlightedNodesRef.current,
            clickedNodesRef.current,
            activePropertyNodeTypes,
          );
          clickedEdgeRef.current = null;
          setClickedEdge(null);
          sigma.refresh();
        }
      },

      // Node click - show popup with properties and connected edges
      clickNode: e => {
        if (clickedEdgeRef.current) {
          clearEdgeHighlight(
            graph,
            clickedEdgeRef.current,
            highlightedNodesRef.current,
            clickedNodesRef.current,
            activePropertyNodeTypes,
          );
          clickedEdgeRef.current = null;
          setClickedEdge(null);
        }
        setClickedNode(prevNode => {
          if (prevNode && prevNode !== e.node) {
            clickedNodesRef.current.delete(prevNode);
            // Clear previous neighbors
            graph.forEachNeighbor(prevNode, (neighbor, _attr) => {
              clickedNodesRef.current.delete(neighbor);
              if (highlightedNodesRef.current.has(neighbor)) return;
              restoreNodeType(
                graph,
                neighbor,
                highlightedNodesRef.current,
                clickedNodesRef.current,
                activePropertyNodeTypes,
              );
            });
            restoreNodeType(
              graph,
              prevNode,
              highlightedNodesRef.current,
              clickedNodesRef.current,
              activePropertyNodeTypes,
            );
          }
          if (prevNode === e.node) {
            clickedNodesRef.current.delete(e.node);
            // Clear neighbors when toggling off
            graph.forEachNeighbor(e.node, (neighbor, _attr) => {
              clickedNodesRef.current.delete(neighbor);
              if (highlightedNodesRef.current.has(neighbor)) return;
              restoreNodeType(
                graph,
                neighbor,
                highlightedNodesRef.current,
                clickedNodesRef.current,
                activePropertyNodeTypes,
              );
            });
            restoreNodeType(
              graph,
              e.node,
              highlightedNodesRef.current,
              clickedNodesRef.current,
              activePropertyNodeTypes,
            );
            return null;
          }
          clickedNodesRef.current.add(e.node);
          graph.setNodeAttribute(e.node, 'type', 'border');
          graph.setNodeAttribute(e.node, 'highlighted', true);
          // Highlight neighbors if enabled
          if (highlightNeighborNodes) {
            graph.forEachNeighbor(e.node, (neighbor, attr) => {
              clickedNodesRef.current.add(neighbor);
              attr.type = 'border';
              attr.highlighted = true;
            });
          }
          return e.node;
        });
      },

      // Edge click - show popup with source, edge, and target properties
      clickEdge: e => {
        setClickedNode(null);
        if (clickedEdgeRef.current && clickedEdgeRef.current !== e.edge) {
          clearEdgeHighlight(
            graph,
            clickedEdgeRef.current,
            highlightedNodesRef.current,
            clickedNodesRef.current,
            activePropertyNodeTypes,
          );
        }
        if (clickedEdgeRef.current === e.edge) {
          clearEdgeHighlight(
            graph,
            e.edge,
            highlightedNodesRef.current,
            clickedNodesRef.current,
            activePropertyNodeTypes,
          );
          clickedEdgeRef.current = null;
          setClickedEdge(null);
        } else {
          highlightEdge(graph, e.edge);
          clickedEdgeRef.current = e.edge;
          setClickedEdge(e.edge);
        }
      },
    });
  }, [registerEvents, sigma, draggedNode, clickedNode, clickedNodesRef]);

  // Prepare data for popups
  const graph = sigma.getGraph();

  const nodePopupData = clickedNode
    ? {
        id: clickedNode,
        attributes: graph.getNodeAttributes(clickedNode),
        connectedEdges: graph.edges(clickedNode).map(edge => ({
          edge,
          source: graph.source(edge),
          target: graph.target(edge),
          attributes: graph.getEdgeAttributes(edge),
        })),
      }
    : undefined;

  const edgePopupData = clickedEdge
    ? {
        edge: clickedEdge,
        source: graph.source(clickedEdge),
        target: graph.target(clickedEdge),
        sourceAttributes: graph.getNodeAttributes(graph.source(clickedEdge)),
        targetAttributes: graph.getNodeAttributes(graph.target(clickedEdge)),
        edgeAttributes: graph.getEdgeAttributes(clickedEdge),
      }
    : undefined;

  return (
    <>
      {clickedNode && nodePopupData && (
        <KGPopupTable type='node' nodeData={nodePopupData} onClose={() => setClickedNode(null)} />
      )}
      {clickedEdge && edgePopupData && (
        <KGPopupTable
          type='edge'
          edgeData={edgePopupData}
          onClose={() => {
            if (clickedEdgeRef.current) {
              clearEdgeHighlight(
                graph,
                clickedEdgeRef.current,
                highlightedNodesRef.current,
                clickedNodesRef.current,
                activePropertyNodeTypes,
              );
              clickedEdgeRef.current = null;
            }
            setClickedEdge(null);
          }}
        />
      )}
    </>
  );
}
