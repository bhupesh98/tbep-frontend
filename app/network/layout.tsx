'use client';

import ChatWindow from '@/components/ChatWindow';
import { Export } from '@/components/Export';
import { LeftSideBar } from '@/components/left-panel';
import { RightSideBar } from '@/components/right-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useStore } from '@/lib/hooks';
import { ChevronLeft, ChevronRight, SquareDashedMousePointer } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect } from 'react';

const FileName = () => {
  const searchParams = useSearchParams();
  const projectTitle = useStore(state => state.projectTitle);

  useEffect(() => {
    const fileName = searchParams?.get('file') ?? 'Untitled';
    useStore.setState({ projectTitle: fileName });
  }, [searchParams]);

  return (
    <Input
      className='text-sm font-semibold max-w-fit'
      value={projectTitle}
      onChange={e => useStore.setState({ projectTitle: e.target.value })}
    />
  );
};

export default function NetworkLayoutPage({
  children,
}: {
  children: React.ReactNode;
}) {
  const [leftSidebar, setLeftSidebar] = React.useState<boolean>(true);
  const [rightSidebar, setRightSidebar] = React.useState<boolean>(true);
  const projectTitle = useStore(state => state.projectTitle);

  return (
    <>
      <div className='h-screen flex flex-col bg-gray-100'>
        <div className='bg-gray-200 h-8 flex items-center justify-between'>
          <Button variant='ghost' size='icon' onClick={() => setLeftSidebar(!leftSidebar)}>
            {leftSidebar ? <ChevronLeft className='h-4 w-4' /> : <ChevronRight className='h-4 w-4' />}
          </Button>
          <div className='flex gap-2 items-center'>
            <Tooltip>
              <TooltipTrigger asChild>
                <SquareDashedMousePointer className='h-4 w-4' />
              </TooltipTrigger>
              <TooltipContent align='start' className='max-w-80'>
                To select multiple genes and export details or perform GSEA analysis, use the mouse to select the genes
                <br />
                <b>
                  <i>Shortcut:</i>
                </b>{' '}
                <kbd className='border rounded-md px-1'> Shift(⇧) + Click</kbd> & Drag
              </TooltipContent>
            </Tooltip>
            <Suspense
              fallback={
                <Input
                  className='text-sm font-semibold max-w-fit'
                  value={projectTitle}
                  onChange={e => useStore.setState({ projectTitle: e.target.value })}
                />
              }
            >
              <FileName />
            </Suspense>
            <Export />
          </div>
          <Button variant='ghost' size='icon' onClick={() => setRightSidebar(!rightSidebar)}>
            {rightSidebar ? <ChevronRight className='h-4 w-4' /> : <ChevronLeft className='h-4 w-4' />}
          </Button>
        </div>

        <ResizablePanelGroup direction='horizontal' className='flex flex-1'>
          <ResizablePanel defaultSize={16} minSize={16} className={leftSidebar ? 'block' : 'hidden'}>
            <LeftSideBar />
          </ResizablePanel>
          <ResizableHandle withHandle className={leftSidebar ? 'flex' : 'hidden'} />
          <ResizablePanel defaultSize={68} className='bg-white h-full'>
            <div className='bg-white h-[90%]'>{children}</div>
            <ChatWindow />
          </ResizablePanel>
          <ResizableHandle withHandle className={rightSidebar ? 'flex' : 'hidden'} />
          <ResizablePanel defaultSize={16} minSize={16} className={rightSidebar ? 'block' : 'hidden'}>
            <RightSideBar />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </>
  );
}
