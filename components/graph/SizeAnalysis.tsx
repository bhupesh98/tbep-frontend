'use client';

import { useSigma } from '@react-sigma/core';
import { scaleLinear } from 'd3-scale';
import { useEffect } from 'react';
import { useStore } from '@/lib/hooks';
import type { EdgeAttributes, NodeAttributes, OtherSection } from '@/lib/interface';
import { P_VALUE_REGEX } from '@/lib/utils';

export function SizeAnalysis() {
  const selectedRadioNodeSize = useStore(state => state.selectedRadioNodeSize);
  const selectedNodeSizeProperty = useStore(state => state.selectedNodeSizeProperty);
  const graph = useSigma<NodeAttributes, EdgeAttributes>().getGraph();
  const universalData = useStore(state => state.universalData);
  const defaultNodeSize = useStore(state => state.defaultNodeSize);
  const diseaseName = useStore(state => state.diseaseName);
  const radioOptions = useStore(state => state.radioOptions);

  // biome-ignore lint/correctness/useExhaustiveDependencies: I won't write reason
  useEffect(() => {
    if (!selectedRadioNodeSize && graph) {
      useStore.setState({ selectedNodeSizeProperty: '' });
      graph.updateEachNodeAttributes((_node, attr) => {
        attr.size = defaultNodeSize;
        return attr;
      });
    }
  }, [selectedRadioNodeSize]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: I won't write reason
  useEffect(() => {
    if (!selectedNodeSizeProperty || !graph || !selectedRadioNodeSize) return;
    const isUserProperty =
      typeof selectedNodeSizeProperty === 'string' &&
      radioOptions.user[selectedRadioNodeSize].includes(selectedNodeSizeProperty);
    const userOrDiseaseIdentifier = isUserProperty ? 'user' : diseaseName;
    const userOrCommonIdentifier = isUserProperty ? 'user' : 'common';
    if (selectedRadioNodeSize === 'Druggability' && typeof selectedNodeSizeProperty === 'string') {
      const minMax = Object.values(universalData).reduce(
        (acc, cur) => {
          const value = cur[userOrCommonIdentifier]?.[selectedRadioNodeSize][selectedNodeSizeProperty];
          if (value === null || value === undefined || Number.isNaN(value)) return acc;
          return [Math.min(acc[0], value), Math.max(acc[1], value)];
        },
        [1, 0],
      );
      const sizeScale = scaleLinear<number, number>(minMax, [3, defaultNodeSize + 10]);
      graph.updateEachNodeAttributes((node, attr) => {
        const val = universalData[node]?.[userOrCommonIdentifier]?.[selectedRadioNodeSize][selectedNodeSizeProperty];
        if (val !== null && val !== undefined && !Number.isNaN(val)) attr.size = sizeScale(val);
        else attr.size = 0.5;
        return attr;
      });
    } else if (selectedRadioNodeSize === 'TE' && typeof selectedNodeSizeProperty !== 'string') {
      const propertyArray = Array.from(selectedNodeSizeProperty);
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
            const val = cur[userTEArray.includes(property) ? 'user' : 'common']?.[selectedRadioNodeSize][property];
            if (val === null || val === undefined || Number.isNaN(val)) return acc2;
            return Math.max(acc2, +val);
          }, 0);
          return [Math.min(acc[0], value), Math.max(acc[1], value)];
        },
        [Number.POSITIVE_INFINITY, 0],
      );
      const sizeScale = scaleLinear<number, number>(minMax, [3, defaultNodeSize + 10]);
      graph.updateEachNodeAttributes((node, attr) => {
        const val = propertyArray.reduce((acc, property) => {
          const value =
            universalData[node]?.[userTEArray.includes(property) ? 'user' : 'common']?.[selectedRadioNodeSize][
              property
            ];
          if (value === null || value === undefined || Number.isNaN(+value)) return acc;
          return Math.max(acc, +value);
        }, Number.NEGATIVE_INFINITY);
        if (Number.isFinite(val)) attr.size = sizeScale(val);
        else attr.size = 0.5;
        return attr;
      });
    } else if (selectedRadioNodeSize === 'DEG' && typeof selectedNodeSizeProperty === 'string') {
      const isPValue = P_VALUE_REGEX.test(selectedNodeSizeProperty);
      const max = Object.values(universalData).reduce((acc, cur) => {
        const val = (cur[userOrDiseaseIdentifier] as OtherSection)?.[selectedRadioNodeSize][selectedNodeSizeProperty];
        if (!val) return acc;
        const value = isPValue ? -Math.log10(val) : Math.abs(val);
        if (Number.isNaN(value)) return acc;
        return Math.max(acc, value);
      }, 0);
      const sizeScale = scaleLinear<number, number>([0, max], [3, defaultNodeSize + 10]);
      graph.updateEachNodeAttributes((node, attr) => {
        const val = (universalData[node]?.[userOrDiseaseIdentifier] as OtherSection)?.[selectedRadioNodeSize][
          selectedNodeSizeProperty
        ];
        if (val !== null && val !== undefined && !Number.isNaN(val))
          attr.size = sizeScale(isPValue ? -Math.log10(val) : Math.abs(val));
        else attr.size = 0.5;
        return attr;
      });
    } else if (selectedRadioNodeSize === 'OpenTargets' && typeof selectedNodeSizeProperty === 'string') {
      const minMax = Object.values(universalData).reduce(
        (acc, cur) => {
          const value = (cur[userOrDiseaseIdentifier] as OtherSection)?.[selectedRadioNodeSize][
            selectedNodeSizeProperty
          ];
          if (value === null || value === undefined || Number.isNaN(value)) return acc;
          return [Math.min(acc[0], value), Math.max(acc[1], value)];
        },
        [1, 0],
      );
      const sizeScale = scaleLinear<number, number>(minMax, [3, defaultNodeSize + 10]);
      graph.updateEachNodeAttributes((node, attr) => {
        const val = (universalData[node]?.[userOrDiseaseIdentifier] as OtherSection)?.[selectedRadioNodeSize][
          selectedNodeSizeProperty
        ];
        if (val != null && val !== undefined && !Number.isNaN(val)) attr.size = sizeScale(val);
        else attr.size = 0.5;
        return attr;
      });
    } else if (selectedRadioNodeSize === 'OT_Prioritization' && typeof selectedNodeSizeProperty === 'string') {
      const sizeScale = scaleLinear<number, number>(
        [-1, 0, 1],
        [defaultNodeSize - 10, defaultNodeSize, defaultNodeSize + 10],
      );
      graph.updateEachNodeAttributes((node, attr) => {
        const val = universalData[node]?.[userOrCommonIdentifier]?.[selectedRadioNodeSize][selectedNodeSizeProperty];
        if (val != null && val !== undefined && !Number.isNaN(val)) attr.size = sizeScale(val);
        else attr.size = 0.5;
        return attr;
      });
    }
  }, [selectedNodeSizeProperty, graph, universalData, defaultNodeSize]);

  return null;
}
