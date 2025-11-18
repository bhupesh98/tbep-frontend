'use client';

import { useLazyQuery } from '@apollo/client/react';
import { DownloadIcon, SquareDashedMousePointerIcon } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import {
  DISEASE_DEPENDENT_PROPERTIES,
  type DiseaseDependentProperties,
  OPENTARGETS_PROPERTY_MAPPING,
} from '@/lib/data';
import { GENE_PROPERTIES_QUERY, GET_HEADERS_QUERY } from '@/lib/gql';
import { useKGStore, useStore } from '@/lib/hooks';
import type {
  GenePropertiesData,
  GenePropertiesDataVariables,
  GetDiseaseData,
  GetHeadersData,
  GetHeadersVariables,
  OtherSection,
} from '@/lib/interface';
import { envURL, genePropertyCategoryEnumToString, selectedRadioStringToEnum } from '@/lib/utils';
import { MouseControlMessage } from '../app';
import { DiseaseMapCombobox } from '../DiseaseMapCombobox';
import { NodeColor } from '../left-panel/NodeColor';
import { NodeSize } from '../left-panel/NodeSize';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Spinner } from '../ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { KGFileSheet } from './KGFileSheet';
import { NodeColorSelector } from './NodeColorSelector';
import { NodeSearch } from './NodeSearch';
import { NodeSizeSelector } from './NodeSizeSelector';

/**
 * KGLeftSideBar - Main left panel with export, file upload, node coloring/sizing
 * Supports both Gene nodes (with backend API fetching) and non-Gene nodes (file upload only)
 */
