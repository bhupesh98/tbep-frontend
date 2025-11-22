'use client';

import {
  ChevronDownIcon,
  GripHorizontalIcon,
  MessageCircleIcon,
  Trash2Icon,
  TriangleAlertIcon,
  XIcon,
} from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { KGChat } from './KGChat';

/**
 * KGChatWindow Component
 * Knowledge Graph-specific chat window with resizable interface
 * Same UI as ChatWindow but uses KGChat with /kg-chat endpoint
 */
export function KGChatWindow() {
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [chatHeight, setChatHeight] = React.useState<number | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartY = React.useRef<number>(0);
  const dragStartHeight = React.useRef<number>(0);

  // const showAlert = typeof window !== 'undefined' ? localStorage.getItem('showKGChatAlert') !== 'false' : true;
  const [showAlert, setShowAlert] = React.useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('showKGChatAlert') !== 'false';
  });

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartHeight.current = chatHeight ?? window.innerHeight - 150;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;

    const deltaY = dragStartY.current - e.clientY;
    const newHeight = dragStartHeight.current + deltaY;
    const maxHeight = window.innerHeight - 200;

    if (newHeight >= 200 && newHeight <= maxHeight) {
      setChatHeight(newHeight);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <KGChat onChatOpen={setIsChatOpen}>
      {({ messages, handleDeleteMessages, renderMessages, renderPromptInput }) => (
        <div className='relative mx-auto flex w-full flex-col items-center'>
          {isChatOpen && (
            <div
              style={{ height: chatHeight ?? '70vh', maxHeight: 'calc(100vh - 200px)' }}
              className='fade-in slide-in-from-bottom-5 absolute bottom-full mb-2 flex w-[98%] animate-in flex-col overflow-hidden rounded-lg shadow-lg backdrop-blur-sm transition-opacity duration-200'
            >
              <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className='flex h-4 w-full shrink-0 cursor-ns-resize touch-none select-none items-center justify-center bg-gray-200'
              >
                <GripHorizontalIcon className='size-4 text-gray-400' />
              </div>
              <div className='flex shrink-0 items-center justify-between border-b bg-gray-100 p-4'>
                <div className='flex items-center gap-4'>
                  <h2 className='font-semibold text-lg'>Knowledge Graph Chat</h2>
                </div>
                <div className='flex items-center space-x-8'>
                  <button type='button' onClick={handleDeleteMessages} className='text-gray-500 hover:text-gray-700'>
                    <Trash2Icon className='size-5' />
                  </button>
                  <button
                    type='button'
                    onClick={() => setIsChatOpen(false)}
                    className='text-gray-500 hover:text-gray-700'
                  >
                    <ChevronDownIcon className='size-6' />
                  </button>
                </div>
              </div>
              <div className='min-h-0 flex-1 overflow-y-auto'>
                {renderMessages({
                  show: showAlert,
                  component: (
                    <center>
                      <Alert className='w-3/4'>
                        <TriangleAlertIcon size={20} />
                        <AlertTitle className='flex w-full items-center justify-between font-bold'>
                          Knowledge Graph AI Assistant{' '}
                          <XIcon
                            size={15}
                            className='m-2 rounded hover:border'
                            onClick={() => {
                              localStorage.setItem('showKGChatAlert', 'false');
                              setShowAlert(false);
                            }}
                          />
                        </AlertTitle>
                        <AlertDescription>
                          <p className='items-center text-sm'>
                            This AI assistant can analyze and query your knowledge graph using natural language. It has
                            access to graph structure, properties, and can perform various graph algorithms. Results may
                            occasionally be incorrect. By using this service, you agree to our{' '}
                            <Link
                              href='/docs/terms-of-use'
                              className='font-medium underline underline-offset-4 hover:text-primary'
                            >
                              Terms of Use
                            </Link>{' '}
                            and{' '}
                            <Link
                              href='/docs/privacy-policy'
                              className='font-medium underline underline-offset-4 hover:text-primary'
                            >
                              Privacy Policy
                            </Link>
                            .
                          </p>
                        </AlertDescription>
                      </Alert>
                    </center>
                  ),
                })}
              </div>
            </div>
          )}
          <div className='flex w-full items-end'>
            <div className='relative flex flex-1'>{renderPromptInput()}</div>
            {!isChatOpen && messages.length > 0 && (
              <button
                type='button'
                onClick={() => setIsChatOpen(true)}
                title='Open chat history'
                className='fade-in zoom-in mr-1.5 mb-2 shrink-0 animate-in rounded-full bg-blue-500 p-3 text-white shadow-xl ring-2 ring-blue-300 transition-all duration-200 hover:scale-110 hover:bg-blue-600 hover:ring-blue-400'
              >
                <MessageCircleIcon className='size-5' />
              </button>
            )}
          </div>
        </div>
      )}
    </KGChat>
  );
}
