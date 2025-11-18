'use client';

import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type Row,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import React from 'react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog';
import { Input } from './input';
import { Spinner } from './spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  filterColumnName?: string | string[];
  loading?: boolean;
  placeholder?: string;
  closeOnEscape?: boolean;
}

export function DataTable<TData>({
  columns,
  data,
  placeholder,
  filterColumnName,
  loading = false,
  closeOnEscape = true,
}: DataTableProps<TData>) {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogContent, setDialogContent] = React.useState({ title: '', content: '' });

  const handleReadMore = (title: string, content: string) => {
    setDialogContent({ title, content });
    setDialogOpen(true);
  };

  const truncateText = (text: string, maxLength = 100) => {
    if (text.length <= maxLength) return text;
    return (
      <>
        {text.slice(0, maxLength)}...
        <button
          type='button'
          onClick={() => handleReadMore('Full Content', text)}
          className='ml-1 text-primary underline hover:text-primary/80'
        >
          Read More
        </button>
      </>
    );
  };

  // Normalize filterColumns to always be an array
  const normalizedFilterColumns = React.useMemo(() => {
    if (!filterColumnName) return [];
    return Array.isArray(filterColumnName) ? filterColumnName : [filterColumnName];
  }, [filterColumnName]);

  // Custom filter function for multi-column search
  const globalFilterFn = React.useMemo(
    () => (row: Row<TData>) => {
      if (!globalFilter || normalizedFilterColumns.length === 0) return true;

      const searchValue = globalFilter.toLowerCase();

      return normalizedFilterColumns.some(columnName => {
        const cellValue = row.getValue(columnName);
        if (cellValue == null) return false;
        return String(cellValue).toLowerCase().includes(searchValue);
      });
    },
    [globalFilter, normalizedFilterColumns],
  );

  const table = useReactTable({
    data,
    columns,
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn,
    state: {
      columnFilters,
      sorting,
      globalFilter,
    },
  });

  return (
    <div>
      <div className={cn('flex items-center p-2 py-4', filterColumnName ? 'justify-between' : 'justify-end')}>
        {filterColumnName && (
          <Input
            placeholder={
              placeholder ??
              `Filter by ${Array.isArray(filterColumnName) ? filterColumnName.join(', ').replace(/_/g, ' ') : filterColumnName.replace('_', ' ')}`
            }
            value={globalFilter}
            // onChange={event => table.getColumn(filterColumnName)?.setFilterValue(event.target.value)}
            onChange={event => setGlobalFilter(event.target.value)}
            className='max-w-sm'
          />
        )}
        <div className='flex font-semibold italic'>Rows : {table.getFilteredRowModel().rows.length}</div>
      </div>
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map(cell => {
                    const renderedCell = flexRender(cell.column.columnDef.cell, cell.getContext());
                    const cellValue = cell.getValue();
                    const isLongText = typeof cellValue === 'string' && cellValue.length > 100;

                    return (
                      <TableCell style={cell.column.columnDef.meta} key={cell.id}>
                        {isLongText ? truncateText(cellValue) : renderedCell}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className='h-24 text-center'>
                  <Spinner variant={1} />
                </TableCell>
              </TableRow>
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className='h-24 text-center'>
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={closeOnEscape ? setDialogOpen : undefined}>
        <DialogContent className='max-h-[80vh] max-w-3xl overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>{dialogContent.title}</DialogTitle>
            <DialogDescription>{closeOnEscape ? 'Press Esc to close' : ''}</DialogDescription>
          </DialogHeader>
          <div className='wrap-break-word whitespace-pre-wrap'>{dialogContent.content}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
