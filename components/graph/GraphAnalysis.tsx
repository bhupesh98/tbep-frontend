'use client';

import type { EdgeAttributes, NodeAttributes } from '@/lib/interface';
import { useStore } from '@/lib/store';
import { useSigma } from '@react-sigma/core';
import type { SerializedEdge, SerializedNode } from 'graphology-types';
import { useEffect, useRef } from 'react';

export function GraphAnalysis() {
  const graph = useSigma<NodeAttributes, EdgeAttributes>().getGraph();
  const radialAnalysis = useStore(state => state.radialAnalysis);
  const droppedEdge = useRef<Set<SerializedEdge<EdgeAttributes>>>(new Set());

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    // graph.forEachEdge((edge, attr, source, target) => {
    //   if (attr.score && attr.score < radialAnalysis.edgeWeightCutOff) {
    //     droppedEdge.current.add({
    //       key: edge,
    //       source: source,
    //       target: target,
    //       attributes: attr,
    //     });
    //     graph.dropEdge(edge);
    //   }
    // });
    // for (const edge of droppedEdge.current) {
    //   if (
    //     graph.hasNode(edge.source) &&
    //     graph.hasNode(edge.target) &&
    //     edge.attributes?.score &&
    //     edge.attributes.score >= radialAnalysis.edgeWeightCutOff
    //   ) {
    //     graph.mergeEdgeWithKey(edge.key, edge.source, edge.target, edge.attributes);
    //     droppedEdge.current.delete(edge);
    //   }
    // }
    let edgeCount = 0;
    graph.updateEachEdgeAttributes((edge, attr) => {
      if (attr.score && attr.score < radialAnalysis.edgeWeightCutOff) {
        attr.hidden = true;
      } else {
        attr.hidden = false;
        edgeCount++;
      }
      return attr;
    });
    useStore.setState({ totalEdges: edgeCount });
  }, [radialAnalysis.edgeWeightCutOff]);

  const nodeDegreeProperty = useStore(state => state.radialAnalysis.nodeDegreeProperty);
  const universalData = useStore(state => state.universalData);
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    let nodeCount = 0;
    graph.updateEachNodeAttributes((node, attr) => {
      if (nodeDegreeProperty === 'geneDegree') {
        const degree = graph.degree(node);
        if (degree < radialAnalysis.nodeDegreeCutOff * 2) {
          attr.hidden = true;
        } else {
          nodeCount++;
          attr.hidden = false;
        }
      } else {
        const value = Number.parseFloat(universalData?.[node].common.TE[nodeDegreeProperty] ?? 'NaN');
        if (value >= radialAnalysis.nodeDegreeCutOff) {
          nodeCount++;
          attr.hidden = false;
        } else {
          attr.hidden = true;
        }
      }
      return attr;
    });
    const edgeCount = graph.reduceEdges((count, ____, ___, __, _, srcAttr, tgtAttr) => {
      return count + (srcAttr.hidden || tgtAttr.hidden ? 0 : 1);
    }, 0);
    useStore.setState({ totalNodes: nodeCount, totalEdges: edgeCount });
  }, [radialAnalysis.nodeDegreeCutOff, nodeDegreeProperty]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (radialAnalysis.hubGeneEdgeCount < 1) return;
    graph.updateEachNodeAttributes((node, attr) => {
      const degree = graph.degree(node);
      if (degree >= radialAnalysis.hubGeneEdgeCount * 2) {
        attr.type = 'border';
      } else {
        attr.type = 'circle';
      }
      return attr;
    });
  }, [radialAnalysis.hubGeneEdgeCount]);

  return null;
}
