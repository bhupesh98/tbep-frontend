'use client';

import type { CheckedState } from '@radix-ui/react-checkbox';
import { ChevronsUpDownIcon, InfoIcon } from 'lucide-react';
import { useEffect, useId } from 'react';
import type { KGStore } from '@/lib/hooks';
import { useKGStore } from '@/lib/hooks';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

export function KGNetworkStyle() {
  const defaultNodeSize = useKGStore(state => state.defaultNodeSize);
  const defaultLabelDensity = useKGStore(state => state.defaultLabelDensity);
  const defaultLabelSize = useKGStore(state => state.defaultLabelSize);
  const showEdgeColor = useKGStore(state => state.showEdgeColor);
  const edgeOpacity = useKGStore(state => state.edgeOpacity);
  const edgeWidth = useKGStore(state => state.edgeWidth);
  const highlightNeighborNodes = useKGStore(state => state.highlightNeighborNodes);
  const proportionalSizing = useKGStore(state => state.proportionalSizing);
  const sigmaInstance = useKGStore(state => state.sigmaInstance);
  const graph = sigmaInstance?.getGraph();

  const handleCheckBox = (checked: CheckedState, key: keyof KGStore) => {
    if (checked === 'indeterminate') return;
    useKGStore.setState({ [key]: checked });
  };

  const handleDefaultChange = (value: number | string, key: keyof KGStore) => {
    useKGStore.setState({ [key]: value });
  };

  const defaultNodeSizeId = useId();
  const defaultLabelSizeId = useId();
  const defaultLabelDensityId = useId();
  const showEdgeColorId = useId();
  const edgeOpacityId = useId();
  const edgeWidthId = useId();
  const highlightNeighborNodesId = useId();
  const proportionalSizingId = useId();

  // Apply label density changes to Sigma instance
  useEffect(() => {
    sigmaInstance?.setSettings({
      labelDensity: defaultLabelDensity,
    });
  }, [defaultLabelDensity, sigmaInstance]);

  // Apply label size changes to Sigma instance
  useEffect(() => {
    sigmaInstance?.setSettings({
      labelSize: defaultLabelSize,
    });
  }, [defaultLabelSize, sigmaInstance]);

  // Apply node size changes to graph
  useEffect(() => {
    if (!graph) return;
    if (proportionalSizing) {
      // Calculate min/max degree for proportional sizing
      let maxDegree = 0;
      let minDegree = Infinity;
      graph.forEachNode((node: string) => {
        const degree = graph.degree(node);
        if (degree > maxDegree) maxDegree = degree;
        if (degree < minDegree) minDegree = degree;
      });
      // Apply proportional sizing based on node degree
      graph.forEachNode((node: string) => {
        const degree = graph.degree(node);
        const baseSize = defaultNodeSize;
        graph.setNodeAttribute(node, 'size', degree === 0 ? baseSize : baseSize * Math.sqrt(degree / maxDegree));
      });
    } else {
      // Apply static node size
      graph.forEachNode((node: string) => {
        graph.setNodeAttribute(node, 'size', defaultNodeSize);
      });
    }
  }, [defaultNodeSize, proportionalSizing, graph]);

  // Apply edge opacity changes to graph
  useEffect(() => {
    if (!graph) return;
    graph.forEachEdge((edge: string, attributes) => {
      const color = attributes.color as string;
      // Parse RGB and apply opacity
      const rgb = color.match(/\d+/g);
      if (rgb && rgb.length === 3) {
        const newColor = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${edgeOpacity})`;
        graph.setEdgeAttribute(edge, 'color', newColor);
      }
    });
  }, [edgeOpacity, graph]);

  // Apply edge width changes to graph
  useEffect(() => {
    if (!graph) return;
    graph.forEachEdge((edge: string) => {
      graph.setEdgeAttribute(edge, 'size', edgeWidth);
    });
  }, [edgeWidth, graph]);

  return (
    <Collapsible defaultOpen className='mb-2 rounded border p-2 text-xs shadow-sm'>
      <div className='flex w-full items-center justify-between'>
        <p className='font-bold'>Network Style</p>
        <CollapsibleTrigger asChild>
          <Button type='button' variant='outline' size='icon' className='size-6'>
            <ChevronsUpDownIcon size={15} />
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className='flex flex-col gap-2'>
        <div className='flex items-center space-x-2'>
          <div className='flex w-full flex-col space-y-1'>
            <Label htmlFor={defaultNodeSizeId} className='font-semibold text-xs'>
              Node Size
            </Label>
            <Slider
              id={defaultNodeSizeId}
              className='w-full'
              min={1}
              max={50}
              step={1}
              value={[defaultNodeSize]}
              onValueChange={value => handleDefaultChange(value?.[0], 'defaultNodeSize')}
            />
          </div>
          <Input
            type='number'
            className='h-8 w-16'
            min={1}
            max={50}
            step={1}
            value={defaultNodeSize}
            onChange={e => handleDefaultChange(Number.parseInt(e.target.value, 10), 'defaultNodeSize')}
          />
        </div>
        <div className='flex items-center space-x-2'>
          <div className='flex w-full flex-col space-y-1'>
            <Label htmlFor={defaultLabelSizeId} className='font-semibold text-xs'>
              Node Label Size
            </Label>
            <Slider
              id={defaultLabelSizeId}
              className='w-full'
              min={1}
              max={25}
              step={1}
              value={[defaultLabelSize]}
              onValueChange={value => handleDefaultChange(value?.[0], 'defaultLabelSize')}
            />
          </div>
          <Input
            type='number'
            className='h-8 w-16'
            min={1}
            max={50}
            step={1}
            value={defaultLabelSize}
            onChange={e => handleDefaultChange(Number.parseInt(e.target.value, 10), 'defaultLabelSize')}
          />
        </div>
        <div className='flex items-center space-x-2'>
          <div className='flex w-full flex-col space-y-1'>
            <Label htmlFor={defaultLabelDensityId} className='flex items-center gap-1 font-semibold text-xs'>
              Label Density
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon size={12} />
                </TooltipTrigger>
                <TooltipContent className='max-w-60' align='end'>
                  Change the density of the node/edge labels in the network
                </TooltipContent>
              </Tooltip>
            </Label>
            <Slider
              id={defaultLabelDensityId}
              className='w-full'
              min={0}
              max={10}
              step={0.1}
              value={[defaultLabelDensity]}
              onValueChange={value => handleDefaultChange(value?.[0], 'defaultLabelDensity')}
            />
          </div>
          <Input
            type='number'
            className='h-8 w-16'
            min={1}
            max={50}
            step={1}
            value={defaultLabelDensity}
            onChange={e => handleDefaultChange(Number.parseFloat(e.target.value), 'defaultLabelDensity')}
          />
        </div>
        <hr />
        <div className='flex flex-col gap-2'>
          <div className='flex items-center gap-2'>
            <Checkbox
              id={showEdgeColorId}
              checked={showEdgeColor}
              onCheckedChange={checked => handleCheckBox(checked, 'showEdgeColor')}
            />
            <Label htmlFor={showEdgeColorId} className='font-semibold text-xs'>
              Show Edge Color
            </Label>
          </div>
          <div className='flex items-center gap-2'>
            <Checkbox
              id={highlightNeighborNodesId}
              checked={highlightNeighborNodes}
              onCheckedChange={checked => handleCheckBox(checked, 'highlightNeighborNodes')}
            />
            <Label htmlFor={highlightNeighborNodesId} className='flex items-center gap-1 font-semibold text-xs'>
              Highlight Neighbor Nodes
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon size={12} />
                </TooltipTrigger>
                <TooltipContent className='max-w-60' align='end'>
                  Upon checked, highlights the neighbors of the hovered nodes
                </TooltipContent>
              </Tooltip>
            </Label>
          </div>
          <div className='flex items-center gap-2'>
            <Checkbox
              id={proportionalSizingId}
              checked={proportionalSizing}
              onCheckedChange={checked => handleCheckBox(checked, 'proportionalSizing')}
            />
            <Label htmlFor={proportionalSizingId} className='flex items-center gap-1 font-semibold text-xs'>
              Proportional Node Sizing
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon size={12} />
                </TooltipTrigger>
                <TooltipContent className='max-w-60' align='end'>
                  Size nodes proportionally based on their degree (number of connections)
                </TooltipContent>
              </Tooltip>
            </Label>
          </div>
        </div>
        <div>
          <Label htmlFor={edgeOpacityId} className='font-semibold text-xs'>
            Edge Opacity
          </Label>
          <div className='flex items-center space-x-2 text-xs'>
            <Slider
              min={0}
              max={1}
              step={0.1}
              id={edgeOpacityId}
              value={[edgeOpacity]}
              onValueChange={e => handleDefaultChange(e[0], 'edgeOpacity')}
            />
            <Input
              type='number'
              min={0}
              max={1}
              step={0.1}
              value={edgeOpacity}
              onChange={e => handleDefaultChange(Number(e.target.value), 'edgeOpacity')}
              className='w-16'
            />
          </div>
        </div>
        <div>
          <Label htmlFor={edgeWidthId} className='font-semibold text-xs'>
            Edge Width
          </Label>
          <div className='flex items-center space-x-2 text-xs'>
            <Slider
              min={0.1}
              max={10}
              step={0.1}
              id={edgeWidthId}
              value={[edgeWidth]}
              onValueChange={e => handleDefaultChange(e[0], 'edgeWidth')}
            />
            <Input
              type='number'
              min={0.1}
              max={10}
              step={0.1}
              value={edgeWidth}
              onChange={e => handleDefaultChange(Number(e.target.value), 'edgeWidth')}
              className='w-16'
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
