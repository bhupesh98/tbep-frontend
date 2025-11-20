'use client';

import { useLoadGraph, useSigma } from '@react-sigma/core';
import type EventEmitter from 'events';
import Graph from 'graphology';
import type { SerializedGraph } from 'graphology-types';
import React from 'react';
import { toast } from 'sonner';
import { applyKnowledgeGraphStyling } from '@/lib/graph';
import { useKGStore } from '@/lib/hooks';
import { NETWORK_STORAGE_KEYS } from '@/lib/interface/knowledge-graph';
import { openDB } from '@/lib/utils';
import { Spinner } from '../ui/spinner';

/**
 * LoadKnowledgeGraph Component
 * Loads knowledge graph from IndexedDB and applies styling
 */
export function LoadKnowledgeGraph() {
  const loadGraph = useLoadGraph();
  const [loading, setLoading] = React.useState(true);
  const setNetworkStatistics = useKGStore(state => state.setNetworkStatistics);
  const sigma = useSigma();

  // biome-ignore lint/correctness/useExhaustiveDependencies: loadGraph stable
  React.useEffect(() => {
    const abortController = new AbortController();

    (async () => {
      try {
        // Open IndexedDB
        const store = await openDB('network', 'readonly');
        if (!store) {
          toast.error('Error opening database!', {
            description: 'Please check your browser settings and try again',
          });
          setLoading(false);
          return;
        }

        // Retrieve knowledge graph from 'network' store
        const req = store.get(NETWORK_STORAGE_KEYS.KNOWLEDGE_GRAPH);

        req.onsuccess = async () => {
          if (abortController.signal.aborted) return;

          const serializedGraph = req.result as SerializedGraph | undefined;

          if (!serializedGraph) {
            toast.error('No knowledge graph found!', {
              description: 'Please upload a file first',
              action: {
                label: 'Go to Upload',
                onClick: () => {
                  window.location.href = '/explore?tab=knowledge-graph';
                },
              },
            });
            setLoading(false);
            return;
          }

          // Validate graph structure
          if (!serializedGraph.nodes || serializedGraph.nodes.length === 0) {
            toast.error('Graph has no nodes!', {
              description: 'The uploaded file appears to be empty',
            });
            setLoading(false);
            return;
          }

          // Create graph with options from serialized data
          // This respects multi-edge, self-loop, and type settings
          const graph = new Graph(serializedGraph.options);
          graph.import(serializedGraph);

          // Apply knowledge graph styling
          await applyKnowledgeGraphStyling(graph);

          // Load into Sigma
          loadGraph(graph);
          (sigma as EventEmitter).emit('loaded');
          setNetworkStatistics({ totalNodes: graph.order, totalEdges: graph.size });

          setLoading(false);
        };

        req.onerror = () => {
          if (!abortController.signal.aborted) {
            toast.error('Error loading graph!', {
              description: 'Failed to retrieve data from storage',
            });
            setLoading(false);
          }
        };
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error('Error in LoadKnowledgeGraph:', error);
          toast.error('Failed to load graph!', {
            description: error instanceof Error ? error.message : 'Unknown error',
          });
          setLoading(false);
        }
      }
    })();

    return () => {
      abortController.abort();
    };
  }, [loadGraph]);

  if (loading) {
    return (
      <div className='absolute bottom-0 z-40 grid h-full w-full place-items-center'>
        <div className='flex flex-col items-center'>
          <Spinner />
          <p className='mt-2 text-gray-600 text-sm'>Loading knowledge graph...</p>
        </div>
      </div>
    );
  }

  return null;
}
