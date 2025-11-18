'use client';

import { InfoIcon } from 'lucide-react';
import { useEffect, useId } from 'react';
import { radialAnalysisOptions } from '@/lib/data';
import { useKGStore } from '@/lib/hooks';
import type { RadialAnalysisSetting } from '@/lib/interface';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

/**
 * KGRadialAnalysis - Full radial analysis with edge weight cutoff and node degree filtering
 * Adapted from GraphAnalysis.tsx for knowledge graph context
 */
export function KGRadialAnalysis() {
  const radialAnalysis = useKGStore(state => state.radialAnalysis);
  const sigmaInstance = useKGStore(state => state.sigmaInstance);
  const setNetworkStatistics = useKGStore(state => state.setNetworkStatistics);

  const updateRadialAnalysis = (value: number, key: keyof RadialAnalysisSetting) => {
    useKGStore.setState({ radialAnalysis: { ...radialAnalysis, [key]: value } });
  };

  // Handle edge weight cutoff - hide edges below threshold if they have score attribute
  useEffect(() => {
    if (!sigmaInstance) return;
    const graph = sigmaInstance.getGraph();
    try {
      let totalEdges = 0;
      const edges = graph.edges();
      for (const edge of edges) {
        // Skip if edge no longer exists (may have been removed during iteration)
        if (!graph.hasEdge(edge)) continue;

        const attr = graph.getEdgeAttributes(edge);
        if (attr.score !== undefined && attr.score < radialAnalysis.edgeWeightCutOff) {
          graph.setEdgeAttribute(edge, 'hidden', true);
        } else {
          graph.setEdgeAttribute(edge, 'hidden', false);
          totalEdges++;
        }
      }
      setNetworkStatistics({ totalEdges });
    } catch (error) {
      console.error('Error updating edge attributes:', error);
    }
  }, [radialAnalysis.edgeWeightCutOff, sigmaInstance, setNetworkStatistics]);

  // Handle candidate prioritization (node degree cutoff)
  useEffect(() => {
    if (!sigmaInstance) return;
    const graph = sigmaInstance.getGraph();
    try {
      let totalNodes = 0;
      graph.updateEachNodeAttributes((node, attr) => {
        const degree = graph.degree(node);
        if (degree < radialAnalysis.candidatePrioritizationCutOff) {
          attr.hidden = true;
        } else {
          attr.hidden = false;
          totalNodes++;
        }
        return attr;
      });
      const totalEdges = graph.reduceEdges((count, _edge, _attr, _src, _tgt, srcAttr, tgtAttr) => {
        return count + (srcAttr.hidden || tgtAttr.hidden ? 0 : 1);
      }, 0);
      setNetworkStatistics({ totalEdges, totalNodes });
    } catch (error) {
      console.error('Error updating node attributes:', error);
    }
  }, [radialAnalysis.candidatePrioritizationCutOff, sigmaInstance, setNetworkStatistics]);

  const edgeWeightId = useId();
  const candidatePrioritizationId = useId();

  return (
    <div className='flex flex-col gap-1'>
      {radialAnalysisOptions
        .filter(opt => opt.key === 'edgeWeightCutOff' || opt.key === 'candidatePrioritizationCutOff')
        .map((option, idx, arr) => (
          <div key={option.key} className='space-y-1'>
            <div className='flex items-center space-x-2'>
              <div className='flex w-full flex-col space-y-2'>
                <Label
                  htmlFor={option.key === 'edgeWeightCutOff' ? edgeWeightId : candidatePrioritizationId}
                  className='flex items-center gap-1 font-semibold text-xs'
                >
                  {option.label}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className='shrink-0' size={12} />
                    </TooltipTrigger>
                    <TooltipContent align='end'>
                      <p className='max-w-60'>{option.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Slider
                  id={option.key === 'edgeWeightCutOff' ? edgeWeightId : candidatePrioritizationId}
                  min={option.min}
                  max={option.max}
                  step={option.step}
                  value={[radialAnalysis[option.key]]}
                  onValueChange={value => updateRadialAnalysis(value[0], option.key as keyof RadialAnalysisSetting)}
                />
              </div>
              <Input
                type='number'
                className='w-14'
                min={option.min}
                max={option.max}
                step={option.step}
                value={radialAnalysis[option.key]}
                onChange={e =>
                  updateRadialAnalysis(Number.parseFloat(e.target.value), option.key as keyof RadialAnalysisSetting)
                }
              />
            </div>
            {idx !== arr.length - 1 && <hr />}
          </div>
        ))}
    </div>
  );
}
