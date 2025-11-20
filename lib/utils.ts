import { type ClassValue, clsx } from 'clsx';
import EventEmitter from 'events';
import { twMerge } from 'tailwind-merge';
import { GenePropertyCategoryEnum, type GenePropertyMetadata, OrderByEnum } from './interface';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getProperty(val: string | GenePropertyMetadata) {
  return typeof val === 'string' ? val : val.name;
}

export async function openDB(objectStoreName: string, mode: IDBTransactionMode) {
  return new Promise<IDBObjectStore | null>((resolve, reject) => {
    const request = indexedDB.open('universal', 1);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(objectStoreName, mode);
      const store = tx.objectStore(objectStoreName);
      resolve(store);
    };
    request.onerror = () => reject(null);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore('network');
      db.createObjectStore('files');
    };
  });
}

/**
 * Gives array of unique values
 * @param arr
 * @returns
 */
export function distinct<T>(arr: T[]): Array<T> {
  return Array.from(new Set(arr));
}

/**
 * Formats bytes to human readable format
 * @param bytes Number of bytes
 * @param decimals Number of decimal places
 * @returns Formatted string
 */
export function formatBytes(bytes: number | string, decimals = 2): string {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(+bytes) / Math.log(k));
  return `${Number.parseFloat((+bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}

export const eventEmitter = new EventEmitter();
export enum Events {
  ALGORITHM = 'algorithm',
  ALGORITHM_RESULTS = 'algorithm-results',
  EXPORT = 'export',
  VISIBLE_NODES = 'visible-nodes',
  VISIBLE_NODES_RESULTS = 'visible-nodes-results',
}
export type EventMessage = {
  [Events.ALGORITHM]: {
    name: string;
    parameters?: Record<string, string>;
  };
  [Events.EXPORT]: {
    format: 'png' | 'csv';
    all?: boolean;
    csvType?: 'universal' | 'interaction' | 'both';
  };
  [Events.ALGORITHM_RESULTS]: {
    modularity?: number;
    communities?: Array<{
      name: string;
      nodes: string[];
      color: string;
      percentage: string;
      averageDegree: string;
      degreeCentralNode: string;
    }>;
    resolution?: number;
    dwpcScore?: number;
    pathCount?: number;
    paths?: Array<{
      nodes: string[];
      labels: string[];
      weight?: number;
      length?: number;
      nodeTypes?: string[];
    }>;
    metapath?: string[];
    allMetapaths?: string[][];
    damping?: number;
    timedOut?: boolean;
    minHopsNeeded?: number;
    subgraphNodeCount?: number;
    subgraphEdgeCount?: number;
    depth?: number;
  };
  [Events.VISIBLE_NODES_RESULTS]: {
    visibleNodeGeneIds: Set<string>;
  };
};

export function envURL(env?: string) {
  return (env || 'https://tbep.missouri.edu').replace(/\/$/, '');
}

export function initRadioOptions() {
  return {
    DEG: [],
    Pathway: [],
    Druggability: [],
    TE: [],
    Custom_Color: [],
    OpenTargets: [],
    OT_Prioritization: [],
  };
}

export const P_VALUE_REGEX = /^p[-_ ]?val(?:ue)?/i;
export const LOGFC_REGEX = /^LogFC_/i;

export function downloadFile(content: string, filename: string, type = 'text/csv') {
  const element = document.createElement('a');
  const file = new Blob([content], { type });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  URL.revokeObjectURL(element.href);
  element.remove();
}

export function orderByStringToEnum(orderBy: string): OrderByEnum {
  const mapping: Record<string, OrderByEnum> = {
    'Association Score': OrderByEnum.SCORE,
    'GWAS associations': OrderByEnum.GWAS_ASSOCIATIONS,
    'Gene Burden': OrderByEnum.GENE_BURDEN,
    ClinVar: OrderByEnum.CLINVAR,
    'GEL PanelApp': OrderByEnum.GEL_PANEL_APP,
    Gene2phenotype: OrderByEnum.GENE2PHENOTYPE,
    'UniProt literature': OrderByEnum.UNIPROT_LITERATURE,
    'UniProt curated variants': OrderByEnum.UNIPROT_CURATED_VARIANTS,
    Orphanet: OrderByEnum.ORPHANET,
    ClinGen: OrderByEnum.CLINGEN,
    'Cancer Gene Census': OrderByEnum.CANCER_GENE_CENSUS,
    IntOGen: OrderByEnum.INTOGEN,
    'ClinVar (somatic)': OrderByEnum.CLINVAR_SOMATIC,
    'Cancer Biomarkers': OrderByEnum.CANCER_BIOMARKERS,
    ChEMBL: OrderByEnum.CHEMBL,
    'CRISPR Screens': OrderByEnum.CRISPR_SCREENS,
    'Project Score': OrderByEnum.PROJECT_SCORE,
    SLAPenrich: OrderByEnum.SLAPENRICH,
    PROGENy: OrderByEnum.PROGENY,
    Reactome: OrderByEnum.REACTOME,
    'Gene signatures': OrderByEnum.GENE_SIGNATURES,
    'Europe PMC': OrderByEnum.EUROPE_PMC,
    'Expression Atlas': OrderByEnum.EXPRESSION_ATLAS,
    IMPC: OrderByEnum.IMPC,
  };
  return mapping[orderBy] || OrderByEnum.SCORE;
}

export function selectedRadioStringToEnum(selectedRadio: string): GenePropertyCategoryEnum {
  const mapping: Record<string, GenePropertyCategoryEnum> = {
    DEG: GenePropertyCategoryEnum.DIFFERENTIAL_EXPRESSION,
    Pathway: GenePropertyCategoryEnum.PATHWAY,
    Druggability: GenePropertyCategoryEnum.DRUGGABILITY,
    TE: GenePropertyCategoryEnum.TISSUE_EXPRESSION,
    OpenTargets: GenePropertyCategoryEnum.OPEN_TARGETS,
    OT_Prioritization: GenePropertyCategoryEnum.OT_PRIORITIZATION,
  };
  return mapping[selectedRadio];
}

export function genePropertyCategoryEnumToString(category: GenePropertyCategoryEnum) {
  const mapping = {
    [GenePropertyCategoryEnum.DIFFERENTIAL_EXPRESSION]: 'DEG',
    [GenePropertyCategoryEnum.PATHWAY]: 'Pathway',
    [GenePropertyCategoryEnum.DRUGGABILITY]: 'Druggability',
    [GenePropertyCategoryEnum.TISSUE_EXPRESSION]: 'TE',
    [GenePropertyCategoryEnum.OPEN_TARGETS]: 'OpenTargets',
    [GenePropertyCategoryEnum.OT_PRIORITIZATION]: 'OT_Prioritization',
  } as const;
  return mapping[category];
}
