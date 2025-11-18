'use client';

import {
  SigmaContainer as _SigmaContainer,
  ControlsContainer,
  FullScreenControl,
  type SigmaContainerProps,
} from '@react-sigma/core';
import { createNodeBorderProgram, NodeBorderProgram } from '@sigma/node-border';
import type { Attributes } from 'graphology-types';
import { MaximizeIcon, MinimizeIcon } from 'lucide-react';
import React, { Suspense, useEffect } from 'react';
import type Sigma from 'sigma';
import { drawDiscNodeHover, EdgeLineProgram, NodeCircleProgram } from 'sigma/rendering';
import { DEFAULT_EDGE_COLOR } from '@/lib/data';
import { NodeGradientProgram } from '@/lib/graph';
import type { EdgeAttributes, NodeAttributes } from '@/lib/interface';
import {
  ColorAnalysis,
  ForceLayout,
  GraphAnalysis,
  GraphEvents,
  GraphExport,
  GraphSettings,
  LoadGraph,
  SizeAnalysis,
  ZoomControl,
} from '.';

export function SigmaContainer(
  props: SigmaContainerProps<NodeAttributes, EdgeAttributes, Attributes> & { ref?: React.Ref<Sigma> },
) {
  const clickedNodesRef = React.useRef(new Set<string>());
  const highlightedNodesRef = React.useRef(new Set<string>());
  const seedProximityNodesRef = React.useRef(new Set<string>());

  useEffect(() => {
    const sigmaContainer = document.querySelector('.sigma-container') as HTMLElement;
    sigmaContainer.addEventListener('contextmenu', e => e.preventDefault());
  }, []);

  return (
    <_SigmaContainer
      ref={props.ref}
      className={props.className}
      settings={{
        allowInvalidContainer: true,
        enableEdgeEvents: true,
        defaultNodeType: 'circle',
        labelRenderedSizeThreshold: 0.75,
        labelDensity: 0.2,
        defaultEdgeColor: DEFAULT_EDGE_COLOR,
        labelSize: 10,
        zoomingRatio: 1.2,
        zIndex: true,
        nodeProgramClasses: {
          circle: NodeGradientProgram,
          border: createNodeBorderProgram({
            borders: [
              {
                size: { attribute: 'borderSize', defaultValue: 0.4 },
                color: { attribute: 'borderColor' },
              },
              { size: { fill: true }, color: { attribute: 'color' } },
            ],
          }),
          highlight: NodeBorderProgram,
          normal: NodeCircleProgram,
        },
        edgeProgramClasses: {
          line: EdgeLineProgram,
        },
        defaultDrawNodeHover: drawDiscNodeHover,
      }}
    >
      <Suspense>
        <LoadGraph />
      </Suspense>
      <GraphExport highlightedNodesRef={highlightedNodesRef} />
      <GraphEvents
        seedProximityNodesRef={seedProximityNodesRef}
        highlightedNodesRef={highlightedNodesRef}
        clickedNodesRef={clickedNodesRef}
      />
      <ForceLayout />
      <GraphSettings clickedNodesRef={clickedNodesRef} />
      <ColorAnalysis />
      <SizeAnalysis />
      <GraphAnalysis highlightedNodesRef={highlightedNodesRef} seedProximityNodesRef={seedProximityNodesRef} />
      <ControlsContainer position='bottom-right' style={{ zIndex: 0 }}>
        <ZoomControl />
        <FullScreenControl labels={{ enter: 'ENTER', exit: 'EXIT' }}>
          <MaximizeIcon />
          <MinimizeIcon />
        </FullScreenControl>
      </ControlsContainer>
    </_SigmaContainer>
  );
}
