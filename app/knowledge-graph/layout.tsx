'use client';

import { ChevronLeft, ChevronRight, FileTextIcon, HomeIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import React from 'react';
import { KGLeftSideBar } from '@/components/kg-left-panel';
import { KGRightSideBar } from '@/components/kg-right-panel';
import { Button } from '@/components/ui/button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useKGStore } from '@/lib/hooks';
import { cn } from '@/lib/utils';

// Lazy-load statistics component only when needed
const KGStatisticsTab = dynamic(
  () => import('@/components/statistics/KGStatisticsTab').then(mod => mod.KGStatisticsTab),
  {
    loading: () => (
      <div className='grid h-full place-items-center'>
        <Spinner />
      </div>
    ),
    ssr: false,
  },
);

export default function KnowledgeGraphLayout({ children }: { children: React.ReactNode }) {
  const activeTab = useKGStore(state => state.activeTab);
  const setActiveTab = useKGStore(state => state.setActiveTab);
  const [leftSidebar, setLeftSidebar] = React.useState<boolean>(true);
  const [rightSidebar, setRightSidebar] = React.useState<boolean>(true);

  React.useEffect(() => {
    if (activeTab === 'Network') {
      window.dispatchEvent(new Event('resize'));
    }
  }, [activeTab]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className='flex h-screen flex-col bg-gray-100'>
      <div className='flex h-8 justify-between bg-muted px-4'>
        <Button variant='hover' size='icon' className='h-full' onClick={() => setLeftSidebar(!leftSidebar)}>
          {leftSidebar ? <ChevronLeft className='size-4' /> : <ChevronRight className='size-4' />}
        </Button>
        <h1 className='flex items-center font-semibold text-sm'>Knowledge Graph Visualization</h1>
        <TabsList className='flex h-8 w-1/2 items-center gap-4'>
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
          <KGLeftSideBar />
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
              <KGStatisticsTab />
            </ScrollArea>
          </TabsContent>
        </ResizablePanel>
        <ResizableHandle withHandle className={rightSidebar ? 'flex' : 'hidden'} />
        <ResizablePanel defaultSize={16} minSize={16} className={rightSidebar ? 'block' : 'hidden'}>
          <KGRightSideBar />
        </ResizablePanel>
      </ResizablePanelGroup>
    </Tabs>
  );
}
