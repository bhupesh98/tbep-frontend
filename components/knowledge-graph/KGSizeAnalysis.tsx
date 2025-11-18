'use client';

import { useSigma } from '@react-sigma/core';
import { scaleLinear } from 'd3-scale';
import { useEffect } from 'react';
import { DEFAULT_NODE_TYPE } from '@/lib/graph';
import { useKGStore, useStore } from '@/lib/hooks';
import type { EdgeAttributes, NodeAttributes } from '@/lib/interface';
import { P_VALUE_REGEX } from '@/lib/utils';

/**
 * KGSizeAnalysis - Apply size analysis for Gene nodes (matching SizeAnalysis.tsx)
 */
export function KGSizeAnalysis() {
  // Read from useStore for Gene compatibility (NodeSize component uses useStore)
  const selectedRadioNodeSize = useStore(state => state.selectedRadioNodeSize);
  const selectedNodeSizeProperty = useStore(state => state.selectedNodeSizeProperty);
  const universalData = useStore(state => state.universalData);
  const diseaseName = useStore(state => state.diseaseName);
  const radioOptions = useStore(state => state.radioOptions);
  // KG-specific properties
  const graph = useSigma<NodeAttributes, EdgeAttributes>().getGraph();
  const nodePropertyData = useKGStore(state => state.nodePropertyData);
  const defaultNodeSize = useKGStore(state => state.defaultNodeSize);

  // biome-ignore lint/correctness/useExhaustiveDependencies: I won't write reason
  useEffect(() => {
    if (!selectedRadioNodeSize && graph) {
      useStore.setState({ selectedNodeSizeProperty: '' });
      graph.updateEachNodeAttributes((_node, attr) => {
        attr.size = defaultNodeSize;
        return attr;
      });
      // Clear size property from active tracking
      useKGStore.setState(state => ({
        activePropertyNodeTypes: {
          ...state.activePropertyNodeTypes,
          size: new Set(),
        },
      }));
    }
  }, [selectedRadioNodeSize, graph]);

  useEffect(() => {
    if (!selectedNodeSizeProperty || !graph || !selectedRadioNodeSize) {
      // No property selected - clear size from active tracking
      useKGStore.setState(state => ({
        activePropertyNodeTypes: {
          ...state.activePropertyNodeTypes,
          size: new Set(),
        },
      }));
      return;
    }
    const userOptions = radioOptions.user[selectedRadioNodeSize as keyof typeof radioOptions.user] as
      | string[]
      | undefined;
    const dbOptions = radioOptions.database[selectedRadioNodeSize as keyof typeof radioOptions.database];
    const isGeneProperty =
      typeof selectedNodeSizeProperty === 'string' &&
      ((Array.isArray(userOptions) && userOptions.includes(selectedNodeSizeProperty)) ||
        (Array.isArray(dbOptions) &&
          dbOptions.some(item =>
            typeof item === 'string' ? item === selectedNodeSizeProperty : item.name === selectedNodeSizeProperty,
          )));

    if (!isGeneProperty) {
      const selectedNodeSizeProperty = useKGStore.getState().selectedNodeSizeProperty;
      // Non-Gene nodes - use nodePropertyData

      // Determine which nodeType this property belongs to
      const propertyNodeType = Object.keys(nodePropertyData).find(
        nodeId => nodePropertyData[nodeId]?.[selectedNodeSizeProperty] !== undefined,
      );
      const detectedNodeType = propertyNodeType
        ? (graph.getNodeAttribute(propertyNodeType, 'nodeType') as string)
        : DEFAULT_NODE_TYPE;

      // Track size property for this nodeType
      useKGStore.setState(state => ({
        activePropertyNodeTypes: {
          ...state.activePropertyNodeTypes,
          size: new Set([detectedNodeType]),
        },
      }));
      const values = Object.entries(nodePropertyData)
        .map(([, props]) => props[selectedNodeSizeProperty])
        .filter(v => v !== null && v !== undefined && !Number.isNaN(Number(v)))
        .map(v => Number(v));
      if (values.length === 0) return;
      const minMax = [Math.min(...values), Math.max(...values)] as [number, number];
      const sizeScale = scaleLinear<number, number>(minMax, [3, defaultNodeSize + 10]);
      graph.updateEachNodeAttributes((_node, attr) => {
        const val = nodePropertyData[_node]?.[selectedNodeSizeProperty];
        if (val !== null && val !== undefined && !Number.isNaN(Number(val))) attr.size = sizeScale(Number(val));
        else attr.size = 0.5;
        return attr;
      });
      return;
    }

    const userRadioOptions = radioOptions.user[selectedRadioNodeSize as keyof typeof radioOptions.user] as
      | string[]
      | undefined;
    const isUserProperty =
      typeof selectedNodeSizeProperty === 'string' &&
      Array.isArray(userRadioOptions) &&
      userRadioOptions.includes(selectedNodeSizeProperty);
    const userOrDiseaseIdentifier = isUserProperty ? 'user' : diseaseName;
    const userOrCommonIdentifier = isUserProperty ? 'user' : 'common';

    // Gene property - track size property for Gene
    useKGStore.setState(state => ({
      activePropertyNodeTypes: {
        ...state.activePropertyNodeTypes,
        size: new Set(['Gene']),
      },
    }));

    if (selectedRadioNodeSize === 'Druggability' && typeof selectedNodeSizeProperty === 'string') {
      const minMax = Object.values(universalData).reduce(
        (acc, cur) => {
          const value = cur[userOrCommonIdentifier]?.Druggability?.[selectedNodeSizeProperty];
          if (value === null || value === undefined || Number.isNaN(value)) return acc;
          return [Math.min(acc[0], Number(value)), Math.max(acc[1], Number(value))];
        },
        [1, 0],
      );
      const sizeScale = scaleLinear<number, number>(minMax, [3, defaultNodeSize + 10]);
      graph.updateEachNodeAttributes((node, attr) => {
        if (attr.nodeType !== 'Gene') return attr;
        const val = universalData[node]?.[userOrCommonIdentifier]?.Druggability?.[selectedNodeSizeProperty];
        if (val !== null && val !== undefined && !Number.isNaN(Number(val))) attr.size = sizeScale(Number(val));
        else attr.size = 0.5;
        return attr;
      });
    } else if (selectedRadioNodeSize === 'TE' && typeof selectedNodeSizeProperty !== 'string') {
      const propertyArray = Array.from(selectedNodeSizeProperty as unknown as Set<string>);
      if (propertyArray.length === 0) {
        graph.updateEachNodeAttributes((_node, attr) => {
          attr.size = defaultNodeSize;
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
      const sizeScale = scaleLinear<number, number>(minMax, [3, defaultNodeSize + 10]);
      graph.updateEachNodeAttributes((_node, attr) => {
        if (attr.nodeType !== 'Gene') return attr;
        const val = propertyArray.reduce((acc, property) => {
          const value = universalData[_node]?.[userTEArray.includes(property) ? 'user' : 'common']?.TE?.[property];
          if (value === null || value === undefined || Number.isNaN(Number(value))) return acc;
          return Math.max(acc, Number(value));
        }, Number.NEGATIVE_INFINITY);
        if (Number.isFinite(val)) attr.size = sizeScale(val);
        else attr.size = 0.5;
        return attr;
      });
    } else if (selectedRadioNodeSize === 'DEG' && typeof selectedNodeSizeProperty === 'string') {
      const isPValue = P_VALUE_REGEX.test(selectedNodeSizeProperty);
      const max = Object.values(universalData).reduce((acc, cur) => {
        const section = cur[userOrDiseaseIdentifier];
        const val = section && 'DEG' in section ? section.DEG?.[selectedNodeSizeProperty] : undefined;
        if (!val) return acc;
        const value = isPValue ? -Math.log10(Number(val)) : Math.abs(Number(val));
        if (Number.isNaN(value)) return acc;
        return Math.max(acc, value);
      }, 0);
      const sizeScale = scaleLinear<number, number>([0, max], [3, defaultNodeSize + 10]);
      graph.updateEachNodeAttributes((node, attr) => {
        if (attr.nodeType !== 'Gene') return attr;
        const section = universalData[node]?.[userOrDiseaseIdentifier];
        const val = section && 'DEG' in section ? section.DEG?.[selectedNodeSizeProperty] : undefined;
        if (val !== null && val !== undefined && !Number.isNaN(Number(val)))
          attr.size = sizeScale(isPValue ? -Math.log10(Number(val)) : Math.abs(Number(val)));
        else attr.size = 0.5;
        return attr;
      });
    } else if (selectedRadioNodeSize === 'OpenTargets' && typeof selectedNodeSizeProperty === 'string') {
      const minMax = Object.values(universalData).reduce(
        (acc, cur) => {
          const section = cur[userOrDiseaseIdentifier];
          const value =
            section && 'OpenTargets' in section ? section.OpenTargets?.[selectedNodeSizeProperty] : undefined;
          if (value === null || value === undefined || Number.isNaN(value)) return acc;
          return [Math.min(acc[0], Number(value)), Math.max(acc[1], Number(value))];
        },
        [1, 0],
      );
      const sizeScale = scaleLinear<number, number>(minMax, [3, defaultNodeSize + 10]);
      graph.updateEachNodeAttributes((node, attr) => {
        if (attr.nodeType !== 'Gene') return attr;
        const section = universalData[node]?.[userOrDiseaseIdentifier];
        const val = section && 'OpenTargets' in section ? section.OpenTargets?.[selectedNodeSizeProperty] : undefined;
        if (val != null && val !== undefined && !Number.isNaN(Number(val))) attr.size = sizeScale(Number(val));
        else attr.size = 0.5;
        return attr;
      });
    } else if (selectedRadioNodeSize === 'OT_Prioritization' && typeof selectedNodeSizeProperty === 'string') {
      const sizeScale = scaleLinear<number, number>(
        [-1, 0, 1],
        [defaultNodeSize - 10, defaultNodeSize, defaultNodeSize + 10],
      );
      graph.updateEachNodeAttributes((node, attr) => {
        if (attr.nodeType !== 'Gene') return attr;
        const val = universalData[node]?.[userOrCommonIdentifier]?.OT_Prioritization?.[selectedNodeSizeProperty];
        if (val != null && val !== undefined && !Number.isNaN(Number(val))) attr.size = sizeScale(Number(val));
        else attr.size = 0.5;
        return attr;
      });
    }
  }, [
    selectedNodeSizeProperty,
    graph,
    universalData,
    nodePropertyData,
    defaultNodeSize,
    selectedRadioNodeSize,
    radioOptions,
    diseaseName,
  ]);

  return null;
}
