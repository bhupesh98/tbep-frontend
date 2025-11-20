'use client';

import { X } from 'lucide-react';
import type { EdgeAttributes, NodeAttributes } from '@/lib/interface';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface KGPopupTableProps {
  type: 'node' | 'edge';
  nodeData?: {
    id: string;
    attributes: NodeAttributes;
    connectedEdges: Array<{ edge: string; source: string; target: string; attributes: EdgeAttributes }>;
  };
  edgeData?: {
    edge: string;
    source: string;
    target: string;
    sourceAttributes: NodeAttributes;
    targetAttributes: NodeAttributes;
    edgeAttributes: EdgeAttributes;
  };
  onClose: () => void;
}

export function KGPopupTable({ type, nodeData, edgeData, onClose }: KGPopupTableProps) {
  if (type === 'node' && nodeData) {
    const { id, attributes, connectedEdges } = nodeData;

    return (
      <div className='absolute top-4 right-4 z-20 max-h-[85vh] w-[500px] overflow-hidden rounded-lg border-2 border-muted bg-white shadow-xl'>
        <div className='flex items-center justify-between border-b bg-gray-50 px-4 py-3'>
          <h2 className='font-semibold text-gray-900 text-lg'>Node Details</h2>
          <Button size='icon' variant='ghost' onClick={onClose} className='size-7'>
            <X className='size-4' />
          </Button>
        </div>

        <Tabs defaultValue='properties' className='flex h-full flex-col'>
          <TabsList className='grid w-full grid-cols-2 rounded-none border-b'>
            <TabsTrigger value='properties'>Node Properties</TabsTrigger>
            <TabsTrigger value='edges'>Connected Edges ({connectedEdges.length})</TabsTrigger>
          </TabsList>

          <div className='overflow-y-auto' style={{ maxHeight: 'calc(85vh - 120px)' }}>
            <TabsContent value='properties' className='m-0 p-4'>
              <div className='space-y-3'>
                <div>
                  <h3 className='font-semibold text-gray-700 text-sm'>Node ID</h3>
                  <p className='text-gray-900 text-sm'>{id}</p>
                </div>

                {Object.entries(attributes)
                  .filter(
                    ([key, value]) =>
                      ![
                        'x',
                        'y',
                        'ID',
                        'size',
                        'color',
                        'highlighted',
                        'hidden',
                        'type',
                        'zIndex',
                        'forceLabel',
                        'originalLabel',
                      ].includes(key) && value !== undefined,
                  )
                  .map(([key, value]) => (
                    <div key={key}>
                      <h3 className='font-semibold text-gray-700 text-sm capitalize'>
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </h3>
                      <p className='wrap-break-word text-gray-900 text-sm'>
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </p>
                    </div>
                  ))}
              </div>
            </TabsContent>

            <TabsContent value='edges' className='m-0 p-4'>
              <div className='space-y-3'>
                {connectedEdges.length === 0 ? (
                  <p className='text-center text-gray-500 text-sm'>No connected edges</p>
                ) : (
                  connectedEdges.map(({ edge, source, target, attributes: edgeAttr }, idx) => (
                    <div key={edge} className='rounded border border-gray-200 bg-gray-50 p-3'>
                      <div className='mb-2 flex items-center justify-between'>
                        <span className='font-semibold text-gray-700 text-xs'>Edge {idx + 1}</span>
                        <span className='rounded bg-gray-200 px-2 py-0.5 font-mono text-gray-600 text-xs'>{edge}</span>
                      </div>
                      <div className='space-y-2 text-xs'>
                        <div>
                          <span className='font-medium text-gray-600'>Source:</span>{' '}
                          <span className='text-gray-900'>{source}</span>
                        </div>
                        <div>
                          <span className='font-medium text-gray-600'>Target:</span>{' '}
                          <span className='text-gray-900'>{target}</span>
                        </div>
                        {Object.entries(edgeAttr)
                          .filter(
                            ([key, val]) =>
                              ![
                                'color',
                                'altColor',
                                'hidden',
                                'forceLabel',
                                'size',
                                'type',
                                'zIndex',
                                'curvature',
                                'undirected',
                                'parallelIndex',
                                'parallelMinIndex',
                                'parallelMaxIndex',
                              ].includes(key) && val !== undefined,
                          )
                          .map(([key, value]) => (
                            <div key={key}>
                              <span className='font-medium text-gray-600 capitalize'>
                                {key.replace(/([A-Z])/g, ' $1').trim()}:
                              </span>{' '}
                              <span className='text-gray-900'>
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    );
  }

  if (type === 'edge' && edgeData) {
    const { source, target, sourceAttributes, targetAttributes, edgeAttributes } = edgeData;

    return (
      <div className='absolute top-4 right-4 z-20 max-h-[85vh] w-[500px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl'>
        <div className='flex items-center justify-between border-b bg-gray-50 px-4 py-3'>
          <h2 className='font-semibold text-gray-900 text-lg'>Edge Details</h2>
          <Button size='icon' variant='ghost' onClick={onClose} className='size-7'>
            <X className='size-4' />
          </Button>
        </div>

        <Tabs defaultValue='edge' className='flex h-full flex-col'>
          <TabsList className='grid w-full grid-cols-3 rounded-none border-b'>
            <TabsTrigger value='source'>Source Node</TabsTrigger>
            <TabsTrigger value='edge'>Edge Properties</TabsTrigger>
            <TabsTrigger value='target'>Target Node</TabsTrigger>
          </TabsList>

          <div className='overflow-y-auto' style={{ maxHeight: 'calc(85vh - 120px)' }}>
            <TabsContent value='source' className='m-0 p-4'>
              <div className='space-y-3'>
                <div>
                  <h3 className='font-semibold text-gray-700 text-sm'>Node ID</h3>
                  <p className='text-gray-900 text-sm'>{source}</p>
                </div>

                {Object.entries(sourceAttributes)
                  .filter(
                    ([key, val]) =>
                      ![
                        'x',
                        'y',
                        'ID',
                        'size',
                        'color',
                        'highlighted',
                        'hidden',
                        'type',
                        'zIndex',
                        'forceLabel',
                        'originalLabel',
                      ].includes(key) && val !== undefined,
                  )
                  .map(([key, value]) => (
                    <div key={key}>
                      <h3 className='font-semibold text-gray-700 text-sm capitalize'>
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </h3>
                      <p className='wrap-break-word text-gray-900 text-sm'>
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </p>
                    </div>
                  ))}
              </div>
            </TabsContent>

            <TabsContent value='edge' className='m-0 p-4'>
              <div className='space-y-3'>
                <div>
                  <h3 className='font-semibold text-gray-700 text-sm'>Connection</h3>
                  <p className='text-gray-900 text-sm'>
                    {source} → {target}
                  </p>
                </div>

                {Object.entries(edgeAttributes)
                  .filter(
                    ([key]) =>
                      ![
                        'color',
                        'altColor',
                        'hidden',
                        'forceLabel',
                        'size',
                        'type',
                        'zIndex',
                        'curvature',
                        'undirected',
                        'parallelIndex',
                        'parallelMinIndex',
                        'parallelMaxIndex',
                      ].includes(key),
                  )
                  .map(([key, value]) => (
                    <div key={key}>
                      <h3 className='font-semibold text-gray-700 text-sm capitalize'>
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </h3>
                      <p className='wrap-break-word text-gray-900 text-sm'>
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </p>
                    </div>
                  ))}
              </div>
            </TabsContent>

            <TabsContent value='target' className='m-0 p-4'>
              <div className='space-y-3'>
                <div>
                  <h3 className='font-semibold text-gray-700 text-sm'>Node ID</h3>
                  <p className='text-gray-900 text-sm'>{target}</p>
                </div>

                {Object.entries(targetAttributes)
                  .filter(
                    ([key, val]) =>
                      ![
                        'x',
                        'y',
                        'ID',
                        'size',
                        'color',
                        'highlighted',
                        'hidden',
                        'type',
                        'zIndex',
                        'forceLabel',
                        'originalLabel',
                      ].includes(key) && val !== undefined,
                  )
                  .map(([key, value]) => (
                    <div key={key}>
                      <h3 className='font-semibold text-gray-700 text-sm capitalize'>
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </h3>
                      <p className='wrap-break-word text-gray-900 text-sm'>
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </p>
                    </div>
                  ))}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    );
  }

  return null;
}
