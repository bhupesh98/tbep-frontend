'use client';
import { useSearchParams } from 'next/navigation';
import React, { useEffect } from 'react';
import { useStore } from '@/lib/hooks';
import { Input } from '../ui/input';

export const FileName = () => {
  const searchParams = useSearchParams();
  const projectTitle = useStore(state => state.projectTitle);

  useEffect(() => {
    const fileName = searchParams?.get('file') ?? 'Untitled';
    useStore.setState({ projectTitle: fileName });
  }, [searchParams]);

  return (
    <Input
      className='h-8 max-w-fit font-semibold text-sm'
      value={projectTitle}
      onChange={e => useStore.setState({ projectTitle: e.target.value })}
    />
  );
};

export const MouseControlMessage = ({ className }: { className?: string }) => {
  const [visible, setVisible] = React.useState(true);

  return (
    <>
      {visible && (
        // biome-ignore lint/a11y/noStaticElementInteractions: hydration error (button inside button)
        <span
          className={`absolute bottom-0.5 flex size-2.5 ${className ?? ''}`}
          onClick={() => setVisible(false)}
          onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setVisible(false)}
        >
          <span className='-left-1 -bottom-3 absolute z-50 inline-flex h-[150%] w-[150%] animate-ping rounded-full bg-sky-400 opacity-75' />
          <span className='-bottom-2 absolute inline-flex size-2.5 rounded-full bg-sky-500' />
        </span>
      )}
    </>
  );
};
