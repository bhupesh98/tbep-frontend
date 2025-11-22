'use client';

import type EventEmitter from 'events';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { FADED_NODE_COLOR, generateTypeColorMap } from '@/lib/graph/knowledge-graph-renderer';
import { useKGStore } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

interface NodeTypeInfo {
  type: string;
  color: string;
  total: number;
  hidden: boolean;
}

/**
 * NodeTypeLegend - Always visible legend showing node types with:
 * - Color indicator (with border effect when property applied)
 * - Type name
 * - Visible/Total count
 * - Hide/Show toggle
 * - Color picker
 */
export function NodeTypeLegend() {
  const sigmaInstance = useKGStore(state => state.sigmaInstance);
  const activePropertyNodeTypes = useKGStore(state => state.activePropertyNodeTypes);
  const [nodeTypes, setNodeTypes] = useState<NodeTypeInfo[]>([]);
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  const hiddenTypesRef = useRef(hiddenTypes);

  // Keep ref in sync with state
  useEffect(() => {
    hiddenTypesRef.current = hiddenTypes;
  }, [hiddenTypes]);

  // Update node type information when graph changes
  useEffect(() => {
    if (!sigmaInstance) return;
    const graph = sigmaInstance.getGraph();
    (sigmaInstance as EventEmitter).once('loaded', () => {
      // Generate color map
      const typeColorMap = generateTypeColorMap(graph);

      // Count nodes by type
      const typeCountMap = new Map<string, number>();
      graph.forEachNode((_node, attr) => {
        const nodeType = (attr.nodeType as string) || 'Unknown';
        const current = typeCountMap.get(nodeType) || 0;
        typeCountMap.set(nodeType, current + 1);
      });

      // Convert to array and sort by total count (descending)
      const typesArray = Array.from(typeCountMap.entries())
        .map(([type, total]) => ({
          type,
          color: typeColorMap.get(type) || '#6b7280',
          total,
          hidden: hiddenTypesRef.current.has(type),
        }))
        .sort((a, b) => b.total - a.total);

      setNodeTypes(typesArray);
    });
  }, [sigmaInstance]);

  const toggleTypeVisibility = (nodeType: string) => {
    const graph = sigmaInstance?.getGraph();
    if (!graph) return;
    const newHiddenTypes = new Set(hiddenTypes);

    if (hiddenTypes.has(nodeType)) {
      // Show nodes of this type
      newHiddenTypes.delete(nodeType);
      graph.updateEachNodeAttributes((_node, attr) => {
        if ((attr.nodeType as string) === nodeType) {
          attr.hidden = false;
        }
        return attr;
      });
    } else {
      // Hide nodes of this type
      newHiddenTypes.add(nodeType);
      graph.updateEachNodeAttributes((_node, attr) => {
        if ((attr.nodeType as string) === nodeType) {
          attr.hidden = true;
        }
        return attr;
      });
    }

    setHiddenTypes(newHiddenTypes);
    // Update nodeTypes state to reflect visibility change
    setNodeTypes(prev => prev.map(t => (t.type === nodeType ? { ...t, hidden: newHiddenTypes.has(nodeType) } : t)));
    sigmaInstance?.refresh();
  };

  const changeTypeColor = (nodeType: string, newColor: string) => {
    const graph = sigmaInstance?.getGraph();
    if (!graph) return;
    graph.forEachNode((_node, attr) => {
      if ((attr.nodeType as string) === nodeType && !attr.hidden) {
        graph.setNodeAttribute(_node, 'color', newColor);
      }
    });

    // Update local state
    setNodeTypes(prev => prev.map(t => (t.type === nodeType ? { ...t, color: newColor } : t)));
    sigmaInstance?.refresh();
  };

  // Determine if this type should show border + fade effect

  if (nodeTypes.length === 0) {
    return (
      <div className='space-y-1'>
        <p className='font-semibold text-[10px] text-gray-600 uppercase'>Node Types</p>
        <p className='text-[11px] text-gray-500'>Loading...</p>
      </div>
    );
  }
  return (
    <div className='space-y-1'>
      <p className='font-semibold text-[10px] text-gray-600 uppercase'>Node Types</p>
      <div className='space-y-0.5'>
        {nodeTypes.map(({ type, color, total, hidden }) => {
          const hasBorderEffect = activePropertyNodeTypes.length !== 0 && !activePropertyNodeTypes.includes(type);

          return (
            <div
              key={type}
              className={cn(
                'flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] transition-colors',
                hidden && 'opacity-50',
              )}
            >
              {/* Color indicator with ColorPicker popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type='button'
                    className='relative flex size-4 shrink-0 items-center justify-center rounded-sm ring-1 ring-gray-300 transition-all hover:ring-2 hover:ring-gray-400'
                    style={{
                      backgroundColor: hasBorderEffect ? FADED_NODE_COLOR : color,
                    }}
                  >
                    {hasBorderEffect && (
                      <div
                        className='absolute inset-0 rounded-sm'
                        style={{
                          border: `2px solid ${color}`,
                        }}
                      />
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className='w-36 md:w-64' align='end'>
                  <div className='flex flex-wrap gap-1'>
                    {[
                      'black',
                      'hotpink',
                      'orange',
                      'yellow',
                      'limegreen',
                      'aquamarine',
                      'skyblue',
                      'darkorchid',
                      'blue',
                    ].map(presetColor => (
                      <button
                        type='button'
                        key={presetColor}
                        style={{ background: presetColor }}
                        onClick={() => changeTypeColor(type, presetColor)}
                        className='size-6 cursor-pointer rounded-md hover:scale-105'
                      />
                    ))}
                  </div>
                  <Input
                    value={color}
                    className='col-span-2 mt-4 h-8'
                    onChange={e => changeTypeColor(type, e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        changeTypeColor(type, e.currentTarget.value);
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>

              {/* Type name */}
              <span className='min-w-0 flex-1 truncate font-medium' title={type}>
                {type}
              </span>

              {/* Count */}
              <span className='shrink-0 text-[10px] text-gray-500'>{total}</span>

              {/* Visibility toggle */}
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='size-5 shrink-0'
                onClick={() => toggleTypeVisibility(type)}
              >
                {hidden ? <EyeOffIcon className='size-3' /> : <EyeIcon className='size-3' />}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
