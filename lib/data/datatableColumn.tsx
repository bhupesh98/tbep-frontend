import type { CellContext, Column, ColumnDef } from '@tanstack/react-table';
import { ArrowUpDownIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Gsea, SelectedNodeProperty } from '@/lib/interface';

function headerHelper<TData>(columnName: string) {
  return ({ column }: { column: Column<TData> }) => {
    return (
      <Button variant='ghost' onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        {columnName}
        <ArrowUpDownIcon className='ml-2 size-4' />
      </Button>
    );
  };
}

export const columnLeidenResults: ColumnDef<Record<string, string>>[] = [
  {
    accessorKey: 'name',
    header: headerHelper('Cluster'),
    cell: ({ cell }: CellContext<Record<string, string>, string>) => (
      <div className='inline-flex items-center gap-2'>
        <span
          className='size-4 rounded-full border'
          style={{ backgroundColor: cell.row.original.color, borderColor: cell.row.original.color }}
        />
        {cell.getValue()}
      </div>
    ),
    meta: { width: '8rem' },
  },
  {
    accessorKey: 'numberOfNodes',
    header: headerHelper('Number of Nodes'),
    sortingFn: (a, b) => Number(a.original.numberOfNodes) - Number(b.original.numberOfNodes),
    meta: { textAlign: 'center' },
  },
  {
    accessorKey: 'percentage',
    header: headerHelper('Percentage'),
    sortingFn: (a, b) => Number(a.original.percentage) - Number(b.original.percentage),
    meta: { textAlign: 'center' },
  },
  {
    accessorKey: 'averageDegree',
    header: headerHelper('Average Degree'),
    sortingFn: (a, b) => Number(a.original.averageDegree) - Number(b.original.averageDegree),
    meta: { textAlign: 'center' },
  },
  {
    accessorKey: 'degreeCentralGene',
    header: headerHelper('Degree Central Gene'),
    meta: { textAlign: 'center' },
  },
  {
    accessorKey: 'nodes',
    header: headerHelper('Nodes'),
    meta: { wordBreak: 'break-word' },
  },
];

export const columnSelectedNodes: ColumnDef<SelectedNodeProperty>[] = [
  {
    accessorKey: 'Gene_Name',
    header: headerHelper('Gene Name'),
  },
  {
    accessorKey: 'ID',
    header: headerHelper('ENSG ID'),
  },
  {
    accessorKey: 'Description',
    header: headerHelper('Description'),
  },
];

export const columnKGSelectedNodes: ColumnDef<{ id: string; label: string; nodeType?: string }>[] = [
  {
    accessorKey: 'id',
    header: headerHelper('Node ID'),
  },
  {
    accessorKey: 'label',
    header: headerHelper('Label'),
  },
  {
    accessorKey: 'nodeType',
    header: headerHelper('Node Type'),
  },
];

export const columnKGConnectedEdges: ColumnDef<{
  source: string;
  target: string;
  sourceLabel?: string;
  targetLabel?: string;
  edgeType?: string;
}>[] = [
  {
    accessorKey: 'source',
    header: headerHelper('Source Node'),
  },
  {
    accessorKey: 'sourceLabel',
    header: headerHelper('Source Label'),
  },
  {
    accessorKey: 'target',
    header: headerHelper('Target Node'),
  },
  {
    accessorKey: 'targetLabel',
    header: headerHelper('Target Label'),
  },
  {
    accessorKey: 'edgeType',
    header: headerHelper('Edge Type'),
  },
];

export const columnGseaResults: ColumnDef<Gsea>[] = [
  {
    accessorKey: 'Pathway',
    header: headerHelper('Pathway'),
  },
  {
    accessorKey: 'Overlap',
    header: headerHelper('Overlap'),
  },
  {
    accessorKey: 'P-value',
    header: headerHelper('P-Value'),
    sortingFn: (a, b) => Number(a.original['P-value']) - Number(b.original['P-value']),
  },
  {
    accessorKey: 'Adjusted P-value',
    header: headerHelper('Adjusted P-Value'),
    sortingFn: (a, b) => Number(a.original['Adjusted P-value']) - Number(b.original['Adjusted P-value']),
  },
  {
    accessorKey: 'Odds Ratio',
    header: headerHelper('Odds Ratio'),
    sortingFn: (a, b) => Number(a.original['Odds Ratio']) - Number(b.original['Odds Ratio']),
  },
  {
    accessorKey: 'Combined Score',
    header: headerHelper('Combined Score'),
    sortingFn: (a, b) => Number(a.original['Combined Score']) - Number(b.original['Combined Score']),
  },
  {
    accessorKey: 'Genes',
    header: headerHelper('Genes'),
    meta: { wordBreak: 'break-word' },
  },
];

