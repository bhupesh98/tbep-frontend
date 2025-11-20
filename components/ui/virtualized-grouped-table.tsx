'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowRightIcon, ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import React from 'react';
import { Input } from './input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

export interface GroupedRow {
  metapath: string;
  metapathTypes: string[]; // Array of node types for visualization
  length: number;
  paths: Array<{
    pathNumber: number;
    weight: number;
    nodes: string;
  }>;
}

interface FlatRow {
  type: 'group' | 'path';
  groupIndex: number;
  group?: GroupedRow;
  path?: {
    pathNumber: number;
    weight: number;
    nodes: string;
  };
}

interface VirtualizedGroupedTableProps {
  groups: GroupedRow[];
  filterValue: string;
  onFilterChange: (value: string) => void;
  placeholder?: string;
  typeColorMap: Map<string, string>;
}

export function VirtualizedGroupedTable({
  groups,
  filterValue,
  onFilterChange,
  placeholder = 'Search by node',
  typeColorMap,
}: VirtualizedGroupedTableProps) {
  const [expandedGroups, setExpandedGroups] = React.useState<Set<number>>(new Set());
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Filter groups and their paths
  const filteredGroups = React.useMemo(() => {
    if (!filterValue) return groups;

    const searchLower = filterValue.toLowerCase();
    return groups
      .map(group => ({
        ...group,
        paths: group.paths.filter(path => path.nodes.toLowerCase().includes(searchLower)),
      }))
      .filter(group => group.paths.length > 0);
  }, [groups, filterValue]);

  // Build flat list of rows for virtualization
  const flatRows = React.useMemo(() => {
    const rows: FlatRow[] = [];

    filteredGroups.forEach((group, groupIndex) => {
      rows.push({ type: 'group', groupIndex, group });

      if (expandedGroups.has(groupIndex)) {
        group.paths.forEach(path => {
          rows.push({ type: 'path', groupIndex, path });
        });
      }
    });

    return rows;
  }, [filteredGroups, expandedGroups]);

  // Define columns for @tanstack/react-table
  const columns = React.useMemo<ColumnDef<FlatRow>[]>(
    () => [
      {
        id: 'expander',
        header: () => null,
        cell: ({ row }) => {
          if (row.original.type === 'group') {
            const isExpanded = expandedGroups.has(row.original.groupIndex);
            return isExpanded ? <ChevronDownIcon className='size-4' /> : <ChevronRightIcon className='size-4' />;
          }
          return null;
        },
        size: 48,
      },
      {
        id: 'pathNumber',
        header: () => <div>Path #</div>,
        cell: ({ row }) => {
          if (row.original.type === 'path') {
            return <div className='text-center'>{row.original.path!.pathNumber}</div>;
          }
          return null;
        },
        size: 96,
      },
      {
        id: 'weight',
        header: () => <div>Weight</div>,
        cell: ({ row }) => {
          if (row.original.type === 'path') {
            return <div className='text-center font-medium'>{row.original.path!.weight.toFixed(4)}</div>;
          }
          return null;
        },
        size: 128,
      },
      {
        id: 'nodes',
        header: () => <div>Nodes</div>,
        cell: ({ row }) => {
          if (row.original.type === 'group') {
            const group = row.original.group!;
            return (
              <div className='grid grid-cols-[200px_1fr] items-center gap-4'>
                <div className='flex items-center gap-2'>
                  <span className='text-sm'>Length: {group.length + 7}</span>
                  <span className='text-muted-foreground'>|</span>
                  <span className='text-sm'>{group.paths.length} path(s)</span>
                </div>
                <div className='flex items-center gap-2'>
                  {group.metapathTypes.map((nodeType, idx) => (
                    <React.Fragment key={`${row.original.groupIndex}-${nodeType}-${idx}`}>
                      <div className='flex items-center gap-1.5'>
                        <div
                          className='size-4 rounded-full border-2 border-gray-600'
                          style={{ backgroundColor: typeColorMap.get(nodeType) || '#6b7280' }}
                        />
                        <span className='text-sm'>{nodeType}</span>
                      </div>
                      {idx < group.metapathTypes.length - 1 && (
                        <ArrowRightIcon className='size-4 text-muted-foreground' />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          }
          return <div className='truncate'>{row.original.path!.nodes}</div>;
        },
      },
    ],
    [expandedGroups, typeColorMap],
  );

  const table = useReactTable({
    data: flatRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const { rows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 45,
    overscan: 10,
  });

  const virtualRows = virtualizer.getVirtualItems();

  const toggleGroup = (groupIndex: number) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupIndex)) {
        next.delete(groupIndex);
      } else {
        next.add(groupIndex);
      }
      return next;
    });
  };

  const totalPaths = filteredGroups.reduce((sum, g) => sum + g.paths.length, 0);

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center justify-between px-2'>
        <Input
          placeholder={placeholder}
          value={filterValue}
          onChange={e => onFilterChange(e.target.value)}
          className='max-w-sm'
        />
        <div className='flex font-semibold text-sm italic'>
          {filteredGroups.length} metapath(s) | {totalPaths} path(s)
        </div>
      </div>

      <div ref={scrollContainerRef} className='h-[65vh] overflow-y-auto rounded-md border'>
        <Table className='w-full table-fixed'>
          <TableHeader className='sticky top-0 z-10 bg-background'>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    style={{
                      width: header.id === 'nodes' ? 'auto' : `${header.column.getSize()}px`,
                    }}
                    className={header.id === 'pathNumber' || header.id === 'weight' ? 'text-center' : ''}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualRows.map(virtualRow => {
              const row = rows[virtualRow.index];
              const isGroupRow = row.original.type === 'group';

              return (
                <TableRow
                  key={row.id}
                  className={`absolute top-0 left-0 w-full ${isGroupRow ? 'cursor-pointer bg-muted/50 hover:bg-muted' : 'hover:bg-muted/30'}`}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  onClick={() => isGroupRow && toggleGroup(row.original.groupIndex)}
                >
                  {isGroupRow ? (
                    <>
                      <TableCell style={{ width: 48 }}>
                        {expandedGroups.has(row.original.groupIndex) ? (
                          <ChevronDownIcon className='size-4' />
                        ) : (
                          <ChevronRightIcon className='size-4' />
                        )}
                      </TableCell>
                      <TableCell colSpan={3} className='font-semibold'>
                        {flexRender(
                          row.getVisibleCells().find(c => c.column.id === 'nodes')!.column.columnDef.cell,
                          row
                            .getVisibleCells()
                            .find(c => c.column.id === 'nodes')!
                            .getContext(),
                        )}
                      </TableCell>
                    </>
                  ) : (
                    row.getVisibleCells().map(cell => (
                      <TableCell
                        key={cell.id}
                        style={{
                          width: cell.column.getSize(),
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
