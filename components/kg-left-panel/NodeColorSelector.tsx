'use client';

import { ChevronsUpDownIcon, RefreshCcwIcon } from 'lucide-react';
import React from 'react';
import { useKGStore } from '@/lib/hooks';
import { Button } from '../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

/**
 * NodeColorSelector - Select properties to color nodes with radio button categories
 */
export function NodeColorSelector({ onPropChangeAction }: { onPropChangeAction: (propertyName: string) => void }) {
  const selectedProperty = useKGStore(state => state.selectedNodeColorProperty);
  const selectedCategory = useKGStore(state => state.selectedRadioNodeColor);
  const kgPropertyOptions = useKGStore(state => state.kgPropertyOptions);

  // Group properties by target node type from kgPropertyOptions
  const groupedProperties = React.useMemo(() => {
    const groups: Record<string, string[]> = {};

    for (const [propertyName, metadata] of Object.entries(kgPropertyOptions)) {
      const nodeType = metadata.targetNodeType;
      if (!groups[nodeType]) {
        groups[nodeType] = [];
      }
      groups[nodeType].push(propertyName);
    }

    return groups;
  }, [kgPropertyOptions]);

  const categories = Object.keys(groupedProperties);

  return (
    <Collapsible defaultOpen className='my-2 rounded border p-2 shadow-sm'>
      <div className='flex w-full items-center justify-between'>
        <Label className='font-bold'>Node Color</Label>
        <div className='flex items-center space-x-1'>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() =>
                  useKGStore.setState({ selectedRadioNodeColor: undefined, selectedNodeColorProperty: '' })
                }
                type='button'
                variant='outline'
                size='icon'
                className='size-6'
              >
                <RefreshCcwIcon size={15} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Reset</p>
            </TooltipContent>
          </Tooltip>
          <CollapsibleTrigger asChild>
            <Button type='button' variant='outline' size='icon' className='size-6'>
              <ChevronsUpDownIcon size={15} />
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>
      <CollapsibleContent className='mt-2'>
        <RadioGroup
          value={selectedCategory ?? ''}
          onValueChange={value => {
            useKGStore.setState({ selectedRadioNodeColor: value, selectedNodeColorProperty: '' });
          }}
        >
          {categories.map(nodeType => (
            <div key={nodeType} className='flex items-center space-x-2'>
              <RadioGroupItem value={nodeType} id={`color-${nodeType}`} />
              <Label htmlFor={`color-${nodeType}`} className='text-xs'>
                {nodeType}
              </Label>
            </div>
          ))}
        </RadioGroup>
        {selectedCategory && groupedProperties[selectedCategory] && (
          <Select value={selectedProperty} onValueChange={onPropChangeAction} key={selectedCategory}>
            <SelectTrigger className='mt-2 w-full'>
              <SelectValue placeholder='Select property...' />
            </SelectTrigger>
            <SelectContent>
              {groupedProperties[selectedCategory].map(prop => (
                <SelectItem key={prop} value={prop}>
                  {prop}
                  {kgPropertyOptions[prop]?.source === 'file' && (
                    <span className='ml-2 text-gray-400 text-xs'>(file)</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
