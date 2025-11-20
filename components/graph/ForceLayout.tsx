'use client';

import { useSigma } from '@react-sigma/core';
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
  type SimulationLinkDatum,
} from 'd3-force';
import type EventEmitter from 'events';
import { useCallback, useEffect, useRef } from 'react';
import { useStore } from '@/lib/hooks';
import type { EdgeAttributes, NodeAttributes } from '@/lib/interface';

export function ForceLayout() {
  const sigma = useSigma<NodeAttributes, EdgeAttributes>();
  const nodes = useRef<NodeAttributes[]>([]);
  const edges = useRef<SimulationLinkDatum<NodeAttributes>[]>([]);
  const simulation = useRef<Simulation<NodeAttributes, SimulationLinkDatum<NodeAttributes>> | null>(null);
  const graph = sigma.getGraph();
  const settings = useStore(state => state.forceSettings);
  const defaultNodeSize = useStore(state => state.defaultNodeSize);

  const tick = useCallback(() => {
    if (!graph || !nodes.current.length) return;
    for (const node of nodes.current) {
      graph.setNodeAttribute(node.ID, 'x', node.x);
      graph.setNodeAttribute(node.ID, 'y', node.y);
    }
  }, [graph]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: I won't write reason
  useEffect(() => {
    (sigma as EventEmitter).once('loaded', () => {
      const graph = sigma.getGraph();
      nodes.current = graph.mapNodes(node => ({
        ID: node,
      }));
      edges.current = graph.mapEdges((_edge, _attr, source, target) => ({
        source,
        target,
      }));
      simulation.current = forceSimulation<NodeAttributes, SimulationLinkDatum<NodeAttributes>>(nodes.current)
        .force(
          'link',
          forceLink<NodeAttributes, SimulationLinkDatum<NodeAttributes>>(edges.current)
            .id(d => d.ID!)
            .distance(settings.linkDistance),
        )
        .force('charge', forceManyBody().strength(-200).theta(0.8))
        .force('collide', forceCollide(defaultNodeSize * 8))
        .on('tick', tick);

      useStore.setState({
        forceWorker: {
          start() {
            simulation.current?.alpha(1).restart();
          },
          stop() {
            simulation.current?.stop();
          },
        },
      });
    });
  }, [sigma, tick]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: I won't write reason
  useEffect(() => {
    if (!simulation.current || !edges.current) return;
    simulation.current.force(
      'link',
      forceLink<NodeAttributes, SimulationLinkDatum<NodeAttributes>>(edges.current)
        .id(d => d.ID!)
        .distance(settings.linkDistance),
    );
    simulation.current.force('collide', forceCollide(defaultNodeSize * 8));
    simulation.current.alpha(0.3).restart();
  }, [settings]);

  return null;
}
