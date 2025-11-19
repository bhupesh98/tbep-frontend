'use client';

import { LassoSelectIcon, MousePointer2Icon, SquareDashedMousePointerIcon } from 'lucide-react';
import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { SelectionPluginHandle } from '@/lib/plugins/react-sigma-selection';

interface KGSelectionToolbarProps {
  selectionPluginRef: React.RefObject<SelectionPluginHandle | null>;
}

type SelectionMode = 'individual' | 'box' | 'lasso';

export function KGSelectionToolbar({ selectionPluginRef }: KGSelectionToolbarProps) {
  const [mode, setMode] = React.useState<SelectionMode>('individual');

  const handleValueChange = (value: SelectionMode) => {
    if (!value) return; // Prevent deselection
    setMode(value);

    switch (value) {
      case 'individual':
        selectionPluginRef.current?.deactivate();
        break;
      case 'box':
        selectionPluginRef.current?.activateBoxSelection();
        break;
      case 'lasso':
        selectionPluginRef.current?.activateLassoSelection();
        break;
    }
  };

  return (
    <ToggleGroup type='single' value={mode} onValueChange={handleValueChange} className='p-2' direction='vertical'>
      <ToggleGroupItem value='individual' aria-label='Individual Selection' className='size-9'>
        <MousePointer2Icon className='size-4' />
      </ToggleGroupItem>

      <ToggleGroupItem value='box' aria-label='Box Selection' className='size-9'>
        <SquareDashedMousePointerIcon className='size-4' />
      </ToggleGroupItem>

      <ToggleGroupItem value='lasso' aria-label='Lasso Selection' className='size-9'>
        <LassoSelectIcon className='size-4' />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
