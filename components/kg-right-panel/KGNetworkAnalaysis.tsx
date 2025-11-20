'use client';

import { Label } from '@radix-ui/react-label';
import type EventEmitter from 'events';
import { ChevronsUpDownIcon, DownloadIcon } from 'lucide-react';
import Papa from 'papaparse';
import { useEffect, useId, useState } from 'react';
import { algorithms, columnLeidenResults } from '@/lib/data';
import { useKGStore } from '@/lib/hooks';
import type { NodeAttributes } from '@/lib/interface';
import { downloadFile, type EventMessage, Events, eventEmitter } from '@/lib/utils';
import SliderWithInput from '../SliderWithInput';
import { LeidenPieChart } from '../statistics';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { DataTable } from '../ui/data-table';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { type GroupedRow, VirtualizedGroupedTable } from '../ui/virtualized-grouped-table';
import { VirtualizedCombobox } from '../VirtualizedCombobox';

export function KGNetworkAnalysis({ children }: { children: React.ReactNode }) {
  const sigmaInstance = useKGStore(state => state.sigmaInstance);
  const focusedViewId = useId();

  // Form state for select inputs
  const [formState, setFormState] = useState<Record<string, string>>({});

  // Node options populated once after graph loads
  const [nodeOptions, setNodeOptions] = useState<string[]>([]);

  useEffect(() => {
    if (!sigmaInstance) return;

    const handleLoaded = () => {
      const graph = sigmaInstance.getGraph();
      const options = graph.mapNodes((node: string, attr: NodeAttributes) => attr.label || node);
      setNodeOptions(options);
    };

    (sigmaInstance as EventEmitter).once('loaded', handleLoaded);

    return () => {
      (sigmaInstance as EventEmitter).off('loaded', handleLoaded);
    };
  }, [sigmaInstance]);

  const handleAlgoQuery = (name: string, formData?: FormData | Record<string, string>) => {
    if (formData) {
      const parameters = formData instanceof FormData ? Object.fromEntries(formData.entries()) : formData;

      eventEmitter.emit(Events.ALGORITHM, {
        name,
        parameters: parameters as EventMessage[Events.ALGORITHM]['parameters'],
      } satisfies EventMessage[Events.ALGORITHM]);
    } else {
      eventEmitter.emit(Events.ALGORITHM, { name: 'None' } satisfies EventMessage[Events.ALGORITHM]);
      setAlgorithmResults(null);
      setFocusedView(false);
    }
  };
  const [algorithmResults, setAlgorithmResults] = useState<EventMessage[Events.ALGORITHM_RESULTS] | null>(null);

  useEffect(() => {
    eventEmitter.on(Events.ALGORITHM_RESULTS, (data: EventMessage[Events.ALGORITHM_RESULTS]) => {
      setAlgorithmResults(data);
    });
  }, []);

  const [showTable, setShowTable] = useState(false);
  const [showPathsTable, setShowPathsTable] = useState(false);
  const [pathFilter, setPathFilter] = useState('');
  const [focusedView, setFocusedView] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowPathsTable(false);
        setShowTable(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Reset focused view when algorithm results change
  useEffect(() => {
    if (!algorithmResults || (!algorithmResults.paths && !algorithmResults.communities)) {
      setFocusedView(false);
    }
  }, [algorithmResults]);

  // Handle focused view toggle
  useEffect(() => {
    if (!sigmaInstance || !algorithmResults) return;

    const graph = sigmaInstance.getGraph();

    if (focusedView) {
      // Hide all nodes/edges first
      graph.updateEachNodeAttributes((_node, attr) => {
        attr.hidden = true;
        return attr;
      });
      graph.updateEachEdgeAttributes((_edge, attr) => {
        attr.hidden = true;
        return attr;
      });

      // Show only result nodes/edges
      if (algorithmResults.paths) {
        const resultNodes = new Set<string>();
        const resultEdges = new Set<string>();

        for (const path of algorithmResults.paths) {
          for (const node of path.nodes) {
            resultNodes.add(node);
          }

          // Show edges between consecutive nodes in path
          for (let i = 0; i < path.nodes.length - 1; i++) {
            const edges = graph.edges(path.nodes[i], path.nodes[i + 1]);
            for (const edge of edges) {
              resultEdges.add(edge);
            }
          }
        }

        resultNodes.forEach(node => {
          if (graph.hasNode(node)) {
            graph.setNodeAttribute(node, 'hidden', false);
          }
        });

        resultEdges.forEach(edge => {
          if (graph.hasEdge(edge)) {
            graph.setEdgeAttribute(edge, 'hidden', false);
          }
        });
      }

      if (algorithmResults.communities) {
        algorithmResults.communities.forEach(community => {
          community.nodes.forEach((nodeLabel: string) => {
            // Find node by label
            const nodeId = graph.findNode(
              (_node: string, attr: NodeAttributes) => attr.label === nodeLabel || _node === nodeLabel,
            );
            if (nodeId && graph.hasNode(nodeId)) {
              graph.setNodeAttribute(nodeId, 'hidden', false);
            }
          });
        });

        // Show edges between community nodes
        graph.forEachEdge((edge, _attr, source, target) => {
          const sourceHidden = graph.getNodeAttribute(source, 'hidden');
          const targetHidden = graph.getNodeAttribute(target, 'hidden');
          if (!sourceHidden && !targetHidden) {
            graph.setEdgeAttribute(edge, 'hidden', false);
          }
        });
      }
    } else {
      // Show all nodes/edges
      graph.updateEachNodeAttributes((_node, attr) => {
        attr.hidden = false;
        return attr;
      });
      graph.updateEachEdgeAttributes((_edge, attr) => {
        attr.hidden = false;
        return attr;
      });
    }
  }, [focusedView, algorithmResults, sigmaInstance]);

  const handleExport = (communities: EventMessage[Events.ALGORITHM_RESULTS]['communities']) => {
    if (!communities) return;
    const csv = Papa.unparse(
      communities.map(c => ({
        ...c,
        nodes: c.nodes.join(';'),
        numberOfNodes: c.nodes.length,
      })),
    );
    downloadFile(csv, 'leiden_communities.csv');
  };

  const handlePathExport = (paths: EventMessage[Events.ALGORITHM_RESULTS]['paths']) => {
    if (!paths) return;
    const csv = Papa.unparse(
      paths.map((p, idx) => ({
        pathNumber: idx + 1,
        length: p.length || 0,
        weight: p.weight || 'N/A',
        nodes: p.nodes.join(' → '),
        labels: p.labels?.join(' → ') || '',
        nodeTypes: p.nodeTypes?.join(' → ') || '',
      })),
    );
    downloadFile(csv, 'path_results.csv');
  };

  return (
    <Collapsible defaultOpen className='mb-2 rounded border p-2 text-xs shadow-sm'>
      <div className='flex w-full items-center justify-between'>
        <p className='font-bold'>Network Analysis</p>
        <CollapsibleTrigger asChild>
          <Button type='button' variant='outline' size='icon' className='size-6'>
            <ChevronsUpDownIcon size={15} />
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className='mt-1'>
        <RadioGroup defaultValue='None' className='mb-2'>
          {algorithms.map(({ name, parameters }) => (
            <Popover key={name}>
              <div className='flex items-center space-x-2'>
                <PopoverTrigger asChild>
                  <RadioGroupItem value={name} id={name} onClick={() => name === 'None' && handleAlgoQuery(name)} />
                </PopoverTrigger>
                <Label htmlFor={name} className='text-xs'>
                  {name}
                </Label>
              </div>
              {parameters.length > 0 && (
                <PopoverContent className='w-52'>
                  <form
                    key={name}
                    className='flex flex-col space-y-2'
                    onSubmit={e => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      // Merge form data with select state
                      const params = Object.fromEntries(formData.entries());
                      const mergedParams: Record<string, string> = {};
                      for (const [key, value] of Object.entries({ ...formState, ...params })) {
                        mergedParams[key] = typeof value === 'string' ? value : String(value);
                      }
                      handleAlgoQuery(name, mergedParams);
                    }}
                  >
                    {parameters.map(param => {
                      if (param.type === 'slider') {
                        return (
                          <div key={param.name}>
                            <Label htmlFor={param.name} className='font-semibold text-xs'>
                              {param.displayName}
                            </Label>
                            <SliderWithInput
                              min={param.min}
                              max={param.max}
                              step={param.step}
                              id={param.name}
                              defaultValue={param.defaultValue as number}
                            />
                          </div>
                        );
                      }
                      if (param.type === 'select') {
                        return (
                          <div key={param.name}>
                            <Label htmlFor={param.name} className='font-semibold text-xs'>
                              {param.displayName}
                            </Label>
                            <VirtualizedCombobox
                              data={nodeOptions}
                              value={formState[param.name] || ''}
                              onChange={value => {
                                if (typeof value === 'string') {
                                  setFormState(prev => ({ ...prev, [param.name]: value }));
                                }
                              }}
                              placeholder={param.placeholder}
                              className='w-full text-xs'
                              width='700px'
                            />
                          </div>
                        );
                      }
                      return (
                        <div key={param.name} className='flex w-full items-center gap-2'>
                          <Label htmlFor={param.name} className='font-semibold text-xs'>
                            {param.displayName}
                          </Label>
                          <Checkbox name={param.name} id={param.name} defaultChecked={param.defaultValue as boolean} />
                        </div>
                      );
                    })}
                    <Button
                      type='submit'
                      size={'sm'}
                      className=''
                      disabled={
                        // Disable for DWPC and Path Finding if source or target not selected
                        (name === 'DWPC' || name === 'Path Finding') && (!formState.source || !formState.target)
                      }
                    >
                      Apply
                    </Button>
                  </form>
                </PopoverContent>
              )}
            </Popover>
          ))}
        </RadioGroup>
        {algorithmResults && (
          <>
            <hr className='mb-1' />
            <div className='flex items-center justify-between'>
              <p className='font-semibold text-sm underline'>Results:</p>
              {(algorithmResults.paths || algorithmResults.communities) && (
                <div className='flex items-center gap-1'>
                  <Checkbox
                    id={focusedViewId}
                    checked={focusedView}
                    onCheckedChange={checked => setFocusedView(checked === true)}
                  />
                  <Label htmlFor={focusedViewId} className='cursor-pointer text-xs'>
                    Focused View
                  </Label>
                </div>
              )}
            </div>
            {algorithmResults.modularity !== undefined && (
              <p>
                <b>Modularity:</b> {algorithmResults.modularity}
              </p>
            )}
            {algorithmResults.resolution !== undefined && (
              <p>
                <b>Resolution:</b> {algorithmResults.resolution}
              </p>
            )}
            {algorithmResults.dwpcScore !== undefined && (
              <p>
                <b>DWPC Score:</b> {algorithmResults.dwpcScore.toFixed(4)}
              </p>
            )}
            {algorithmResults.allMetapaths !== undefined && algorithmResults.allMetapaths.length > 0 && (
              <div>
                <b>Metapaths:</b>
                {algorithmResults.allMetapaths.map(mp => (
                  // write each metapath in a separate line as a bullet list
                  <p key={mp.join(';')} className='ml-2'>
                    • {mp.join(' → ')}
                  </p>
                ))}
              </div>
            )}
            {algorithmResults.paths && algorithmResults.paths.length > 0 && (
              <div className='my-1 flex justify-center'>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => {
                    setShowPathsTable(true);
                    setPathFilter('');
                  }}
                >
                  Show Details ({algorithmResults.paths.length})
                </Button>
                <Dialog open={showPathsTable}>
                  <DialogContent className='flex max-h-[92vh] min-h-[60vh] max-w-7xl flex-col gap-2'>
                    <DialogTitle>Path Analysis Results</DialogTitle>
                    <DialogDescription>
                      {algorithmResults.dwpcScore !== undefined
                        ? `DWPC Score: ${algorithmResults.dwpcScore.toFixed(4)} | Damping: ${algorithmResults.damping || 0.4}`
                        : 'Shortest paths between source and target nodes'}
                    </DialogDescription>
                    {(() => {
                      // Group paths by metapath and sort by weight descending
                      const groupMap = new Map<string, GroupedRow>();
                      const sigmaInstance = useKGStore.getState().sigmaInstance;
                      const graph = sigmaInstance?.getGraph();

                      // Generate type color map
                      const { generateTypeColorMap } = require('@/lib/graph/knowledge-graph-renderer');
                      const typeColorMap = graph ? generateTypeColorMap(graph) : new Map<string, string>();

                      algorithmResults.paths
                        .sort((a, b) => (b.weight || 0) - (a.weight || 0))
                        .forEach((p, idx) => {
                          const metapath = p.nodeTypes?.join(' → ') || '';
                          const metapathTypes = p.nodeTypes || [];
                          const length = p.length || p.nodes.length - 1;

                          if (!groupMap.has(metapath)) {
                            groupMap.set(metapath, {
                              metapath,
                              metapathTypes,
                              length,
                              paths: [],
                            });
                          }

                          groupMap.get(metapath)!.paths.push({
                            pathNumber: idx + 1,
                            weight: p.weight || 0,
                            nodes: p.labels?.join(' → ') || p.nodes.join(' → '),
                          });
                        });

                      return (
                        <VirtualizedGroupedTable
                          groups={Array.from(groupMap.values())}
                          typeColorMap={typeColorMap}
                          filterValue={pathFilter}
                          onFilterChange={setPathFilter}
                          placeholder='Search by node'
                        />
                      );
                    })()}
                    <DialogFooter className='w-full gap-2'>
                      <Button
                        size={'icon'}
                        variant={'outline'}
                        onClick={() => handlePathExport(algorithmResults.paths)}
                      >
                        <DownloadIcon size={20} />
                      </Button>
                      <DialogClose asChild>
                        <Button type='button' variant={'secondary'} onClick={() => setShowPathsTable(false)}>
                          Close (Esc)
                        </Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
            {algorithmResults.communities && (
              <div className='my-1 flex justify-center'>
                <Button size='sm' variant='outline' onClick={() => setShowTable(true)}>
                  Show Details ({algorithmResults.communities.length})
                </Button>
                <Dialog open={showTable}>
                  <DialogContent className='flex max-h-[92vh] min-h-[60vh] max-w-7xl flex-col gap-2'>
                    <DialogTitle>Leiden Communities</DialogTitle>
                    <DialogDescription>View the identified communities and their characteristics.</DialogDescription>
                    <Tabs defaultValue='table' className='w-full'>
                      <div className='flex justify-center'>
                        <TabsList className='w-1/2 gap-2'>
                          <TabsTrigger className='w-full' value='table'>
                            Table
                          </TabsTrigger>
                          <TabsTrigger className='w-full' value='chart'>
                            Chart
                          </TabsTrigger>
                        </TabsList>
                      </div>
                      <TabsContent value='table' className='flex max-h-[65vh] flex-col'>
                        <div className='overflow-y-scroll'>
                          <DataTable
                            data={algorithmResults.communities.map((c, _i) => ({
                              ...c,
                              averageDegree: c.averageDegree.toString(),
                              percentage: c.percentage.toString(),
                              nodes: c.nodes.join(', '),
                              numberOfNodes: c.nodes.length.toString(),
                            }))}
                            columns={columnLeidenResults}
                            filterColumnName={'nodes'}
                            placeholder='Search by node name'
                          />
                        </div>
                      </TabsContent>
                      <TabsContent value='chart' className='flex'>
                        <span>
                          <p>
                            <b>Resolution:</b> {algorithmResults.resolution}
                          </p>
                          <p>
                            <b>Modularity:</b> {algorithmResults.modularity}
                          </p>
                          <p className='text-xs'>*Hover for more information</p>
                        </span>
                        <LeidenPieChart data={algorithmResults.communities} />
                      </TabsContent>
                    </Tabs>
                    <DialogFooter className='w-full gap-2'>
                      <Button
                        size={'icon'}
                        variant={'outline'}
                        onClick={() => handleExport(algorithmResults.communities)}
                      >
                        <DownloadIcon size={20} />
                      </Button>
                      <DialogClose asChild>
                        <Button type='button' variant={'secondary'} onClick={() => setShowTable(false)}>
                          Close (Esc)
                        </Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </>
        )}
        <hr className='mb-1' />
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
