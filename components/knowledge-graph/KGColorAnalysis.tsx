'use client';

import { useSigma } from '@react-sigma/core';
import { scaleLinear } from 'd3-scale';
import { useEffect } from 'react';
import { DEFAULT_EDGE_COLOR } from '@/lib/data';
import { DEFAULT_NODE_TYPE, PREDEFINED_TYPE_COLORS } from '@/lib/graph';
import { useKGStore, useStore } from '@/lib/hooks';
import type { EdgeAttributes, NodeAttributes } from '@/lib/interface';
import { P_VALUE_REGEX } from '@/lib/utils';

/**
 * KGColorAnalysis - Apply color analysis for Gene nodes (matching ColorAnalysis.tsx)
 * For Gene nodes: uses universalData and disease-specific properties
 * For other nodes: uses nodePropertyData
 */
export function KGColorAnalysis() {
  // Read from useStore for Gene compatibility (NodeColor component uses useStore)
  const selectedRadioNodeColor = useStore(state => state.selectedRadioNodeColor);
  const selectedNodeColorProperty = useStore(state => state.selectedNodeColorProperty);
  const universalData = useStore(state => state.universalData);
  const diseaseName = useStore(state => state.diseaseName);
  const radioOptions = useStore(state => state.radioOptions);
  // KG-specific properties
  const nodePropertyData = useKGStore(state => state.nodePropertyData);
  const showEdgeColor = useKGStore(state => state.showEdgeColor);
  const edgeOpacity = useKGStore(state => state.edgeOpacity);
  const graph = useSigma<NodeAttributes, EdgeAttributes>().getGraph();
  // Edge coloring
  useEffect(() => {
    if (!graph) return;
    if (showEdgeColor) {
      // KG doesn't have scores - keep default edge color
      const opacityChangedColor = DEFAULT_EDGE_COLOR.replace(/[\d.]+\)$/, `${edgeOpacity})`);
      graph.updateEachEdgeAttributes((_edge, attr) => {
        attr.color = opacityChangedColor;
        return attr;
      });
    } else {
      const opacityChangedColor = DEFAULT_EDGE_COLOR.replace(/[\d.]+\)$/, `${edgeOpacity})`);
      graph.updateEachEdgeAttributes((_edge, attr) => {
        attr.color = opacityChangedColor;
        return attr;
      });
    }
  }, [showEdgeColor, edgeOpacity, graph]);

  // Reset color when selection cleared
  useEffect(() => {
    if (!selectedRadioNodeColor && graph) {
      useStore.setState({ selectedNodeColorProperty: '' });
    }
  }, [selectedRadioNodeColor, graph]);

  // Apply color based on property
  useEffect(() => {
    if (!selectedNodeColorProperty || !graph || !selectedRadioNodeColor) {
      // No color property - check if size property exists to keep 'Gene' active
      const selectedNodeSizeProperty = useStore.getState().selectedNodeSizeProperty;
      const hasSizeProperty = typeof selectedNodeSizeProperty === 'string' && selectedNodeSizeProperty !== '';

      useKGStore.setState(state => ({
        activePropertyNodeTypes: hasSizeProperty
          ? state.activePropertyNodeTypes.includes('Gene')
            ? state.activePropertyNodeTypes
            : [...state.activePropertyNodeTypes, 'Gene']
          : state.activePropertyNodeTypes.filter(t => t !== 'Gene'),
      }));
      return;
    }

    // Check if this is a Gene property or KG property
    const userOptions = radioOptions.user[selectedRadioNodeColor as keyof typeof radioOptions.user] as
      | string[]
      | undefined;
    const dbOptions = radioOptions.database[selectedRadioNodeColor as keyof typeof radioOptions.database];
    const isGeneProperty =
      typeof selectedNodeColorProperty === 'string' &&
      ((Array.isArray(userOptions) && userOptions.includes(selectedNodeColorProperty)) ||
        (Array.isArray(dbOptions) &&
          dbOptions.some(item =>
            typeof item === 'string' ? item === selectedNodeColorProperty : item.name === selectedNodeColorProperty,
          )));

    if (!isGeneProperty) {
      const selectedNodeColorProperty = useKGStore.getState().selectedNodeColorProperty;
      // Non-Gene nodes - use nodePropertyData

      // Determine which nodeType this property belongs to
      // For now, we'll detect it from nodePropertyData keys
      const propertyNodeType = Object.keys(nodePropertyData).find(
        nodeId => nodePropertyData[nodeId]?.[selectedNodeColorProperty] !== undefined,
      );
      const detectedNodeType = propertyNodeType
        ? (graph.getNodeAttribute(propertyNodeType, 'nodeType') as string)
        : DEFAULT_NODE_TYPE;

      // Update active property nodeTypes - add if not present, preserve existing
      useKGStore.setState(state => ({
        activePropertyNodeTypes: state.activePropertyNodeTypes.includes(detectedNodeType)
          ? state.activePropertyNodeTypes
          : [...state.activePropertyNodeTypes.filter(t => t !== 'Gene'), detectedNodeType],
      }));
      const values = Object.entries(nodePropertyData)
        .map(([, props]) => props[selectedNodeColorProperty])
        .filter(v => v !== null && v !== undefined && !Number.isNaN(Number(v)))
        .map(v => Number(v));

      if (values.length === 0) return;

      const minMax = [Math.min(...values), Math.max(...values)] as [number, number];
      const colorScale = scaleLinear<string>(minMax, ['green', 'red']);

      graph.updateEachNodeAttributes((_node, attr) => {
        const val = nodePropertyData[_node]?.[selectedNodeColorProperty];
        if (val !== null && val !== undefined && !Number.isNaN(Number(val))) {
          attr.color = colorScale(Number(val));
        } else {
          // Keep original type-based color
          const nodeType = attr.nodeType || 'Unknown';

          attr.color = PREDEFINED_TYPE_COLORS[nodeType] || 'lightgray';
        }
        return attr;
      });
      return;
    }

    // Gene-specific coloring (matching ColorAnalysis.tsx)
    const userRadioOptions = radioOptions.user[selectedRadioNodeColor as keyof typeof radioOptions.user] as
      | string[]
      | undefined;
    const isUserProperty =
      typeof selectedNodeColorProperty === 'string' &&
      Array.isArray(userRadioOptions) &&
      userRadioOptions.includes(selectedNodeColorProperty);
    const userOrDiseaseIdentifier = isUserProperty ? 'user' : diseaseName;
    const userOrCommonIdentifier = isUserProperty ? 'user' : 'common';

    // Gene property - add 'Gene' to active property tracking
    useKGStore.setState(state => ({
      activePropertyNodeTypes: state.activePropertyNodeTypes.includes('Gene')
        ? state.activePropertyNodeTypes
        : [...state.activePropertyNodeTypes, 'Gene'],
    }));

    if (selectedRadioNodeColor === 'OpenTargets' && typeof selectedNodeColorProperty === 'string') {
      const minMax = Object.values(universalData).reduce(
        (acc, cur) => {
          const section = cur[userOrDiseaseIdentifier];
          const value =
            section && 'OpenTargets' in section ? section.OpenTargets?.[selectedNodeColorProperty] : undefined;
          if (value === null || value === undefined || Number.isNaN(value)) return acc;
          return [Math.min(acc[0], Number(value)), Math.max(acc[1], Number(value))];
        },
        [1, 0],
      );
      const colorScale = scaleLinear<string>(minMax, ['green', 'red']);
      graph.updateEachNodeAttributes((_node, attr) => {
        if (attr.nodeType !== 'Gene') return attr;
        const section = universalData[_node]?.[userOrDiseaseIdentifier];
        const val = section && 'OpenTargets' in section ? section.OpenTargets?.[selectedNodeColorProperty] : undefined;
        if (val !== null && val !== undefined && !Number.isNaN(Number(val))) attr.color = colorScale(Number(val));
        else attr.color = '#3b82f6';
        return attr;
      });
    } else if (selectedRadioNodeColor === 'DEG' && typeof selectedNodeColorProperty === 'string') {
      const isPValue = P_VALUE_REGEX.test(selectedNodeColorProperty);

      const [min, max] = Object.values(universalData).reduce(
        (acc, cur) => {
          const section = cur[userOrDiseaseIdentifier];
          const val = section && 'DEG' in section ? section.DEG?.[selectedNodeColorProperty] : undefined;
          if (!val) return acc;
          const value = isPValue ? -Math.log10(Number(val)) : Number(val);
          if (Number.isNaN(value)) return acc;
          return [Math.min(acc[0], value), Math.max(acc[1], value)];
        },
        [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
      );

      const colorScale = isPValue
        ? scaleLinear<string>([min, max], ['green', 'red'])
        : scaleLinear<string>([min, 0, max], ['green', '#E2E2E2', 'red']);

      graph.updateEachNodeAttributes((_node, attr) => {
        if (attr.nodeType !== 'Gene') return attr;
        const section = universalData[_node]?.[userOrDiseaseIdentifier];
        const val = section && 'DEG' in section ? section.DEG?.[selectedNodeColorProperty] : undefined;
        if (val !== null && val !== undefined && !Number.isNaN(Number(val)))
          attr.color = colorScale(isPValue ? -Math.log10(Number(val)) : Number(val));
        else attr.color = '#3b82f6';
        return attr;
      });
    } else if (selectedRadioNodeColor === 'Pathway') {
      const propertyArray = Array.from(selectedNodeColorProperty as unknown as Set<string>);
      const userPathwayArray = radioOptions.user.Pathway;
      graph.updateEachNodeAttributes((_node, attr) => {
        if (attr.nodeType !== 'Gene') return attr;
        attr.color = propertyArray.some(property =>
          Number(universalData[_node]?.[userPathwayArray.includes(property) ? 'user' : 'common']?.Pathway?.[property]),
        )
          ? 'red'
          : '#3b82f6';
        return attr;
      });
    } else if (selectedRadioNodeColor === 'Druggability' && typeof selectedNodeColorProperty === 'string') {
      const minMax = Object.values(universalData).reduce(
        (acc, cur) => {
          const value = cur[userOrCommonIdentifier]?.Druggability?.[selectedNodeColorProperty];
          if (value === null || value === undefined || Number.isNaN(value)) return acc;
          return [Math.min(acc[0], Number(value)), Math.max(acc[1], Number(value))];
        },
        [1, 0],
      );
      const colorScale = scaleLinear<string>(minMax, ['green', 'red']);
      graph.updateEachNodeAttributes((_node, attr) => {
        if (attr.nodeType !== 'Gene') return attr;
        const val = universalData[_node]?.[userOrCommonIdentifier]?.Druggability?.[selectedNodeColorProperty];
        if (val !== null && val !== undefined && !Number.isNaN(Number(val))) attr.color = colorScale(Number(val));
        else attr.color = '#3b82f6';
        return attr;
      });
    } else if (selectedRadioNodeColor === 'TE' && typeof selectedNodeColorProperty !== 'string') {
      const propertyArray = Array.from(selectedNodeColorProperty as unknown as Set<string>);
      if (propertyArray.length === 0) {
        graph.updateEachNodeAttributes((_node, attr) => {
          if (attr.nodeType !== 'Gene') return attr;
          attr.color = '#3b82f6';
          return attr;
        });
        return;
      }
      const userTEArray = radioOptions.user.TE;
      const minMax = Object.values(universalData).reduce(
        (acc, cur) => {
          const value = propertyArray.reduce((acc2, property) => {
            const val = cur[userTEArray.includes(property) ? 'user' : 'common']?.TE?.[property];
            if (val === null || val === undefined || Number.isNaN(val)) return acc2;
            return Math.max(acc2, Number(val));
          }, 0);
          return [Math.min(acc[0], value), Math.max(acc[1], value)];
        },
        [Number.POSITIVE_INFINITY, 0],
      );
      const colorScale = scaleLinear<string>(minMax, ['green', 'red']);
      graph.updateEachNodeAttributes((_node, attr) => {
        if (attr.nodeType !== 'Gene') return attr;
        const val = propertyArray.reduce((acc, property) => {
          const value = universalData[_node]?.[userTEArray.includes(property) ? 'user' : 'common']?.TE?.[property];
          if (value === null || value === undefined || Number.isNaN(Number(value))) return acc;
          return Math.max(acc, Number(value));
        }, Number.NEGATIVE_INFINITY);
        if (Number.isFinite(val)) attr.color = colorScale(val);
        else attr.color = '#3b82f6';
        return attr;
      });
    } else if (selectedRadioNodeColor === 'Custom_Color' && typeof selectedNodeColorProperty === 'string') {
      graph.updateEachNodeAttributes((_node, attr) => {
        if (attr.nodeType !== 'Gene') return attr;
        const val = universalData[_node]?.user?.Custom_Color?.[selectedNodeColorProperty];
        if (val && typeof val === 'string' && val.match(/^#[0-9A-Fa-f]{6}$/)) attr.color = val;
        else attr.color = '#3b82f6';
        return attr;
      });
    } else if (selectedRadioNodeColor === 'OT_Prioritization' && typeof selectedNodeColorProperty === 'string') {
      const colorScale = scaleLinear<string>([-1, 0, 1], ['red', '#F0C584', 'green']);
      graph.updateEachNodeAttributes((_node, attr) => {
        if (attr.nodeType !== 'Gene') return attr;
        const val = universalData[_node]?.[userOrCommonIdentifier]?.OT_Prioritization?.[selectedNodeColorProperty];
        if (val !== null && val !== undefined && !Number.isNaN(Number(val))) attr.color = colorScale(Number(val));
        else attr.color = '#3b82f6';
        return attr;
      });
    }
  }, [
    selectedNodeColorProperty,
    graph,
    universalData,
    nodePropertyData,
    selectedRadioNodeColor,
    radioOptions,
    diseaseName,
  ]);

  return null;
}