export const columnTop10ByDegree: ColumnDef<Record<string, string>>[] = [
  {
    accessorKey: 'ID',
    header: headerHelper('ENSG ID'),
  },
  {
    accessorKey: 'geneName',
    header: headerHelper('Gene Name'),
  },
  {
    accessorKey: 'description',
    header: headerHelper('Description'),
  },
  {
    accessorKey: 'degree',
    header: headerHelper('Degree'),
    sortingFn: (a, b) => Number(a.original.Degree) - Number(b.original.Degree),
    meta: { textAlign: 'center' },
  },
];

export const columnTop10ByBetweenness: ColumnDef<Record<string, string>>[] = [
  {
    accessorKey: 'ID',
    header: headerHelper('ENSG ID'),
  },
  {
    accessorKey: 'geneName',
    header: headerHelper('Gene Name'),
  },
  {
    accessorKey: 'description',
    header: headerHelper('Description'),
  },
  {
    accessorKey: 'betweenness',
    header: headerHelper('Betweenness'),
    sortingFn: (a, b) => Number(a.original.Betweenness) - Number(b.original.Betweenness),
    meta: { textAlign: 'center' },
  },
];

export const columnTop10ByCloseness: ColumnDef<Record<string, string>>[] = [
  {
    accessorKey: 'ID',
    header: headerHelper('ENSG ID'),
  },
  {
    accessorKey: 'geneName',
    header: headerHelper('Gene Name'),
  },
  {
    accessorKey: 'description',
    header: headerHelper('Description'),
  },
  {
    accessorKey: 'closeness',
    header: headerHelper('Closeness'),
    sortingFn: (a, b) => Number(a.original.Closeness) - Number(b.original.Closeness),
    meta: { textAlign: 'center' },
  },
];

export const columnTop10ByEigenvector: ColumnDef<Record<string, string>>[] = [
  {
    accessorKey: 'ID',
    header: headerHelper('ENSG ID'),
  },
  {
    accessorKey: 'geneName',
    header: headerHelper('Gene Name'),
  },
  {
    accessorKey: 'description',
    header: headerHelper('Description'),
  },
  {
    accessorKey: 'eigenvector',
    header: headerHelper('Eigenvector'),
    sortingFn: (a, b) => Number(a.original.Eigenvector) - Number(b.original.Eigenvector),
    meta: { textAlign: 'center' },
  },
];

export const columnTop10ByPageRank: ColumnDef<Record<string, string>>[] = [
  {
    accessorKey: 'ID',
    header: headerHelper('ENSG ID'),
  },
  {
    accessorKey: 'geneName',
    header: headerHelper('Gene Name'),
  },
  {
    accessorKey: 'description',
    header: headerHelper('Description'),
  },
  {
    accessorKey: 'pagerank',
    header: headerHelper('PageRank'),
    sortingFn: (a, b) => Number(a.original.PageRank) - Number(b.original.PageRank),
    meta: { textAlign: 'center' },
  },
];

// KG-specific column definitions (using 'id', 'label', 'nodeType' fields)
export const columnKGTop10ByDegree: ColumnDef<Record<string, string>>[] = [
  {
    accessorKey: 'id',
    header: headerHelper('Node ID'),
  },
  {
    accessorKey: 'label',
    header: headerHelper('Label'),
  },
  {
    accessorKey: 'nodeType',
    header: headerHelper('Node Type'),
  },
  {
    accessorKey: 'degree',
    header: headerHelper('Degree'),
    sortingFn: (a, b) => Number(a.original.degree) - Number(b.original.degree),
    meta: { textAlign: 'center' },
  },
];

export const columnKGTop10ByBetweenness: ColumnDef<Record<string, string>>[] = [
  {
    accessorKey: 'id',
    header: headerHelper('Node ID'),
  },
  {
    accessorKey: 'label',
    header: headerHelper('Label'),
  },
  {
    accessorKey: 'nodeType',
    header: headerHelper('Node Type'),
  },
  {
    accessorKey: 'betweenness',
    header: headerHelper('Betweenness'),
    sortingFn: (a, b) => Number(a.original.betweenness) - Number(b.original.betweenness),
    meta: { textAlign: 'center' },
  },
];

export const columnKGTop10ByCloseness: ColumnDef<Record<string, string>>[] = [
  {
    accessorKey: 'id',
    header: headerHelper('Node ID'),
  },
  {
    accessorKey: 'label',
    header: headerHelper('Label'),
  },
  {
    accessorKey: 'nodeType',
    header: headerHelper('Node Type'),
  },
  {
    accessorKey: 'closeness',
    header: headerHelper('Closeness'),
    sortingFn: (a, b) => Number(a.original.closeness) - Number(b.original.closeness),
    meta: { textAlign: 'center' },
  },
];

