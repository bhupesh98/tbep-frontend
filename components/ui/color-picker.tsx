'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Paintbrush } from 'lucide-react';
import React from 'react';

export function ColorPicker({
  color,
  className,
}: {
  color: string;
  className?: string;
}) {
  const solids = ['black', '#ff75c3', '#ffa647', '#ffe83f', '#9fff5b', '#70e2ff', '#cd93ff', 'red', 'blue'];

  const handleNodeColorChange = (e: React.KeyboardEvent<HTMLInputElement> | string) => {
    if (typeof e === 'string') {
      useStore.setState({ defaultNodeColor: e });
    } else if (e.key === 'Enter') {
      useStore.setState({ defaultNodeColor: e.currentTarget.value });
    }
  };

  const [inputValue, setInputValue] = React.useState<string>(color);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn('w-[220px] justify-start text-left font-normal', !color && 'text-muted-foreground', className)}
        >
          <div className='w-full flex items-center gap-2'>
            {color ? (
              // biome-ignore lint/style/useSelfClosingElements: <explanation>
              <div className='h-4 w-4 rounded !bg-center !bg-cover transition-all' style={{ background: color }}></div>
            ) : (
              <Paintbrush className='h-4 w-4' />
            )}
            <div className='truncate flex-1'>{color ? color : 'Pick a color'}</div>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-36 md:w-64' align='end'>
        <div className='flex flex-wrap'>
          {solids.map(s => (
            // biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
            <div
              key={s}
              style={{ background: s }}
              onClick={e => handleNodeColorChange(s)}
              className='rounded-md h-6 w-6 cursor-pointer hover:scale-105'
            />
          ))}
        </div>

        <Input
          id='custom'
          value={inputValue}
          className='col-span-2 h-8 mt-4'
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => handleNodeColorChange(e)}
        />
      </PopoverContent>
    </Popover>
  );
}
