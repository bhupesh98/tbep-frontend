'use client';

import { useSigma } from '@react-sigma/core';
import { fitViewportToNodes } from '@sigma/utils';
import { scaleLinear } from 'd3-scale';
import { toUndirected } from 'graphology-operators';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { generateTypeColorMap } from '@/lib/graph';
import { useKGStore } from '@/lib/hooks';
import type { EdgeAttributes, NodeAttributes } from '@/lib/interface';
import { type EventMessage, Events, eventEmitter } from '@/lib/utils';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';

/**
 * KGGraphAnalysis - Leiden community detection and property-based styling
 * Listens for ALGORITHM events and applies clustering with visualization
 */
export function KGGraphAnalysis() {
  const sigma = useSigma<NodeAttributes, EdgeAttributes>();
  const graph = sigma.getGraph();
  const [communityMap, setCommunityMap] = useState<Record<string, { name: string; nodes: string[]; color: string }>>(
    {},
  );

  // Listen for ALGORITHM events
  useEffect(() => {
    const handleAlgorithm = async ({ name, parameters }: EventMessage[Events.ALGORITHM]) => {
      if (name === 'None') {
        setCommunityMap({});
        const typeColorMap = generateTypeColorMap(graph);
        graph.updateEachNodeAttributes((_node, attr) => {
          attr.color = typeColorMap.get(attr.nodeType as string) || undefined;
          attr.community = undefined;
          return attr;
        });
        return;
      }

      if (name === 'Leiden') {
        const { resolution, weighted, minCommunitySize } = parameters!;
        try {
          const louvain = await import('graphology-communities-louvain').then(lib => lib.default);

          // Convert to undirected for clustering
          const undirectedGraph = toUndirected(graph, (currentAttr: EdgeAttributes, nextAttr: EdgeAttributes) => {
            if (weighted === 'true' && currentAttr.score && nextAttr.score) {
              return { ...currentAttr, score: currentAttr.score + nextAttr.score };
            }
            return currentAttr;
          });

          const hslToHex = (h: number, s: number, l: number) => {
            l /= 100;
            const a = (s * Math.min(l, 1 - l)) / 100;
            const f = (n: number) => {
              const k = (n + h / 30) % 12;
              const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
              return Math.round(255 * color)
                .toString(16)
                .padStart(2, '0');
            };
            return `#${f(0)}${f(8)}${f(4)}`;
          };

          const res = louvain.detailed(undirectedGraph, {
            resolution: +resolution,
            getEdgeWeight: weighted === 'true' ? 'score' : null,
          });

          const map: Record<string, { name: string; nodes: string[]; color: string }> = {};
          let count = 0;

          for (const [node, comm] of Object.entries(res.communities)) {
            if (!map[comm]) {
              map[comm] = {
                name: `Community ${count++}`,
                nodes: [],
                color: hslToHex(count * 137.508, 75, 50),
              };
            }
            map[comm].nodes.push(node);
          }

          // Apply colors and filter by size
          const displayMap: Record<string, { name: string; nodes: string[]; color: string }> = {};
          for (const [id, community] of Object.entries(map)) {
            if (community.nodes.length < +minCommunitySize) {
              for (const node of community.nodes) {
                if (graph.hasNode(node)) graph.setNodeAttribute(node, 'color', undefined);
              }
              continue;
            }
            for (const node of community.nodes) {
              if (graph.hasNode(node)) {
                graph.setNodeAttribute(node, 'color', community.color);
                graph.setNodeAttribute(node, 'community', community.name);
              }
            }
            displayMap[id] = { name: community.name, nodes: community.nodes, color: community.color };
          }

          setCommunityMap(displayMap);

          // Emit results
          eventEmitter.emit(Events.ALGORITHM_RESULTS, {
            modularity: res.modularity,
            resolution: +resolution,
            communities: Object.values(map)
              .filter(c => c.nodes.length >= +minCommunitySize)
              .map(({ name, nodes, color }) => {
                const [degreeSum, maxDegree] = nodes.reduce(
                  ([acc, max], node) => {
                    const degree = graph.hasNode(node) ? graph.degree(node) : 0;
                    return [acc + degree, Math.max(max, degree)];
                  },
                  [0, 0],
                );
                return {
                  name,
                  nodes: nodes.map(v => (graph.hasNode(v) ? graph.getNodeAttribute(v, 'label') || v : v)),
                  color,
                  percentage: ((nodes.length / graph.order) * 100).toFixed(2),
                  averageDegree: (degreeSum / nodes.length).toFixed(2),
                  degreeCentralNode: graph.hasNode(
                    nodes.find(g => graph.hasNode(g) && graph.degree(g) === maxDegree) || nodes[0],
                  )
                    ? graph.getNodeAttribute(
                        nodes.find(g => graph.hasNode(g) && graph.degree(g) === maxDegree) || nodes[0],
                        'label',
                      ) || nodes[0]
                    : nodes[0],
                };
              }),
          } as EventMessage[Events.ALGORITHM_RESULTS]);

          toast.success('Leiden clustering completed', {
            description: `${Object.keys(displayMap).length} communities (modularity: ${res.modularity.toFixed(3)})`,
          });
        } catch (error) {
          console.error('Leiden error:', error);
          toast.error('Failed to run Leiden clustering', {
            description: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    };

    eventEmitter.on(Events.ALGORITHM, handleAlgorithm);
    return () => {
      eventEmitter.off(Events.ALGORITHM, handleAlgorithm);
    };
  }, [graph]);

  // Helper to get readable text color
  const getReadableTextColor = useCallback((hex: string) => {
    const match = hex.match(/\w\w/g);
    if (!match) return '#000';
    const [r, g, b] = match.map(v => Number.parseInt(v, 16));
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 140 ? '#000' : '#fff';
  }, []);

  // Handle node coloring based on property
  const selectedColorProperty = useKGStore(state => state.selectedNodeColorProperty);
  const nodePropertyData = useKGStore(state => state.nodePropertyData);

  useEffect(() => {
    if (!selectedColorProperty) {
      graph.updateEachNodeAttributes((_node, attr) => {
        if (!attr.community) {
          attr.color = undefined;
        }
        return attr;
      });
      return;
    }

    const values: number[] = [];
    graph.forEachNode(node => {
      const value = nodePropertyData[node]?.[selectedColorProperty];
      if (typeof value === 'number' && !Number.isNaN(value)) {
        values.push(value);
      }
    });

    if (values.length === 0) return;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const colorScale = scaleLinear<string>([min, max], ['#f0f9ff', '#0369a1']);

    graph.updateEachNodeAttributes((node, attr) => {
      const value = nodePropertyData[node]?.[selectedColorProperty];
      if (typeof value === 'number' && !Number.isNaN(value)) {
        attr.color = colorScale(value);
      }
      return attr;
    });
  }, [selectedColorProperty, nodePropertyData, graph]);

  // Handle node sizing based on property
  const selectedSizeProperty = useKGStore(state => state.selectedNodeSizeProperty);

  useEffect(() => {
    if (!selectedSizeProperty) {
      graph.updateEachNodeAttributes((_node, attr) => {
        attr.size = useKGStore.getState().defaultNodeSize;
        return attr;
      });
      return;
    }

    const values: number[] = [];
    graph.forEachNode(node => {
      const value = nodePropertyData[node]?.[selectedSizeProperty];
      if (typeof value === 'number' && !Number.isNaN(value)) {
        values.push(value);
      }
    });

    if (values.length === 0) return;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const sizeScale = scaleLinear<number>([min, max], [3, 15]);

    graph.updateEachNodeAttributes((node, attr) => {
      const value = nodePropertyData[node]?.[selectedSizeProperty];
      if (typeof value === 'number' && !Number.isNaN(value)) {
        attr.size = sizeScale(value);
      }
      return attr;
    });
  }, [selectedSizeProperty, nodePropertyData, graph]);

  return (
    <>
      {Object.keys(communityMap).length > 0 && (
        <div className='absolute bottom-1 left-2 flex max-h-56 flex-col space-y-1 overflow-scroll rounded-md border bg-white/95 p-2 shadow-lg backdrop-blur-sm'>
          <div className='mb-1 flex items-center justify-between border-b pb-1'>
            <span className='font-semibold text-sm'>Communities</span>
            <Button
              onClick={() => {
                eventEmitter.emit(Events.ALGORITHM, { name: 'None' } as EventMessage[Events.ALGORITHM]);
              }}
              type='button'
              variant='ghost'
              size='sm'
              className='h-6 px-2 text-xs'
            >
              Clear
            </Button>
          </div>
          {Object.entries(communityMap).map(([id, val]) => (
            <div key={id} className='flex items-center gap-1'>
              <Checkbox
                defaultChecked
                onCheckedChange={bool => {
                  if (bool === 'indeterminate') return;
                  for (const node of val.nodes) {
                    if (graph.hasNode(node)) {
                      graph.setNodeAttribute(node, 'hidden', !bool);
                    }
                  }
                }}
              />
              <Button
                style={{ backgroundColor: val.color, color: getReadableTextColor(val.color) }}
                className='h-5 w-32 text-xs'
                onClick={() => fitViewportToNodes(sigma, val.nodes, { animate: true })}
              >
                {val.name} ({val.nodes.length})
              </Button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