export const columnKGTop10ByEigenvector: ColumnDef<Record<string, string>>[] = [
  {
    accessorKey: 'id',
    header: headerHelper('Node ID'),
  },
  {
    accessorKey: 'label',
    header: headerHelper('Label'),
  },
  {
    accessorKey: 'nodeType',
    header: headerHelper('Node Type'),
  },
  {
    accessorKey: 'eigenvector',
    header: headerHelper('Eigenvector'),
    sortingFn: (a, b) => Number(a.original.eigenvector) - Number(b.original.eigenvector),
    meta: { textAlign: 'center' },
  },
];

export const columnKGTop10ByPageRank: ColumnDef<Record<string, string>>[] = [
  {
    accessorKey: 'id',
    header: headerHelper('Node ID'),
  },
  {
    accessorKey: 'label',
    header: headerHelper('Label'),
  },
  {
    accessorKey: 'nodeType',
    header: headerHelper('Node Type'),
  },
  {
    accessorKey: 'pagerank',
    header: headerHelper('PageRank'),
    sortingFn: (a, b) => Number(a.original.pagerank) - Number(b.original.pagerank),
    meta: { textAlign: 'center' },
  },
];

export const columnPathResults: ColumnDef<Record<string, string>>[] = [
  {
    accessorKey: 'pathNumber',
    header: headerHelper('Path #'),
    meta: { textAlign: 'center', width: '5rem' },
  },
  {
    accessorKey: 'length',
    header: headerHelper('Length'),
    sortingFn: (a, b) => Number(a.original.length) - Number(b.original.length),
    meta: { textAlign: 'center', width: '6rem' },
  },
  {
    accessorKey: 'weight',
    header: headerHelper('Weight'),
    sortingFn: (a, b) => {
      const aWeight = a.original.weight === 'N/A' ? -1 : Number(a.original.weight);
      const bWeight = b.original.weight === 'N/A' ? -1 : Number(b.original.weight);
      return aWeight - bWeight;
    },
    meta: { textAlign: 'center', width: '8rem' },
  },
  {
    accessorKey: 'nodes',
    header: headerHelper('Nodes (Labels)'),
    meta: { wordBreak: 'break-word' },
  },
  {
    accessorKey: 'nodeTypes',
    header: headerHelper('Node Types'),
    meta: { wordBreak: 'break-word' },
  },
];

const prioritizationKeys = [
  'Target in clinic',
  'Membrane protein',
  'Secreted protein',
  'Ligand binder',
  'Small molecule binder',
  'Predicted pockets',
  'Mouse ortholog identity',
  'Chemical probes',
  'Genetic constraint',
  'Mouse models',
  'Gene essentiality',
  'Known safety events',
  'Cancer driver gene',
  'Paralogues',
  'Tissue specificity',
  'Tissue distribution',
];

const datasourceKeys = [
  'GWAS associations',
  'Gene Burden',
  'ClinVar',
  'GEL PanelApp',
  'Gene2phenotype',
  'UniProt literature',
  'UniProt curated variants',
  'Orphanet',
  'ClinGen',
  'Cancer Gene Census',
  'IntOGen',
  'ClinVar (somatic)',
  'Cancer Biomarkers',
  'ChEMBL',
  'CRISPR Screens',
  'Project Score',
  'SLAPenrich',
  'PROGENy',
  'Reactome',
  'Gene signatures',
  'Europe PMC',
  'Expression Atlas',
  'IMPC',
];

export type TargetDiseaseAssociationRow = {
  target: string;
  [key: string]: string | number;
};

// Association columns: Target, overall_score, all datasources
export const associationColumns: ColumnDef<TargetDiseaseAssociationRow, string | number | undefined>[] = [
  {
    accessorKey: 'target',
    header: 'Target',
    cell: info => <span className='font-semibold'>{info.getValue()}</span>,
    enableSorting: false,
  },
  {
    accessorKey: 'Association Score',
    header: 'Association Score',
    enableSorting: true,
  },
  ...datasourceKeys.map<ColumnDef<TargetDiseaseAssociationRow, string | number | undefined>>(key => ({
    accessorKey: key,
    header: key,
    enableSorting: true,
  })),
];

// Prioritization columns: Target, overall_score, all prioritization keys
export const prioritizationColumns: ColumnDef<TargetDiseaseAssociationRow, string | number | undefined>[] = [
  {
    accessorKey: 'target',
    header: 'Target',
    cell: info => <span className='font-semibold'>{info.getValue()}</span>,
    enableSorting: false,
  },
  {
    accessorKey: 'Association Score',
    header: 'Association Score',
    enableSorting: true,
  },
  ...prioritizationKeys.map<ColumnDef<TargetDiseaseAssociationRow, string | number | undefined>>(key => ({
    accessorKey: key,
    header: key,
    enableSorting: false,
  })),
];
