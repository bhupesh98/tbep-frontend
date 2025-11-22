'use client';

import { ChevronLeft, ChevronRight, FileTextIcon, HomeIcon } from 'lucide-react';
import Link from 'next/link';
import React, { Suspense } from 'react';
import { FileName } from '@/components/app';
import { LeftSideBar } from '@/components/left-panel';
import { RightSideBar } from '@/components/right-panel';
import { OpenTargetsHeatmap, StatisticsTab } from '@/components/statistics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export default function NetworkLayoutPage({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = React.useState<'Network' | 'Statistics' | 'Heatmap'>('Network');
  const [leftSidebar, setLeftSidebar] = React.useState<boolean>(true);
  const [rightSidebar, setRightSidebar] = React.useState<boolean>(true);

  React.useEffect(() => {
    if (activeTab === 'Network') {
      window.dispatchEvent(new Event('resize'));
    }
  }, [activeTab]);

  return (
    <Tabs
      value={activeTab}
      onValueChange={value => setActiveTab(value as 'Network' | 'Statistics' | 'Heatmap')}
      className='flex h-screen flex-col bg-gray-100'
    >
      <div className='flex h-8 justify-between bg-muted px-4'>
        <Button variant='hover' size='icon' className='h-full' onClick={() => setLeftSidebar(!leftSidebar)}>
          {leftSidebar ? <ChevronLeft className='size-4' /> : <ChevronRight className='size-4' />}
        </Button>
        <Suspense fallback={<Input className='h-8 max-w-fit font-semibold text-sm' defaultValue='Untitled' />}>
          <FileName />
        </Suspense>
        <TabsList className='flex h-8 w-1/2 items-center gap-4'>
          <TabsTrigger className='w-full' value='Network'>
            Network Visualization
          </TabsTrigger>
          <TabsTrigger className='w-full' value='Statistics'>
            Graph Statistics
          </TabsTrigger>
          <TabsTrigger className='w-full' value='Heatmap'>
            OpenTargets Heatmap
          </TabsTrigger>
        </TabsList>
        <div className='flex items-center gap-4'>
          <Link
            href={'/'}
            className='hidden h-full items-center rounded-sm border-none p-2 text-xs transition-colors hover:bg-opacity-20 hover:text-black hover:underline md:inline-flex'
          >
            <HomeIcon className='mr-1 inline size-3' /> Home
          </Link>
          <Link
            href={'/docs'}
            target='_blank'
            className='hidden h-full items-center rounded-sm border-none p-2 text-xs transition-colors hover:bg-opacity-20 hover:text-black hover:underline md:inline-flex'
          >
            <FileTextIcon className='mr-1 inline size-3' /> Docs
          </Link>
        </div>
        <Button variant='hover' size='icon' className='h-full' onClick={() => setRightSidebar(!rightSidebar)}>
          {rightSidebar ? <ChevronRight className='size-4' /> : <ChevronLeft className='size-4' />}
        </Button>
      </div>
      <ResizablePanelGroup direction='horizontal' className='flex flex-1'>
        <ResizablePanel defaultSize={16} minSize={16} className={leftSidebar ? 'block' : 'hidden'}>
          <LeftSideBar />
        </ResizablePanel>
        <ResizableHandle withHandle className={leftSidebar ? 'flex' : 'hidden'} />
        <ResizablePanel defaultSize={68} className='h-full bg-white'>
          <TabsContent
            forceMount
            value='Network'
            className={cn('mt-0 h-full', activeTab === 'Network' ? 'visible' : 'invisible fixed')}
          >
            {children}
          </TabsContent>
          <TabsContent value='Statistics' className='mt-0 h-full'>
            <ScrollArea className='h-full'>
              <StatisticsTab />
            </ScrollArea>
          </TabsContent>
          <TabsContent value='Heatmap' className='mt-0 h-full'>
            <ScrollArea className='h-full'>
              <OpenTargetsHeatmap />
            </ScrollArea>
          </TabsContent>
        </ResizablePanel>
        <ResizableHandle withHandle className={rightSidebar ? 'flex' : 'hidden'} />
        <ResizablePanel defaultSize={16} minSize={16} className={rightSidebar ? 'block' : 'hidden'}>
          <RightSideBar />
        </ResizablePanel>
      </ResizablePanelGroup>
    </Tabs>
  );
}
