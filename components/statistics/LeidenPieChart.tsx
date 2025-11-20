'use client';
import { XSquareIcon } from 'lucide-react';
import { useState } from 'react';
import { Cell, Pie, PieChart, type TooltipContentProps } from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import type { EventMessage, Events } from '@/lib/utils';
import { ChartContainer, ChartTooltip } from '../ui/chart';
import { ScrollArea } from '../ui/scroll-area';

const CustomTooltip = ({ active, payload }: TooltipContentProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className='rounded-md border border-gray-200 bg-white p-2 shadow-md'>
        <p className='font-bold text-primary'>{data.name}</p>
        <p>Percentage: {data.percentage}%</p>
        <p>Node Count: {data.count}</p>
        <p>Average Degree: {data.averageDegree}</p>
        <p className='mt-1 text-sm italic'>Click to view nodes</p>
      </div>
    );
  }
  return null;
};

export function LeidenPieChart({ data = [] }: { data: EventMessage[Events.ALGORITHM_RESULTS]['communities'] }) {
  const [selectedClusterIndex, setSelectedClusterIndex] = useState<number | null>(null);

  return (
    <>
      <ChartContainer
        className='aspect-square max-h-[65vh] w-[70%] [&_.recharts-pie-label-text]:fill-foreground'
        config={data.reduce<Record<string, { label: string; color: string }>>((acc, c) => {
          acc[c.name] = {
            label: c.name,
            color: c.color,
          };
          return acc;
        }, {})}
      >
        <PieChart>
          <ChartTooltip content={CustomTooltip} />
          <Pie
            data={data.map(c => ({
              name: c.name,
              count: c.nodes.length,
              percentage: +c.percentage,
              averageDegree: +c.averageDegree,
              fill: `var(--color-${c.name})`,
              nodes: c.nodes,
            }))}
            dataKey='percentage'
            nameKey='name'
            cx='50%'
            cy='50%'
            outerRadius={150}
            label={({ name, percent }) => `${name}: ${(Number(percent ?? Number.NaN) * 100).toFixed(0)}%`}
            onClick={(_, idx) => setSelectedClusterIndex(idx)}
          >
            {data.map(entry => (
              <Cell key={`cell-${entry.name}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      {selectedClusterIndex !== null && (
        <div className='fade-in slide-in-from-bottom-2 animate-in rounded border bg-white p-2 shadow-sm duration-200'>
          <div className='flex gap-2'>
            <h3 className='mb-2 font-bold'>Nodes in {data[selectedClusterIndex].name}:</h3>
            <button
              type='button'
              onClick={() => setSelectedClusterIndex(null)}
              className='flex text-gray-500 hover:text-gray-700'
            >
              <XSquareIcon size={20} />
            </button>
          </div>
          <ScrollArea className='h-[53vh] rounded border'>
            <ul className='ml-6 list-disc'>
              {data[selectedClusterIndex].nodes.map(node => (
                <li key={node}>{node}</li>
              ))}
            </ul>
          </ScrollArea>
        </div>
      )}
    </>
  );
}
