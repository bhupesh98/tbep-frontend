'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Chat } from '@/components/chat';
import { KnowledgeGraphTab, SearchTab, UploadTab } from '@/components/explore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function ExploreContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') ?? undefined;
  const defaultTab = ['search', 'upload', 'knowledge-graph'].includes(tabParam ?? '') ? tabParam : 'search';

  return (
    <div className='relative mx-auto min-h-[60vh] max-w-7xl'>
      <Tabs defaultValue={defaultTab}>
        <TabsList className='grid h-auto w-full grid-cols-1 gap-2 border border-teal-100 bg-white p-2 shadow-xs sm:grid-cols-3 sm:gap-0 sm:p-0'>
          <TabsTrigger
            value='search'
            className='min-h-[70px] w-full justify-start rounded-md p-3 text-left text-teal-900 data-[state=active]:bg-secondary data-[state=active]:text-white sm:min-h-20 sm:p-4'
          >
            <div className='flex w-full flex-col items-start'>
              <span className='bg-linear-to-r from-emerald-500 via-teal-600 to-cyan-600 bg-clip-text font-semibold text-sm text-transparent leading-tight sm:text-base lg:text-lg'>
                Search by Multiple Genes
              </span>
              <span className='mt-1 text-wrap text-slate-600 text-xs leading-tight md:text-sm'>
                Paste genes/ENSG IDs and verify before building a network
              </span>
            </div>
          </TabsTrigger>
          <TabsTrigger
            value='upload'
            className='min-h-[70px] w-full justify-start rounded-md p-3 text-left text-teal-900 data-[state=active]:bg-secondary data-[state=active]:text-white sm:min-h-20 sm:p-4'
          >
            <div className='flex w-full flex-col items-start'>
              <span className='bg-linear-to-r from-emerald-500 via-teal-600 to-cyan-600 bg-clip-text font-semibold text-sm text-transparent leading-tight sm:text-base lg:text-lg'>
                Build your own Network (ByoN)
              </span>
              <span className='mt-1 text-wrap text-slate-600 text-xs leading-tight md:text-sm'>
                Upload CSV/JSON to create a custom interaction network
              </span>
            </div>
          </TabsTrigger>
          <TabsTrigger
            value='knowledge-graph'
            className='min-h-[70px] w-full justify-start rounded-md p-3 text-left text-teal-900 data-[state=active]:bg-secondary data-[state=active]:text-white sm:min-h-20 sm:p-4'
          >
            <div className='flex w-full flex-col items-start'>
              <span className='bg-linear-to-r from-emerald-500 via-teal-600 to-cyan-600 bg-clip-text font-semibold text-sm text-transparent leading-tight sm:text-base lg:text-lg'>
                Knowledge Graph Explorer
              </span>
              <span className='mt-1 text-wrap text-slate-600 text-xs leading-tight md:text-sm'>
                Upload CSV to visualize and explore knowledge graphs
              </span>
            </div>
          </TabsTrigger>
        </TabsList>
        <TabsContent value='search' className='mt-4'>
          <SearchTab />
        </TabsContent>
        <TabsContent value='upload' className='mt-4'>
          <UploadTab />
        </TabsContent>
        <TabsContent value='knowledge-graph' className='mt-4'>
          <KnowledgeGraphTab />
        </TabsContent>
      </Tabs>
      <Chat />
    </div>
  );
}

export default function Explore() {
  return (
    <Suspense fallback={<div className='relative mx-auto min-h-[60vh] max-w-7xl' />}>
      <ExploreContent />
    </Suspense>
  );
}
