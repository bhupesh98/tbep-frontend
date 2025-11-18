'use client';

import { Label } from '@radix-ui/react-label';
import { ChevronsUpDownIcon, DownloadIcon } from 'lucide-react';
import Papa from 'papaparse';
import { useEffect, useState } from 'react';
import { algorithms, columnLeidenResults } from '@/lib/data';
import { downloadFile, type EventMessage, Events, eventEmitter } from '@/lib/utils';
import { LeidenPieChart } from '../statistics';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { DataTable } from '../ui/data-table';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import SliderWithInput from './SliderWithInput';

export function NetworkAnalysis({ children }: { children: React.ReactNode }) {
  const handleAlgoQuery = (name: string, formData?: FormData) => {
    if (formData)
      eventEmitter.emit(Events.ALGORITHM, {
        name,
        parameters: Object.fromEntries(formData.entries()) as EventMessage[Events.ALGORITHM]['parameters'],
      } satisfies EventMessage[Events.ALGORITHM]);
    else {
      eventEmitter.emit(Events.ALGORITHM, { name } satisfies EventMessage[Events.ALGORITHM]);
      setAlgorithmResults(null);
    }
  };
  const [algorithmResults, setAlgorithmResults] = useState<EventMessage[Events.ALGORITHM_RESULTS] | null>(null);

  useEffect(() => {
    eventEmitter.on(Events.ALGORITHM_RESULTS, (data: EventMessage[Events.ALGORITHM_RESULTS]) => {
      console.log(data);

      setAlgorithmResults(data);
    });
  }, []);

  const [showTable, setShowTable] = useState(false);

  const handleExport = (communities: EventMessage[Events.ALGORITHM_RESULTS]['communities']) => {
    const csv = Papa.unparse(
      communities.map(c => ({
        ...c,
        nodes: c.nodes.join(';'),
        numberOfNodes: c.nodes.length,
      })),
    );
    downloadFile(csv, 'leiden_communities.csv');
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
                  <form key={name} className='flex flex-col space-y-2' action={f => handleAlgoQuery(name, f)}>
                    {parameters.map(({ name, displayName, type, defaultValue, min, max, step }) => {
                      if (type === 'slider') {
                        return (
                          <div key={name}>
                            <Label key={name} htmlFor={name} className='font-semibold text-xs'>
                              {displayName}
                            </Label>
                            <SliderWithInput
                              min={min}
                              max={max}
                              step={step}
                              id={name}
                              defaultValue={defaultValue as number}
                            />
                          </div>
                        );
                      }
                      return (
                        <div
                          key={name}
                          style={{ gridTemplateColumns: '1fr 2fr' }}
                          className='grid w-full grid-cols-2 items-center gap-2'
                        >
                          <Label key={name} htmlFor={name} className='font-semibold text-xs'>
                            {displayName}
                          </Label>
                          <Checkbox name={name} id={name} defaultChecked={defaultValue as boolean} />
                        </div>
                      );
                    })}
                    <Button type='submit' size={'sm'} className=''>
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
            <p className='font-semibold text-sm underline'>Results:</p>
            <p>
              <b>Modularity:</b> {algorithmResults.modularity}
            </p>
            <p>
              <b>Resolution:</b> {algorithmResults.resolution}
            </p>
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
          </>
        )}
        <hr className='mb-1' />
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
