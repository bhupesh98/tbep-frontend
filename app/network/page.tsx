'use client';

import { Spinner } from '@/components/ui/spinner';
import '@react-sigma/core/lib/react-sigma.min.css';
import { ChatWindow } from '@/components/chat';
import { LeftSideBar } from '@/components/left-panel';
import { RightSideBar } from '@/components/right-panel';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import dynamic from 'next/dynamic';
const SigmaContainer = dynamic(() => import('@/components/graph').then(module => module.SigmaContainer), {
  loading: () => (
    <div className='w-full h-full grid place-items-center'>
      <div className='flex flex-col items-center'>
        <Spinner />
        Loading...
      </div>
    </div>
  ),
  ssr: false,
});

export default function NetworkPage() {
  return (
    <ResizablePanelGroup direction='horizontal' className='flex flex-1'>
      <ResizablePanel defaultSize={16} minSize={16}>
        <LeftSideBar />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={68} className='h-full bg-white'>
        <div className='h-[90%]'>
          <SigmaContainer />
        </div>
        <ChatWindow />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={16} minSize={16}>
        <RightSideBar />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
