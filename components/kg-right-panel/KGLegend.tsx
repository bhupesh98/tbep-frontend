'use client';

import { ChevronsUpDownIcon } from 'lucide-react';
import { PROPERTY_TYPE_LABEL_MAPPING } from '@/lib/data';
import { useKGStore, useStore } from '@/lib/hooks';
import { P_VALUE_REGEX } from '@/lib/utils';
import { BinaryLegend, HeatmapLegend, NodeTypeLegend } from '../legends';
import { Button } from '../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';

/**
 * KGLegend - Display color/size legends for node properties
 * Supports both Gene properties and custom KG node properties
 */
export function KGLegend() {
  const selectedRadioNodeColor = useStore(state => state.selectedRadioNodeColor);
  const selectedNodeColorProperty = useKGStore(state => state.selectedNodeColorProperty);
  const showEdgeColor = useKGStore(state => state.showEdgeColor);

  return (
    <div className='mb-2'>
      <Collapsible defaultOpen className='rounded border p-2 text-xs shadow-sm'>
        <div className='flex w-full items-center justify-between'>
          <p className='font-bold'>Legends</p>
          <CollapsibleTrigger asChild>
            <Button type='button' variant='outline' size='icon' className='size-6'>
              <ChevronsUpDownIcon size={15} />
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className='flex flex-col gap-2 p-1'>
          {/* Node Type Legend */}
          <NodeTypeLegend />

          <hr className='my-1' />

          {/* Property Legends */}
          <div className='flex flex-col items-center gap-2'>
            {selectedRadioNodeColor ? (
              selectedRadioNodeColor === 'Pathway' ? (
                <BinaryLegend />
              ) : selectedRadioNodeColor === 'DEG' ? (
                P_VALUE_REGEX.test(selectedNodeColorProperty) ? (
                  <HeatmapLegend
                    title='P-Value'
                    range={['green', 'red']}
                    startLabel='Low Significance'
                    endLabel='High Significance'
                  />
                ) : (
                  <HeatmapLegend
                    title={PROPERTY_TYPE_LABEL_MAPPING[selectedRadioNodeColor]}
                    domain={[-1, 0, 1]}
                    range={['green', '#E2E2E2', 'red']}
                    divisions={10}
                  />
                )
              ) : selectedRadioNodeColor === 'Druggability' || selectedRadioNodeColor === 'OpenTargets' ? (
                <HeatmapLegend
                  title={PROPERTY_TYPE_LABEL_MAPPING[selectedRadioNodeColor]}
                  domain={[0, 1]}
                  range={['green', 'red']}
                  divisions={10}
                />
              ) : selectedRadioNodeColor === 'TE' ? (
                <HeatmapLegend
                  title={PROPERTY_TYPE_LABEL_MAPPING[selectedRadioNodeColor]}
                  range={['green', 'red']}
                  startLabel='Low'
                  endLabel='High'
                />
              ) : selectedRadioNodeColor === 'OT_Prioritization' ? (
                <HeatmapLegend
                  title={PROPERTY_TYPE_LABEL_MAPPING[selectedRadioNodeColor]}
                  domain={[-1, 0, 1]}
                  range={['red', '#F0C584', 'green']}
                  divisions={10}
                />
              ) : selectedRadioNodeColor === 'Custom_Color' ? (
                <p className='text-center font-semibold'>Custom colors from uploaded file</p>
              ) : selectedNodeColorProperty ? (
                <HeatmapLegend
                  title={`Color: ${selectedNodeColorProperty}`}
                  range={['#3b82f6', 'red']}
                  startLabel='Low'
                  endLabel='High'
                />
              ) : (
                <p className='text-center font-semibold'>No Legends Available</p>
              )
            ) : (
              <p className='text-center font-semibold'>Select Data-points on left to view legends!</p>
            )}
            {showEdgeColor && (
              <div className='w-full border-t pt-2'>
                <HeatmapLegend
                  title='Edge Color'
                  range={['yellow', 'red']}
                  domain={[0, 1]}
                  divisions={10}
                  height={40}
                />
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
