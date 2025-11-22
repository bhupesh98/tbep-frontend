'use client';

import { Spinner } from '@/components/ui/spinner';
import '@react-sigma/core/lib/style.css';
import dynamic from 'next/dynamic';
import { ChatWindow } from '@/components/chat';

const SigmaContainer = dynamic(() => import('@/components/graph').then(module => module.SigmaContainer), {
  loading: () => (
    <div className='grid h-full w-full place-items-center'>
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
    <div className='flex h-full flex-col'>
      <div className='min-h-0 flex-1'>
        <SigmaContainer />
      </div>
      <div className='mb-2 shrink-0'>
        <ChatWindow />
      </div>
    </div>
  );
}
