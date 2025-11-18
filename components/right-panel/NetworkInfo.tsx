'use client';

import React, { useEffect } from 'react';
import { columnGseaResults, columnSelectedNodes } from '@/lib/data';
import { useStore } from '@/lib/hooks';
import type { Gsea } from '@/lib/interface';
import { envURL } from '@/lib/utils';
import PopUpDataTable from '../PopUpDataTable';
import { Button } from '../ui/button';

export function NetworkInfo() {
  const totalNodes = useStore(state => state.networkStatistics.totalNodes);
  const totalEdges = useStore(state => state.networkStatistics.totalEdges);
  const selectedNodes = useStore(state => state.selectedNodes);
  const [showTable, setShowTable] = React.useState(false);
  const [gseaData, setGseaData] = React.useState<Array<Gsea>>([]);
  const [gseaLoading, setGseaLoading] = React.useState(false);

  useEffect(() => {
    if (selectedNodes.length === 0) return;
    (async () => {
      setGseaLoading(true);
      setShowTable(true);
      const response = await fetch(`${envURL(process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL)}/gsea`, {
        method: 'POST',
        body: JSON.stringify(selectedNodes.map(node => node.Gene_Name)),
        headers: { 'Content-Type': 'application/json' },
        cache: 'force-cache',
      });
      const data: Array<Gsea> = await response.json();
      setGseaData(data);
      setGseaLoading(false);
    })();
  }, [selectedNodes]);

  return (
    <div className='mb-2 rounded border p-2 text-xs shadow-sm'>
      <p className='mb-2 font-bold'>Network Info</p>
      <div className='flex flex-col justify-between'>
        <div className='flex flex-col gap-1'>
          <span>Total Nodes: {totalNodes}</span>
          <span>Total Edges: {totalEdges}</span>
        </div>
        {(selectedNodes.length || null) && (
          <Button variant='outline' size='sm' className='mt-1 font-semibold' onClick={() => setShowTable(true)}>
            Selected Genes Details ({selectedNodes.length})
          </Button>
        )}
        <PopUpDataTable
          data={[selectedNodes, gseaData]}
          columns={[columnSelectedNodes, columnGseaResults]}
          dialogTitle={'Selected Genes'}
          tabsTitle={['Details', 'GSEA Analysis']}
          open={showTable}
          loading={[false, gseaLoading]}
          setOpen={setShowTable}
          filterColumnNames={['Gene_Name', 'Pathway']}
          description='View the selected nodes and their details. Switch to "GSEA Analysis" to see gene set enrichment analysis results.'
        />
      </div>
    </div>
  );
}
