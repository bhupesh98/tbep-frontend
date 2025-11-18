'use client';

import { ChatWindow } from '@/components/chat';
import { Spinner } from '@/components/ui/spinner';
import '@react-sigma/core/lib/style.css';
import dynamic from 'next/dynamic';

const KGGraphSigmaContainer = dynamic(
  () => import('@/components/knowledge-graph').then(module => module.KGGraphSigmaContainer),
  {
    loading: () => (
      <div className='grid h-full w-full place-items-center'>
        <div className='flex flex-col items-center'>
          <Spinner />
          <p className='mt-2 text-gray-600 text-sm'>Initializing knowledge graph...</p>
        </div>
      </div>
    ),
    ssr: false,
  },
);

export default function KnowledgeGraphPage() {
  return (
    <>
      <div className='h-[87%]'>
        <KGGraphSigmaContainer />
      </div>
      <ChatWindow />
    </>
  );
}
