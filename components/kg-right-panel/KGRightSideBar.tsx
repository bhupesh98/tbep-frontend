'use client';

import { ScrollArea } from '../ui/scroll-area';
import { KGLegend, KGNetworkAnalysis, KGNetworkInfo, KGNetworkLayout, KGNetworkStyle, KGRadialAnalysis } from '.';
/**
 * KGRightSideBar - Main right panel matching original RightSideBar layout
 * All collapsible sections, same ordering and styling
 */
export function KGRightSideBar() {
  return (
    <ScrollArea className='flex h-[calc(96vh-1.5px)] flex-col border-l p-2 text-xs'>
      <KGNetworkAnalysis>
        <KGRadialAnalysis />
      </KGNetworkAnalysis>
      <KGNetworkInfo />
      <KGLegend />
      <KGNetworkLayout />
      <KGNetworkStyle />
    </ScrollArea>
  );
}
