'use client';

import { FileName } from '@/components/app';
import { StatisticsTab } from '@/components/statistics';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { FileTextIcon, HomeIcon } from 'lucide-react';
import { Link } from 'next-view-transitions';
import React from 'react';
import { Suspense } from 'react';

export default function NetworkLayoutPage({ children }: { children: React.ReactNode }) {
  const [tab, setTab] = React.useState('Network');

  return (
    <Tabs value={tab} onValueChange={setTab} className='h-screen flex flex-col bg-gray-100'>
      <div className='flex justify-between px-10 bg-muted h-8'>
        <div className='flex gap-2'>
          <Suspense fallback={<Input className='text-sm font-semibold max-w-fit h-8' value={'Untitled'} />}>
            <FileName />
          </Suspense>
        </div>
        <TabsList className='flex items-center gap-4 h-8 w-1/2'>
          <TabsTrigger className='w-full' value='Network'>
            Network Visualization
          </TabsTrigger>
          <TabsTrigger className='w-full' value='Statistics'>
            Graph Statistics
          </TabsTrigger>
        </TabsList>
        <div className='flex items-center gap-4'>
          <Link
            href={'/'}
            className='inline-flex p-2 items-center h-full transition-colors text-xs border-none rounded-sm hover:bg-opacity-20 hover:text-black hover:underline'
          >
            <HomeIcon className='h-3 w-3 mr-1' /> Home
          </Link>
          <Link
            href={'/docs'}
            className='inline-flex p-2 items-center h-full transition-colors text-xs border-none rounded-sm hover:bg-opacity-20 hover:text-black hover:underline'
          >
            <FileTextIcon className='h-3 w-3 mr-1' /> Docs
          </Link>
        </div>
      </div>
      <TabsContent
        forceMount
        value='Network'
        className={cn('h-full mt-0', tab === 'Network' ? 'visible' : 'invisible absolute')}
      >
        {children}
      </TabsContent>
      <TabsContent value='Statistics' className={'mx-auto container h-full mt-0'}>
        <StatisticsTab />
      </TabsContent>
    </Tabs>
  );
}
