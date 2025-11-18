/**
 * Knowledge Graph type definitions and constants
 * Uses Graphology's native SerializedGraph format
 */

import type { SerializedGraph } from 'graphology-types';

// Storage keys for different network types in IndexedDB
export const NETWORK_STORAGE_KEYS = {
  GENE_NETWORK: 'gene_network',
  KNOWLEDGE_GRAPH: 'knowledge_graph',
} as const;

export type NetworkStorageKey = (typeof NETWORK_STORAGE_KEYS)[keyof typeof NETWORK_STORAGE_KEYS];

export const KNOWLEDGE_GRAPH_FILE_FORMATS = ['.json', '.csv', '.graphml', '.gexf'];

/**
 * Re-export Graphology's SerializedGraph type for knowledge graphs
 * This is the standard format we'll use for JSON files
 */
export type KnowledgeGraphData = SerializedGraph;

/**
 * CSV Format Specifications
 */

// Special column names for CSV parsing
export const CSV_SPECIAL_COLUMNS = {
  // Edge special columns (single file format)
  SOURCE_ID: 'source_id',
  SOURCE_NAME: 'source_name',
  SOURCE_TYPE: 'source_type',
  TARGET_ID: 'target_id',
  TARGET_NAME: 'target_name',
  TARGET_TYPE: 'target_type',
  EDGE_TYPE: 'edge_type',
  EDGE_NAME: 'edge_name',

  // Edge special columns (two file format)
  EDGE_SOURCE_ID: 'source_id',
  EDGE_TARGET_ID: 'target_id',
  EDGE_TYPE_ALT: 'type',
  EDGE_NAME_ALT: 'name',

  // Node special columns (two file format)
  NODE_ID: 'id',
  NODE_NAME: 'name',
  NODE_TYPE: 'type',
} as const;

// Prefixes for attribute columns
export const CSV_ATTRIBUTE_PREFIXES = {
  NODE: 'node_',
  SOURCE: 'source_',
  TARGET: 'target_',
  EDGE: 'edge_',
} as const;

/**
 * CSV Format Types
 * Note: These are flexible row types for parsing - actual parsing will handle the special columns
 */

// Single file format (kg.csv) - all columns are dynamic
export type SingleFileCSVRow = Record<string, string | number>;

// Two file format - nodes.csv
export type NodesCSVRow = Record<string, string | number>;

// Two file format - edges.csv
export type EdgesCSVRow = Record<string, string | number>;

/**
 * IndexedDB stored entry for network files
 */
export interface NetworkFileEntry {
  key: NetworkStorageKey;
  file: File;
  timestamp: number;
  format: string;
}
