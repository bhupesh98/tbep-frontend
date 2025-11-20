'use client';
import { useSigma } from '@react-sigma/core';
import type EventEmitter from 'events';
import { useCallback, useEffect, useRef } from 'react';
import { useKGStore } from '@/lib/hooks';
import type { EdgeAttributes, NodeAttributes } from '@/lib/interface';

export function KGForceLayout() {
  const sigma = useSigma<NodeAttributes, EdgeAttributes>();
  const workerRef = useRef<Worker | null>(null);
  const graph = sigma.getGraph();
  const settings = useKGStore(state => state.forceSettings);
  const defaultNodeSize = useKGStore(state => state.defaultNodeSize);

  const handleWorkerMessage = useCallback(
    (event: MessageEvent) => {
      if (!graph) return;

      const { type, positions } = event.data;

      if (type === 'tick' && positions) {
        for (const { ID, x, y } of positions) {
          graph.setNodeAttribute(ID, 'x', x);
          graph.setNodeAttribute(ID, 'y', y);
        }
      }
    },
    [graph],
  );

  // Initialize worker and simulation
  // biome-ignore lint/correctness/useExhaustiveDependencies: not needed
  useEffect(() => {
    (sigma as EventEmitter).once('loaded', () => {
      const graph = sigma.getGraph();

      // Create worker
      workerRef.current = new Worker(new URL('../../lib/force-layout.worker.ts', import.meta.url), { type: 'module' });

      workerRef.current.onmessage = handleWorkerMessage;

      // Prepare data for worker
      const nodes = graph.mapNodes(node => ({ ID: node }));
      const edges = graph.mapEdges((_edge, _attr, source, target) => ({
        source,
        target,
      }));

      // Initialize simulation in worker
      workerRef.current.postMessage({
        type: 'init',
        nodes,
        edges,
        settings: {
          linkDistance: settings.linkDistance,
          chargeStrength: -200,
          collideRadius: defaultNodeSize * 8,
        },
      });

      // Update store with worker controls
      useKGStore.setState({
        forceWorker: {
          start() {
            workerRef.current?.postMessage({ type: 'start' });
          },
          stop() {
            workerRef.current?.postMessage({ type: 'stop' });
          },
        },
      });
    });

    // Cleanup
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [sigma, handleWorkerMessage]);

  // Update settings
  // biome-ignore lint/correctness/useExhaustiveDependencies: not needed
  useEffect(() => {
    if (!workerRef.current) return;

    workerRef.current.postMessage({
      type: 'updateSettings',
      settings: {
        linkDistance: settings.linkDistance,
        chargeStrength: -200,
        collideRadius: defaultNodeSize * 8,
      },
    });
  }, [settings]);

  return null;
}
