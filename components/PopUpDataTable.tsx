import type { PopUpDataTableProps } from '@/lib/interface';
import { cn } from '@/lib/utils';
import { Download } from 'lucide-react';
import { unparse } from 'papaparse';
import { Button } from './ui/button';
import { DataTable } from './ui/data-table';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTitle } from './ui/dialog';
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
}: PopUpDataTableProps<E, F>) {
  /**
   * Function to download the selected genes data as a CSV file
   */
  const handleDownload = (fileName?: string) => {
    const csv = unparse<E | F>(data[tabsTitle?.indexOf(fileName ?? tabsTitle[0]) ?? 0]);
    const element = document.createElement('a');
    const file = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    if (fileName) element.download = `${fileName}.csv`;
    document.body.appendChild(element);
    element.click();
    URL.revokeObjectURL(element.href);
    element.remove();
  };

  return (
    <Dialog open={open}>
      <DialogContent className='max-w-7xl max-h-[90vh] min-h-[60vh] flex flex-col'>
        <DialogTitle>{dialogTitle}</DialogTitle>
        <div className='flex-grow overflow-y-scroll'>
          <Tabs defaultValue={tabsTitle![0]}>
            <TabsList className={cn('w-full grid', `grid-cols-${tabsTitle!.length}`)}>
              {tabsTitle!.map(title => (
                <TabsTrigger key={title} value={title}>
                  {title}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent key={tabsTitle![0]} value={tabsTitle![0]}>
              <DataTable data={data[0]} columns={columns[0]} filterColumnName={filterColumnNames[0]} />
            </TabsContent>
            <TabsContent key={tabsTitle![1]} value={tabsTitle![1]}>
              <DataTable data={data[1]} columns={columns[1]} filterColumnName={filterColumnNames[1]} />
            </TabsContent>
          </Tabs>
        </div>
        <DialogFooter className='gap-2 w-full'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size={'icon'} variant={'outline'}>
                <Download size={20} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {tabsTitle!.map(title => (
                <DropdownMenuItem key={title} onClick={() => handleDownload(title)}>
                  {title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DialogClose asChild>
            <Button type='button' variant={'secondary'} onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
