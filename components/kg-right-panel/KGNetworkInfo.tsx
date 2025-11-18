'use client';

import React from 'react';
import { toast } from 'sonner';
import { columnKGConnectedEdges, columnKGSelectedNodes } from '@/lib/data';
import { useKGStore } from '@/lib/hooks';
import PopUpDataTable from '../PopUpDataTable';
import { Button } from '../ui/button';

/**
 * KGGraphInfo - Display network statistics and selected nodes
 * Shows selected nodes with 2 tabs: Node Properties | Connected Edges
 */
export function KGNetworkInfo() {
  const totalNodes = useKGStore(state => state.networkStatistics.totalNodes);
  const totalEdges = useKGStore(state => state.networkStatistics.totalEdges);
  const selectedNodes = useKGStore(state => state.selectedNodes);
  const sigmaInstance = useKGStore(state => state.sigmaInstance);
  const [showTable, setShowTable] = React.useState(false);
  const [connectedEdges, setConnectedEdges] = React.useState<
    Array<{ source: string; target: string; sourceLabel?: string; targetLabel?: string; edgeType?: string }>
  >([]);

  const [allNodes, setAllNodes] = React.useState<Array<{ id: string; label: string; nodeType?: string }>>([]);
  const [allEdges, setAllEdges] = React.useState<
    Array<{ source: string; target: string; sourceLabel?: string; targetLabel?: string; edgeType?: string }>
  >([]);

  const handleShowTable = () => {
    if (!sigmaInstance) {
      toast.error('Graph not initialized');
      return;
    }

    const graph = sigmaInstance.getGraph();

    if (selectedNodes.length === 0 && (allNodes.length === 0 || allEdges.length === 0)) {
      // Show all nodes and edges when no selection
      const nodes = graph.mapNodes((node, attributes) => ({
        id: node,
        label: attributes.label || node,
        nodeType: attributes.nodeType,
      }));

      const edges = graph.mapEdges((_edge, attributes, source, target) => {
        const sourceAttrs = graph.getNodeAttributes(source);
        const targetAttrs = graph.getNodeAttributes(target);
        return {
          source,
          target,
          sourceLabel: sourceAttrs.label || source,
          targetLabel: targetAttrs.label || target,
          edgeType: attributes.edgeType || '',
        };
      });

      setAllNodes(nodes);
      setAllEdges(edges);
      setConnectedEdges([]);
    } else {
      // Show connected edges for selected nodes
      const selectedNodeIds = new Set(selectedNodes.map(n => n.id));
      const edges: Array<{
        source: string;
        target: string;
        sourceLabel?: string;
        targetLabel?: string;
        edgeType?: string;
      }> = [];

      for (const nodeId of selectedNodeIds) {
        if (!graph.hasNode(nodeId)) continue;

        graph.forEachEdge(nodeId, (edge, _attributes, source, target) => {
          const edgeAttrs = graph.getEdgeAttributes(edge);
          const sourceAttrs = graph.getNodeAttributes(source);
          const targetAttrs = graph.getNodeAttributes(target);

          edges.push({
            source,
            target,
            sourceLabel: sourceAttrs.label || source,
            targetLabel: targetAttrs.label || target,
            edgeType: edgeAttrs.edgeType || '',
          });
        });
      }

      setConnectedEdges(edges);
    }
    setShowTable(true);
  };

  const displayNodes = selectedNodes.length > 0 ? selectedNodes : allNodes;
  const displayEdges = selectedNodes.length > 0 ? connectedEdges : allEdges;
  const buttonText = selectedNodes.length > 0 ? `Selected Nodes Details (${selectedNodes.length})` : `All Network Data`;

  return (
    <div className='mb-2 rounded border p-2 text-xs shadow-sm'>
      <p className='mb-2 font-bold'>Network Info</p>
      <div className='flex flex-col justify-between'>
        <div className='flex flex-col gap-1'>
          <span>Total Nodes: {totalNodes}</span>
          <span>Total Edges: {totalEdges}</span>
        </div>
        <Button variant='outline' size='sm' className='mt-1 font-semibold text-xs' onClick={handleShowTable}>
          {buttonText}
        </Button>
        <PopUpDataTable
          data={[displayNodes, displayEdges]}
          columns={[columnKGSelectedNodes, columnKGConnectedEdges]}
          dialogTitle={selectedNodes.length > 0 ? 'Selected Nodes' : 'All Network Data'}
          tabsTitle={['Node Properties', 'Edges Properties']}
          open={showTable}
          loading={[false, false]}
          setOpen={setShowTable}
          filterColumnNames={[
            ['id', 'label'],
            ['source', 'target', 'sourceLabel', 'targetLabel'],
          ]}
          description={
            selectedNodes.length > 0
              ? 'View the selected nodes and their details. Switch to "Edges Properties" to see edges linked to these nodes.'
              : 'View all nodes and edges in the network.'
          }
        />
      </div>
    </div>
  );
}
