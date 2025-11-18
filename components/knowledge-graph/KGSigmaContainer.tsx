'use client';

import {
  SigmaContainer as _SigmaContainer,
  ControlsContainer,
  FullScreenControl,
  type SigmaContainerProps,
} from '@react-sigma/core';
import { createEdgeCurveProgram } from '@sigma/edge-curve';
import { createNodeBorderProgram } from '@sigma/node-border';
import { MultiGraph } from 'graphology';
import type { Attributes } from 'graphology-types';
import { MaximizeIcon, MinimizeIcon } from 'lucide-react';
import React, { Suspense, useEffect } from 'react';
import type Sigma from 'sigma';
import { drawDiscNodeHover, EdgeArrowProgram, EdgeRectangleProgram } from 'sigma/rendering';
import { DEFAULT_EDGE_COLOR } from '@/lib/data';
import { NodeGradientProgram } from '@/lib/graph';
import { useKGStore } from '@/lib/hooks';
import type { EdgeAttributes, NodeAttributes } from '@/lib/interface';
import { ZoomControl } from '../graph';
import {
  KGColorAnalysis,
  KGForceLayout,
  KGGraphAnalysis,
  KGGraphEvents,
  KGGraphSettings,
  KGSizeAnalysis,
  LoadKnowledgeGraph,
} from '.';

// Create edge programs for different edge types
// Note: createEdgeCurveProgram wraps any edge program to add curvature
const EdgeCurvedArrowProgram = createEdgeCurveProgram(); // Directed parallel edges (uses EdgeArrowProgram internally)
const EdgeCurvedProgram = createEdgeCurveProgram(); // Undirected parallel edges (will use with EdgeRectangleProgram base)

/**
 * KnowledgeGraphSigmaContainer
 * Specialized Sigma container for knowledge graph visualization
 * Supports curved edges for parallel/bidirectional edges
 */
export function KGGraphSigmaContainer(
  props: SigmaContainerProps<NodeAttributes, EdgeAttributes, Attributes> & { ref?: React.Ref<Sigma> },
) {
  const clickedNodesRef = React.useRef(new Set<string>());
  const highlightedNodesRef = React.useRef(new Set<string>());

  useEffect(() => {
    const sigmaContainer = document.querySelector('.sigma-container') as HTMLElement;
    if (sigmaContainer) {
      sigmaContainer.addEventListener('contextmenu', e => e.preventDefault());
    }
  }, []);

  return (
    <div className='flex h-full w-full'>
      <_SigmaContainer
        ref={(sigma: Sigma | null) => {
          useKGStore.setState({ sigmaInstance: sigma });
          if (props.ref) {
            if (typeof props.ref === 'function') {
              props.ref(sigma);
            } else {
              (props.ref as React.RefObject<Sigma | null>).current = sigma;
            }
          }
        }}
        className={`${props.className || ''} flex-1`}
        graph={MultiGraph}
        settings={{
          renderEdgeLabels: true,
          allowInvalidContainer: true,
          enableEdgeEvents: true,
          defaultNodeType: 'circle',
          labelRenderedSizeThreshold: 0.75,
          labelDensity: 0.2,
          defaultEdgeColor: DEFAULT_EDGE_COLOR,
          defaultEdgeType: 'straight',
          labelSize: 10,
          zoomingRatio: 1.2,
          zIndex: true,
          nodeProgramClasses: {
            circle: NodeGradientProgram,
            border: createNodeBorderProgram({
              borders: [
                {
                  size: { attribute: 'borderSize', defaultValue: 0.1 },
                  color: { attribute: 'borderColor' },
                },
                { size: { fill: true }, color: { attribute: 'color' } },
              ],
            }),
          },
          edgeProgramClasses: {
            straight: EdgeArrowProgram, // Directed single edge
            curved: EdgeCurvedArrowProgram, // Directed parallel edges
            rectangle: EdgeRectangleProgram, // Undirected single edge
            curvedUndirected: EdgeCurvedProgram, // Undirected parallel edges
          },
          defaultDrawNodeHover: drawDiscNodeHover,
        }}
      >
        <Suspense>
          <LoadKnowledgeGraph />
        </Suspense>
        <KGForceLayout />
        <KGGraphAnalysis />
        <KGColorAnalysis />
        <KGSizeAnalysis />
        <KGGraphSettings clickedNodesRef={clickedNodesRef} highlightedNodesRef={highlightedNodesRef} />
        <KGGraphEvents clickedNodesRef={clickedNodesRef} highlightedNodesRef={highlightedNodesRef} />
        <ControlsContainer position='bottom-right' style={{ zIndex: 0 }}>
          <ZoomControl />
          <FullScreenControl labels={{ enter: 'ENTER', exit: 'EXIT' }}>
            <MaximizeIcon />
            <MinimizeIcon />
          </FullScreenControl>
        </ControlsContainer>
      </_SigmaContainer>
    </div>
  );
}
