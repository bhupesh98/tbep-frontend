'use client';

import { ChevronsUpDownIcon, InfoIcon } from 'lucide-react';
import { useId } from 'react';
import { forceLayoutOptions } from '@/lib/data';
import { useKGStore } from '@/lib/hooks';
import type { ForceSettings } from '@/lib/interface';
import { Button } from '../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

export function KGNetworkLayout() {
  const { start, stop } = useKGStore(state => state.forceWorker);
  const forceSettings = useKGStore(state => state.forceSettings);

  const handleGraphAnimation = (checked: boolean) => {
    checked ? start() : stop();
  };

  const updateForceSetting = (value: number[] | string, key: keyof ForceSettings) => {
    useKGStore.setState({
      forceSettings: {
        ...forceSettings,
        [key]: typeof value === 'string' ? Number.parseFloat(value) : value[0],
      },
    });
  };

  const networkAnimationControlId = useId();

  return (
    <Collapsible defaultOpen className='mb-2 rounded border p-2 shadow-sm'>
      <div className='flex w-full items-center justify-between'>
        <p className='font-bold'>Network Layout</p>
        <CollapsibleTrigger asChild>
          <Button type='button' variant='outline' size='icon' className='size-6'>
            <ChevronsUpDownIcon size={15} />
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className='flex flex-col gap-2'>
        <div className='flex items-center gap-2'>
          <Label htmlFor={networkAnimationControlId} className='font-semibold text-xs'>
            Animation
          </Label>
          <Switch id={networkAnimationControlId} defaultChecked onCheckedChange={handleGraphAnimation} />
        </div>
        {forceLayoutOptions.map(option => (
          <div key={option.key} className='flex items-center space-x-2'>
            <div className='flex w-full flex-col space-y-2'>
              <Label htmlFor={option.key} className='flex items-center gap-1 font-semibold text-xs'>
                {option.label}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon size={12} />
                  </TooltipTrigger>
                  <TooltipContent className='max-w-60' align='end'>
                    {option.tooltip}
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Slider
                id={option.key}
                className='w-full'
                min={option.min}
                max={option.max}
                step={option.step}
                value={[forceSettings[option.key]]}
                onValueChange={value => updateForceSetting(value, option.key)}
              />
            </div>
            <Input
              type='number'
              className='h-8 w-16'
              min={option.min}
              max={option.max}
              step={option.step}
              value={forceSettings[option.key]}
              onChange={e => e.target.value && updateForceSetting(e.target.value, option.key)}
            />
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
