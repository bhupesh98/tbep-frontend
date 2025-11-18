import { DownloadIcon } from 'lucide-react';
import { unparse } from 'papaparse';
import React from 'react';
import { useStore } from '@/lib/hooks';
import type { PopUpDataTableProps } from '@/lib/interface';
import { cn, downloadFile } from '@/lib/utils';
import { Button } from './ui/button';
import { DataTable } from './ui/data-table';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from './ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

export default function PopUpDataTable<E, F>({
  dialogTitle = '',
  data,
  columns,
  open = false,
  setOpen,
  filterColumnNames,
  tabsTitle,
  loading,
  description,
}: PopUpDataTableProps<E, F>) {
  /**
   * Function to download the selected genes data as a CSV file
   */
  const handleDownload = (fileName?: string) => {
    const projectTitle = useStore.getState().projectTitle;
    const csv = unparse<E | F>(data[tabsTitle?.indexOf(fileName ?? tabsTitle[0]) ?? 0]);
    downloadFile(csv, `${projectTitle === 'Untitled' ? '' : `${projectTitle}_`}${fileName}.csv`);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: I won't write reason
  React.useEffect(() => {
    // esc key to close the dialog
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Dialog open={open}>
      <DialogContent
        aria-describedby='dialog-description'
        className='flex max-h-[90vh] min-h-[60vh] max-w-7xl flex-col'
      >
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <div className='grow overflow-y-scroll'>
          <Tabs defaultValue={tabsTitle?.[0]}>
            <TabsList className={cn('grid w-full', `grid-cols-${tabsTitle?.length}`)}>
              {tabsTitle?.map(title => (
                <TabsTrigger key={title} value={title}>
                  {title}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent key={tabsTitle?.[0]} value={tabsTitle![0]}>
              <DataTable
                data={data[0]}
                loading={loading?.[0]}
                columns={columns[0]}
                filterColumnName={filterColumnNames?.[0]}
              />
            </TabsContent>
            <TabsContent key={tabsTitle?.[1]} value={tabsTitle![1]}>
              <DataTable
                data={data[1]}
                loading={loading?.[1]}
                columns={columns[1]}
                filterColumnName={filterColumnNames?.[1]}
              />
            </TabsContent>
          </Tabs>
        </div>
        <DialogFooter className='w-full gap-2'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size={'icon'} variant={'outline'}>
                <DownloadIcon size={20} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {tabsTitle?.map(title => (
                <DropdownMenuItem key={title} onClick={() => handleDownload(title)}>
                  {title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DialogClose asChild>
            <Button type='button' variant={'secondary'} onClick={() => setOpen(false)}>
              Close (Esc)
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
