'use client';

import { NetworkAnalysis } from '../right-panel';
import { ScrollArea } from '../ui/scroll-area';
import { KGLegend } from './KGLegend';
import { KGNetworkInfo } from './KGNetworkInfo';
import { KGNetworkLayout } from './KGNetworkLayout';
import { KGNetworkStyle } from './KGNetworkStyle';
import { KGRadialAnalysis } from './KGRadialAnalysis';

/**
 * KGRightSideBar - Main right panel matching original RightSideBar layout
 * All collapsible sections, same ordering and styling
 */
export function KGRightSideBar() {
  return (
    <ScrollArea className='flex h-[calc(96vh-1.5px)] flex-col border-l p-2 text-xs'>
      <NetworkAnalysis>
        <KGRadialAnalysis />
      </NetworkAnalysis>
      <KGNetworkInfo />
      <KGLegend />
      <KGNetworkLayout />
      <KGNetworkStyle />
    </ScrollArea>
  );
}