export function KGLeftSideBar() {
  const sigmaInstance = useKGStore(state => state.sigmaInstance);
  // Read from useStore for Gene compatibility (NodeColor/NodeSize set these in useStore)
  const selectedRadioNodeSize = useStore(state => state.selectedRadioNodeSize);
  const selectedRadioNodeColor = useStore(state => state.selectedRadioNodeColor);
  // Use useStore for Gene-specific properties
  const radioOptions = useStore(state => state.radioOptions);
  const diseaseName = useStore(state => state.diseaseName);
  const queriedFieldSet = useRef<Set<string>>(new Set());
  const skipCommon = useRef<boolean>(false);
  const [diseaseData, setDiseaseData] = React.useState<GetDiseaseData | undefined>(undefined);
  const [diseaseMap, setDiseaseMap] = React.useState<string>('MONDO_0004976');

  const [fetchHeader, { loading: headerLoading, called }] = useLazyQuery<GetHeadersData, GetHeadersVariables>(
    GET_HEADERS_QUERY,
    {
      returnPartialData: true,
    },
  );

  const [fetchUniversal, { loading: universalLoading }] = useLazyQuery<GenePropertiesData, GenePropertiesDataVariables>(
    GENE_PROPERTIES_QUERY,
  );

  // Initialize disease name and fetch disease list
  useEffect(() => {
    useStore.setState({ diseaseName: 'MONDO_0004976' });
    (async () => {
      try {
        const response = await fetch(`${envURL(process.env.NEXT_PUBLIC_BACKEND_URL)}/diseases`);
        const data = await response.json();
        setDiseaseData(data);
      } catch (error) {
        console.error('Error fetching disease data:', error);
      }
    })();
  }, []);

  // Fetch headers when disease name changes
  useEffect(() => {
    if (!diseaseName) return;
    fetchHeader({
      variables: {
        diseaseId: diseaseName,
        skipCommon: skipCommon.current,
      },
    })
      .then(val => {
        const data = val.data?.headers;
        if (!data) return;
        const currentOptions = useStore.getState().radioOptions;
        const updatedOptions = {
          ...currentOptions,
          database: {
            ...currentOptions.database,
            DEG: data.differentialExpression ?? [],
          },
          user: {
            ...currentOptions.user,
          },
        };
        if (!skipCommon.current) {
          updatedOptions.database.OpenTargets = data.openTargets ?? OPENTARGETS_PROPERTY_MAPPING;
          updatedOptions.database.OT_Prioritization = data.targetPrioritization ?? [];
          updatedOptions.database.Druggability = data.druggability ?? [];
          updatedOptions.database.Pathway = data.pathway ?? [];
          updatedOptions.database.TE = data.tissueSpecificity ?? [];
          skipCommon.current = true;
        }
        useStore.setState({ radioOptions: updatedOptions });
      })
      .catch(err => {
        console.error(err);
      });
  }, [diseaseName, fetchHeader]);

  const handleExport = (format: 'jpeg' | 'json' | 'gexf' | 'graphml' | 'csv') => {
    if (!sigmaInstance) return;
    import('../../lib/graph/kg-export').then(mod => {
      mod.exportKnowledgeGraph(sigmaInstance, format);
    });
  };

  /**
   * Handle property change for both Gene and non-Gene nodes
   * For Gene nodes: fetches data from backend API using GENE_PROPERTIES_QUERY
   * For non-Gene nodes: uses data already loaded from file (nodePropertyData)
   */
  async function handlePropChange(val: string | Set<string>, type: 'color' | 'size') {
    if (!sigmaInstance) return;
    const selectedRadio = type === 'color' ? selectedRadioNodeColor : selectedRadioNodeSize;
    if (!selectedRadio) return;

    const ddp = DISEASE_DEPENDENT_PROPERTIES.includes(selectedRadio as DiseaseDependentProperties);
    const properties = (val instanceof Set ? Array.from(val) : [val]).reduce<string[]>((acc, property) => {
      const userOptions = radioOptions.user[selectedRadio as keyof typeof radioOptions.user] as string[] | undefined;
      const key = `${ddp ? `${diseaseName}_` : ''}${selectedRadio}_${property}`;
      if (!queriedFieldSet.current.has(key) && !(Array.isArray(userOptions) && userOptions.includes(property))) {
        acc.push(property);
      }
      return acc;
    }, []);

    if (properties.length === 0) {
      useStore.setState({
        [type === 'color' ? 'selectedNodeColorProperty' : 'selectedNodeSizeProperty']: val,
      });
    } else {
      const graph = sigmaInstance.getGraph();
      const geneIds = graph.filterNodes(node => graph.getNodeAttribute(node, 'nodeType') === 'Gene');

      if (geneIds.length === 0) {
        useStore.setState({
          [type === 'color' ? 'selectedNodeColorProperty' : 'selectedNodeSizeProperty']: val,
        });
        return;
      }

      try {
        const universalData = useStore.getState().universalData;
        if (Object.keys(universalData).length === 0) {
          for (const nodeId of geneIds) {
            if (universalData[nodeId] === undefined) {
              universalData[nodeId] = {
                common: {
                  Custom_Color: {},
                  OT_Prioritization: {},
                  Druggability: {},
                  Pathway: {},
                  TE: {},
                },
                user: {
                  DEG: {},
                  OpenTargets: {},
                  Custom_Color: {},
                  Druggability: {},
                  Pathway: {},
                  TE: {},
                  OT_Prioritization: {},
                },
              };
            }
          }
        }
        const result = await fetchUniversal({
          variables: {
            geneIds,
            config: [
              {
                category: selectedRadioStringToEnum(selectedRadio),
                properties,
                ...(ddp && { diseaseId: diseaseName }),
              },
            ],
          },
        });

        if (result.error) {
          console.error(result.error);
          return;
        }

        properties.forEach(p => {
          queriedFieldSet.current.add(`${ddp ? `${diseaseName}_` : ''}${selectedRadio}_${p}`);
        });

        for (const { ID, data } of result.data?.geneProperties ?? []) {
          const geneRecord = universalData[ID];

          for (const { key, score, category: categoryEnum, diseaseId } of data) {
            const category = genePropertyCategoryEnumToString(categoryEnum);
            if (diseaseId) {
              if (category !== 'DEG' && category !== 'OpenTargets') continue;
              if (geneRecord?.[diseaseId] === undefined) {
                geneRecord[diseaseId] = {
                  DEG: {},
                  OpenTargets: {},
                } as OtherSection;
              }
              (geneRecord[diseaseId] as OtherSection)[category][key] = score;
            } else {
              if (category === 'DEG' || category === 'OpenTargets') continue;
              if (geneRecord.common?.[category]) {
                geneRecord.common[category][key] = score;
              }
            }
          }
        }

        useStore.setState({
          universalData,
          [type === 'color' ? 'selectedNodeColorProperty' : 'selectedNodeSizeProperty']: val,
        });
      } catch (error) {
        console.error('Error fetching gene properties:', error);
      }
    }
  }

  /**
   * Handle disease change - updates both local state and KG store
   */
  async function handleDiseaseChange(disease: string) {
    setDiseaseMap(disease);
    useStore.setState({ diseaseName: disease });
  }

  /**
   * Handle property change for non-Gene nodes using NodeColorSelector/NodeSizeSelector
   */
  function handleKGPropChange(val: string, type: 'color' | 'size') {
    useKGStore.setState({
      [type === 'color' ? 'selectedNodeColorProperty' : 'selectedNodeSizeProperty']: val,
    });
  }

  // Check if graph has Gene nodes
  const hasGeneNodes = sigmaInstance?.getGraph().someNode((_node, attr) => attr.nodeType === 'Gene');

  return (
    <ScrollArea className='flex h-[calc(96vh-1.5px)] flex-col border-r p-2'>
      <div className='flex gap-2'>
        {/* Export dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className='w-[calc(100%-1.5rem)]' variant='outline'>
              <DownloadIcon className='mr-2 size-4' />
              Export Graph
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='start'>
            <DropdownMenuItem onClick={() => handleExport('jpeg')}>JPEG</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('json')}>JSON</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('gexf')}>GEXF</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('graphml')}>GraphML</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('csv')}>CSV</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Mouse control tooltip */}
        <Tooltip>
          <TooltipTrigger className='relative'>
            <MouseControlMessage className='bottom-3' />
            <SquareDashedMousePointerIcon className='size-4' />
          </TooltipTrigger>
          <TooltipContent align='start' className='max-w-96 text-sm'>
            <ol>
              <li>• Drag nodes to reposition them</li>
              <li>• Click nodes to view properties</li>
              <li>• Click edges to view connection details</li>
              <li>• Use mouse wheel to zoom</li>
            </ol>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Disease selector for Gene nodes */}
      {hasGeneNodes && (
        <div className='flex flex-col'>
          <Label className='mb-2 font-bold'>Disease Map</Label>
          <div className='flex w-full items-center'>
            <div className='min-w-0 grow px-2'>
              <DiseaseMapCombobox
                value={diseaseMap}
                onChange={d => typeof d === 'string' && handleDiseaseChange(d)}
                data={diseaseData}
                className='w-full'
              />
            </div>
            {(!called || (called && headerLoading) || diseaseData === undefined || universalLoading) && (
              <div className='fade-in zoom-in mr-1 animate-in duration-100'>
                <Spinner size='small' />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {universalLoading && !hasGeneNodes && (
        <div className='my-2 flex items-center justify-center'>
          <Spinner size='small' />
          <span className='ml-2 text-xs'>Loading properties...</span>
        </div>
      )}

      {/* Conditional rendering based on whether graph has Gene nodes */}
      {hasGeneNodes ? (
        <>
          {/* Gene node controls - use NodeColor/NodeSize from left-panel */}
          <NodeColor onPropChange={val => handlePropChange(val, 'color')} />
          <NodeSize onPropChange={val => handlePropChange(val, 'size')} />
        </>
      ) : (
        <>
          {/* Non-Gene node controls - use NodeColorSelector/NodeSizeSelector */}
          <NodeColorSelector onPropChangeAction={val => handleKGPropChange(val, 'color')} />
          <NodeSizeSelector onPropChangeAction={val => handleKGPropChange(val, 'size')} />
        </>
      )}

      {/* Common controls */}
      <div className='mb-2 flex flex-col space-y-2'>
        <NodeSearch />
        <KGFileSheet />
      </div>
    </ScrollArea>
  );
}
