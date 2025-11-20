'use client';
import { useLazyQuery } from '@apollo/client/react';
import { useLoadGraph, useSigma } from '@react-sigma/core';
import type EventEmitter from 'events';
import Graph from 'graphology';
import type { SerializedGraph } from 'graphology-types';
import { AlertTriangleIcon } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import Papa from 'papaparse';
import React from 'react';
import { toast } from 'sonner';
import { statisticsGenerator } from '@/lib/analytics';
/******** only for testing with sample graph **************/
// import { data as response } from '@/lib/data/sample-graph.json';
import { GENE_GRAPH_QUERY, GENE_VERIFICATION_QUERY } from '@/lib/gql';
import { useStore } from '@/lib/hooks';
import type {
  EdgeAttributes,
  GeneGraphData,
  GeneGraphVariables,
  GeneVerificationData,
  GeneVerificationVariables,
  NodeAttributes,
} from '@/lib/interface';
import { openDB } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Spinner } from '../ui/spinner';

export function LoadGraph() {
  const searchParams = useSearchParams();
  const loadGraph = useLoadGraph<NodeAttributes, EdgeAttributes>();
  const graphConfig = JSON.parse(localStorage.getItem('graphConfig') || '{}');
  const [fetchData, { loading }] = useLazyQuery<GeneGraphData, GeneGraphVariables>(GENE_GRAPH_QUERY);

  const [fetchFileData] = useLazyQuery<GeneVerificationData, GeneVerificationVariables>(GENE_VERIFICATION_QUERY);
  const [showWarning, setShowWarning] = React.useState<boolean>(false);

  const sigma = useSigma();

  // biome-ignore lint/correctness/useExhaustiveDependencies: No need of extra deps
  React.useEffect(() => {
    const abortController = new AbortController();
    const graph = new Graph<NodeAttributes, EdgeAttributes>({
      type: 'undirected',
    });
    const fileName = searchParams?.get('file');
    (async () => {
      if (fileName) {
        const fileType = fileName.split('.').pop();
        const store = await openDB('network', 'readonly');
        if (!store) {
          toast.error('Error opening IndexedDB!', {
            description: 'Please check your browser settings and try again',
            cancel: {
              label: 'Close',
              onClick: () => window.close(),
            },
          });
          return;
        }
        const req = store.get(fileName);
        req.onsuccess = async () => {
          if (abortController.signal.aborted) return;
          const fileText = await (req.result as File).text();
          let fileData: Array<Record<string, string | number>>;
          let fields: string[] = [];
          if (fileType === 'json') {
            fileData = JSON.parse(fileText);
            fields = Object.entries(fileData?.[0] as object).reduce(
              (prev, curr) => {
                if (typeof curr[1] === 'number') prev[2] = curr[0];
                else if (!prev[0]) prev[0] = curr[0];
                else prev[1] = curr[0];
                return prev;
              },
              [] as unknown as string[],
            );
          } else {
            const parsedResult = Papa.parse<(typeof fileData)[0]>(fileText, {
              header: true,
              skipEmptyLines: true,
              dynamicTyping: true,
            });
            fileData = parsedResult.data;
            fields = parsedResult.meta.fields || [];
          }
          if (fields.length < 3) {
            toast.error('There must be atleast 3 fields in csv/json!', {
              description: 'Fields more than 3 are ignored. Please check the file and try again',
              cancel: {
                label: 'Close',
                onClick: () => window.close(),
              },
            });
            return;
          }
          const geneIDs = new Set<string>();
          for (const gene of fileData) {
            if (gene[fields?.[0]]) geneIDs.add(gene[fields?.[0]] as string);
            if (gene[fields?.[1]]) geneIDs.add(gene[fields?.[1]] as string);
          }
          const geneIDArray = Array.from(geneIDs);
          const result = await fetchFileData({
            variables: {
              geneIDs: geneIDArray,
            },
          });
          if (result.error) {
            toast.warning("Server can't verify the geneIDs!", {
              description: 'Please try again after some time',
              cancel: {
                label: 'Close',
                onClick: () => window.close(),
              },
            });
            return;
          }
          if (!result) return;
          const geneNameToID = new Map<string, string>();
          const geneNames: string[] = [];
          for (const gene of result.data?.genes ?? []) {
            geneNames.push(gene.Gene_name ?? gene.ID);
            if (gene.Gene_name) geneNameToID.set(gene.Gene_name, gene.ID);
            graph.addNode(gene.ID, {
              label: gene.Gene_name,
              ID: gene.ID,
              description: gene.Description,
            });
          }

          const getGeneID = (value: string | null) => {
            if (!value) return null;
            if (value.toLowerCase().startsWith('ensg')) {
              return value;
            }
            return geneNameToID.get(value);
          };

          for (const gene of fileData) {
            const source = getGeneID(gene[fields?.[0]] as string);
            const target = getGeneID(gene[fields?.[1]] as string);

            if (!source || !target) continue;
            graph.mergeEdgeWithKey(`${source}-${target}`, source, target, {
              score: gene[fields?.[2]] as number,
              label: gene[fields?.[2]].toString(),
            });
          }
          loadGraph(graph);
          useStore.setState({
            geneNames,
            geneNameToID,
            networkStatistics: {
              totalNodes: graph.order,
              totalEdges: graph.size,
              averageClusteringCoefficient: Number.NaN,
              ...statisticsGenerator(graph),
            },
          });
        };
      } else {
        const result = await fetchData({
          variables: {
            geneIDs: graphConfig.geneIDs,
            interactionType: graphConfig.interactionType,
            minScore: graphConfig.minScore,
            order: graphConfig.order,
          },
        });
        if (result.error) {
          console.error(result.error);
          alert('Error loading graph! Check console for errors');
          return;
        }
        if (result.data) {
          const { genes, links, graphName, averageClusteringCoefficient } = result.data.getGeneInteractions;
          if (genes.length > 5000 || links.length > 50000) {
            toast.warning('Large graph detected!', {
              description: 'Computation is stopped. Auto closing the graph in 3 seconds to prevent browser crash',
              cancel: {
                label: 'Close',
                onClick: () => window.close(),
              },
            });
            setTimeout(() => window.close(), 3000);
            return;
          }
          if (genes.length > 1000 || links.length > 10000) {
            setShowWarning(true);
          }
          // store graphName in JSON in graphConfig key in localStorage
          localStorage.setItem('graphConfig', JSON.stringify({ ...graphConfig, graphName }));
          useStore.setState({ graphConfig: { ...graphConfig, graphName } });
          const transformedData: Partial<SerializedGraph<NodeAttributes, EdgeAttributes>> = {
            nodes: genes.map(gene => ({
              key: gene.ID,
              attributes: {
                label: gene.Gene_name || '',
                ID: gene.ID,
                description: gene.Description || '',
              },
            })),
            edges: links.map(link => ({
              key: `${link.gene1}-${link.gene2}`,
              source: link.gene1,
              target: link.gene2,
              attributes: {
                score: link.score,
                label: link.score.toString(),
                ...(link.typeScores ? { typeScores: link.typeScores } : {}),
              },
            })),
          };
          if (transformedData) {
            graph.import(transformedData);
            loadGraph(graph);
            (sigma as EventEmitter).emit('loaded');
            const geneNameToID = new Map<string, string>();
            for (const gene of genes) {
              if (gene.Gene_name) geneNameToID.set(gene.Gene_name, gene.ID);
            }

            useStore.setState({
              geneNames: transformedData.nodes?.map(node => node.attributes?.label ?? node.key) || [],
              geneNameToID,
              networkStatistics: {
                totalNodes: graph.order,
                totalEdges: graph.size,
                averageClusteringCoefficient,
                ...statisticsGenerator(graph),
              },
            });
          }
        }
      }
    })().catch(err => {
      if (!abortController.signal.aborted) {
        console.error('Error in LoadGraph:', err);
      }
    });

    return () => {
      abortController.abort();
    };
  }, []);

  return (
    <>
      {loading ? (
        <div className='absolute bottom-0 z-40 grid h-full w-full place-items-center'>
          <div className='flex flex-col items-center'>
            <Spinner />
            Loading...
          </div>
        </div>
      ) : (
        (showWarning || null) && (
          <AlertDialog open={showWarning}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className='flex items-center text-red-500'>
                  <AlertTriangleIcon size={24} className='mr-2' />
                  Warning!
                </AlertDialogTitle>
                <AlertDialogDescription className='text-black'>
                  You are about to generate a graph with a large number of nodes/edges. You may face difficulties in
                  analyzing the graph.
                </AlertDialogDescription>
                <p className='font-semibold text-black'>Are you sure you want to proceed?</p>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => {
                    setShowWarning(false);
                    window.close();
                  }}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setShowWarning(false);
                  }}
                >
                  Continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )
      )}
    </>
  );
}
