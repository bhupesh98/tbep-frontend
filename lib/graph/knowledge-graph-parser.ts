/**
 * Knowledge Graph File Parsers
 *
 * This module provides functions to parse various file formats into Graphology SerializedGraph format.
 * Supports: JSON, CSV (single/two-file), GraphML, GEXF
 */

import Graph from 'graphology';
import type { SerializedGraph } from 'graphology-types';
import Papa from 'papaparse';
import { CSV_ATTRIBUTE_PREFIXES, CSV_SPECIAL_COLUMNS } from '@/lib/interface/knowledge-graph';

/**
 * Validate that required columns exist in CSV headers
 */
function validateCSVColumns(headers: string[], required: string[]): void {
  const missing = required.filter(col => !headers.includes(col));
  if (missing.length > 0) {
    throw new Error(`Missing required columns: ${missing.join(', ')}`);
  }
}

/**
 * Parse JSON files (Graphology SerializedGraph format)
 */
export async function parseJSON(file: File): Promise<SerializedGraph> {
  const text = await file.text();
  const data = JSON.parse(text);

  // Validate it's a proper Graphology SerializedGraph
  const isPlainObject = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v);

  if (!isPlainObject(data)) {
    throw new Error('Invalid JSON: expected an object at the root.');
  }

  const nodes = (data as Record<string, unknown>).nodes;
  const edges = (data as Record<string, unknown>).edges;

  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    throw new Error('Invalid JSON format. Expected "nodes" and "edges" arrays.');
  }

  // Optional root fields
  if ('attributes' in data && !isPlainObject((data as Record<string, unknown>).attributes)) {
    throw new Error('Invalid "attributes": expected an object.');
  }
  if ('options' in data && !isPlainObject((data as Record<string, unknown>).options)) {
    throw new Error('Invalid "options": expected an object.');
  }

  // Validate nodes: array of { key: string, attributes?: object }
  const nodeKeys = new Set<string>();
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i] as unknown;
    if (!isPlainObject(n)) {
      throw new Error(`nodes[${i}] must be an object.`);
    }
    const key = (n as Record<string, unknown>).key;
    if (typeof key !== 'string' || key.length === 0) {
      throw new Error(`nodes[${i}].key must be a non-empty string.`);
    }
    if (nodeKeys.has(key)) {
      throw new Error(`Duplicate node key "${key}" found at nodes[${i}].`);
    }
    nodeKeys.add(key);

    const attrs = (n as Record<string, unknown>).attributes;
    if (attrs !== undefined && !isPlainObject(attrs)) {
      throw new Error(`nodes[${i}].attributes must be an object when provided.`);
    }
  }

  // Validate edges: array of { source: string, target: string, key?: string, attributes?: object, undirected?: boolean }
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i] as unknown;
    if (!isPlainObject(e)) {
      throw new Error(`edges[${i}] must be an object.`);
    }

    const source = (e as Record<string, unknown>).source;
    const target = (e as Record<string, unknown>).target;
    if (typeof source !== 'string' || source.length === 0) {
      throw new Error(`edges[${i}].source must be a non-empty string.`);
    }
    if (typeof target !== 'string' || target.length === 0) {
      throw new Error(`edges[${i}].target must be a non-empty string.`);
    }

    // Ensure endpoints exist as nodes
    if (!nodeKeys.has(source)) {
      throw new Error(`edges[${i}].source "${source}" does not match any node key.`);
    }
    if (!nodeKeys.has(target)) {
      throw new Error(`edges[${i}].target "${target}" does not match any node key.`);
    }

    const eKey = (e as Record<string, unknown>).key;
    if (eKey !== undefined && typeof eKey !== 'string') {
      throw new Error(`edges[${i}].key must be a string when provided.`);
    }

    const undirected = (e as Record<string, unknown>).undirected;
    if (undirected !== undefined && typeof undirected !== 'boolean') {
      throw new Error(`edges[${i}].undirected must be a boolean when provided.`);
    }

    const attrs = (e as Record<string, unknown>).attributes;
    if (attrs !== undefined && !isPlainObject(attrs)) {
      throw new Error(`edges[${i}].attributes must be an object when provided.`);
    }
  }

  return data as SerializedGraph;
}

/**
 * Parse single CSV file (kg.csv with source_id, target_id, edge_type, etc.)
 */
export async function parseSingleCSV(file: File): Promise<SerializedGraph> {
  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    throw new Error(`CSV parsing errors: ${parsed.errors.map(e => e.message).join(', ')}`);
  }

  if (parsed.data.length === 0) {
    throw new Error('CSV file is empty or has no data rows');
  }

  // Validate required columns
  const headers = Object.keys(parsed.data[0] || {});
  validateCSVColumns(headers, [CSV_SPECIAL_COLUMNS.SOURCE_ID, CSV_SPECIAL_COLUMNS.TARGET_ID]);

  // Analyze data to determine graph options and edge directionality
  let hasSelfLoops = false;
  let needsMultiEdges = false;
  const edgeMap = new Map<string, number>(); // Track source-target pairs
  const edgeAttrsMap = new Map<string, string>(); // Track edge attributes for twin detection

  for (const row of parsed.data) {
    const sourceId = row[CSV_SPECIAL_COLUMNS.SOURCE_ID];
    const targetId = row[CSV_SPECIAL_COLUMNS.TARGET_ID];

    if (!sourceId || !targetId) continue;

    // Check for self-loops
    if (sourceId === targetId) {
      hasSelfLoops = true;
    }

    // Check for multiple edges between same nodes
    const edgeKey = `${sourceId}->${targetId}`;
    const count = edgeMap.get(edgeKey) || 0;
    edgeMap.set(edgeKey, count + 1);

    if (count >= 1) {
      needsMultiEdges = true;
    }

    // Store edge attributes for directionality analysis (only edge_* attributes)
    const edgeAttrs: string[] = [];
    for (const [key, value] of Object.entries(row)) {
      if (key.startsWith(CSV_ATTRIBUTE_PREFIXES.EDGE) || key === CSV_SPECIAL_COLUMNS.EDGE_TYPE) {
        edgeAttrs.push(`${key}:${value}`);
      }
    }
    edgeAttrsMap.set(edgeKey, edgeAttrs.sort().join('|'));
  }

  const graph = new Graph({
    type: 'mixed',
    multi: needsMultiEdges,
    allowSelfLoops: hasSelfLoops,
  });

  for (const row of parsed.data) {
    // Extract source node
    const sourceId = row[CSV_SPECIAL_COLUMNS.SOURCE_ID];
    const sourceName = row[CSV_SPECIAL_COLUMNS.SOURCE_NAME] || sourceId;
    const sourceType = row[CSV_SPECIAL_COLUMNS.SOURCE_TYPE];

    // Extract target node
    const targetId = row[CSV_SPECIAL_COLUMNS.TARGET_ID];
    const targetName = row[CSV_SPECIAL_COLUMNS.TARGET_NAME] || targetId;
    const targetType = row[CSV_SPECIAL_COLUMNS.TARGET_TYPE];

    // Extract edge type
    const edgeType = row[CSV_SPECIAL_COLUMNS.EDGE_TYPE];
    const edgeName = row[CSV_SPECIAL_COLUMNS.EDGE_NAME];

    // Process source node attributes (source_* prefix)
    const sourceAttrs: Record<string, string> = {};
    const targetAttrs: Record<string, string> = {};
    const edgeAttrs: Record<string, string> = {};

    for (const [key, value] of Object.entries(row)) {
      const sourceSpecialColumns = [
        CSV_SPECIAL_COLUMNS.SOURCE_ID,
        CSV_SPECIAL_COLUMNS.SOURCE_NAME,
        CSV_SPECIAL_COLUMNS.SOURCE_TYPE,
      ] as const;
      const targetSpecialColumns = [
        CSV_SPECIAL_COLUMNS.TARGET_ID,
        CSV_SPECIAL_COLUMNS.TARGET_NAME,
        CSV_SPECIAL_COLUMNS.TARGET_TYPE,
      ] as const;

      const edgeSpecialColumns = [CSV_SPECIAL_COLUMNS.EDGE_TYPE, CSV_SPECIAL_COLUMNS.EDGE_NAME] as const;

      if (key.startsWith(CSV_ATTRIBUTE_PREFIXES.SOURCE) && !(sourceSpecialColumns as readonly string[]).includes(key)) {
        const attrName = key.replace(CSV_ATTRIBUTE_PREFIXES.SOURCE, '');
        sourceAttrs[attrName] = value;
      } else if (
        key.startsWith(CSV_ATTRIBUTE_PREFIXES.TARGET) &&
        !(targetSpecialColumns as readonly string[]).includes(key)
      ) {
        const attrName = key.replace(CSV_ATTRIBUTE_PREFIXES.TARGET, '');
        targetAttrs[attrName] = value;
      } else if (
        key.startsWith(CSV_ATTRIBUTE_PREFIXES.EDGE) &&
        !(edgeSpecialColumns as readonly string[]).includes(key)
      ) {
        const attrName = key.replace(CSV_ATTRIBUTE_PREFIXES.EDGE, '');
        edgeAttrs[attrName] = value;
      }
    }

    // Add source node (deduplicate)
    if (!graph.hasNode(sourceId)) {
      graph.addNode(sourceId, {
        label: sourceName,
        ...(sourceType && { nodeType: sourceType }),
        ...sourceAttrs,
      });
    } else {
      // Merge attributes if node exists
      graph.mergeNodeAttributes(sourceId, sourceAttrs);
    }

    // Add target node (deduplicate)
    if (!graph.hasNode(targetId)) {
      graph.addNode(targetId, {
        label: targetName,
        ...(targetType && { nodeType: targetType }),
        ...targetAttrs,
      });
    } else {
      // Merge attributes if node exists
      graph.mergeNodeAttributes(targetId, targetAttrs);
    }

    // Determine if edge should be undirected
    const forwardKey = `${sourceId}->${targetId}`;
    const reverseKey = `${targetId}->${sourceId}`;
    const forwardAttrs = edgeAttrsMap.get(forwardKey);
    const reverseAttrs = edgeAttrsMap.get(reverseKey);

    // Add undirected edge only once (when processing the first direction)
    const isUndirected = forwardAttrs === reverseAttrs && edgeMap.has(reverseKey);
    const shouldSkip = isUndirected && reverseKey < forwardKey; // Skip if reverse was already processed

    if (!shouldSkip) {
      const edgeLabel = edgeName || edgeType;
      if (isUndirected) {
        graph.addUndirectedEdge(sourceId, targetId, {
          ...(edgeType && { edgeType }),
          ...(edgeLabel && { label: edgeLabel }),
          ...edgeAttrs,
        });
      } else {
        graph.addEdge(sourceId, targetId, {
          ...(edgeType && { edgeType }),
          ...(edgeLabel && { label: edgeLabel }),
          ...edgeAttrs,
        });
      }
    }
  }
  console.log(graph.export());

  return graph.export();
}

/**
 * Parse two CSV files (nodes.csv + edges.csv)
 */
export async function parseTwoCSV(nodesFile: File, edgesFile: File): Promise<SerializedGraph> {
  // Parse nodes file first (needed for validation)
  const nodesText = await nodesFile.text();
  const nodesParsed = Papa.parse<Record<string, string>>(nodesText, {
    header: true,
    skipEmptyLines: true,
  });

  if (nodesParsed.errors.length > 0) {
    throw new Error(`Nodes CSV parsing errors: ${nodesParsed.errors.map(e => e.message).join(', ')}`);
  }

  if (nodesParsed.data.length === 0) {
    throw new Error('Nodes CSV file is empty or has no data rows');
  }

  // Validate nodes required columns
  const nodesHeaders = Object.keys(nodesParsed.data[0] || {});
  validateCSVColumns(nodesHeaders, [CSV_SPECIAL_COLUMNS.NODE_ID]);

  // Parse edges file for analysis
  const edgesText = await edgesFile.text();
  const edgesParsed = Papa.parse<Record<string, string>>(edgesText, {
    header: true,
    skipEmptyLines: true,
  });

  if (edgesParsed.errors.length > 0) {
    throw new Error(`Edges CSV parsing errors: ${edgesParsed.errors.map(e => e.message).join(', ')}`);
  }

  if (edgesParsed.data.length === 0) {
    throw new Error('Edges CSV file is empty or has no data rows');
  }

  // Validate edges required columns
  const edgesHeaders = Object.keys(edgesParsed.data[0] || {});
  validateCSVColumns(edgesHeaders, [CSV_SPECIAL_COLUMNS.EDGE_SOURCE_ID, CSV_SPECIAL_COLUMNS.EDGE_TARGET_ID]);

  // Analyze edges to determine graph options and edge directionality
  let hasSelfLoops = false;
  let needsMultiEdges = false;
  const edgeMap = new Map<string, number>(); // Track source-target pairs
  const edgeAttrsMap = new Map<string, string>(); // Track edge attributes for twin detection

  for (const row of edgesParsed.data) {
    const sourceId = row[CSV_SPECIAL_COLUMNS.EDGE_SOURCE_ID];
    const targetId = row[CSV_SPECIAL_COLUMNS.EDGE_TARGET_ID];

    if (!sourceId || !targetId) continue;

    // Check for self-loops
    if (sourceId === targetId) {
      hasSelfLoops = true;
    }

    // Check for multiple edges between same nodes
    const edgeKey = `${sourceId}->${targetId}`;
    const count = edgeMap.get(edgeKey) || 0;
    edgeMap.set(edgeKey, count + 1);

    if (count >= 1) {
      needsMultiEdges = true;
    }

    // Store edge attributes for directionality analysis (edge_* attributes and special columns)
    const edgeAttrs: string[] = [];
    for (const [key, value] of Object.entries(row)) {
      if (
        key.startsWith(CSV_ATTRIBUTE_PREFIXES.EDGE) ||
        key === CSV_SPECIAL_COLUMNS.EDGE_TYPE_ALT ||
        key === CSV_SPECIAL_COLUMNS.EDGE_NAME
      ) {
        edgeAttrs.push(`${key}:${value}`);
      }
    }
    edgeAttrsMap.set(edgeKey, edgeAttrs.sort().join('|'));
  }

  // Create graph with analyzed options
  const graph = new Graph({
    type: 'mixed',
    multi: needsMultiEdges,
    allowSelfLoops: hasSelfLoops,
  });

  // Add nodes
  for (const row of nodesParsed.data) {
    const nodeId = row[CSV_SPECIAL_COLUMNS.NODE_ID];
    if (!nodeId) continue;

    const nodeName = row[CSV_SPECIAL_COLUMNS.NODE_NAME] || nodeId;
    const nodeType = row[CSV_SPECIAL_COLUMNS.NODE_TYPE];

    // Extract node_* attributes
    const nodeAttrs: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      if (key.startsWith(CSV_ATTRIBUTE_PREFIXES.NODE)) {
        const attrName = key.replace(CSV_ATTRIBUTE_PREFIXES.NODE, '');
        nodeAttrs[attrName] = value;
      }
    }

    graph.addNode(nodeId, {
      label: nodeName,
      ...(nodeType && { nodeType }),
      ...nodeAttrs,
    });
  }

  // Add edges
  for (const row of edgesParsed.data) {
    const sourceId = row[CSV_SPECIAL_COLUMNS.EDGE_SOURCE_ID];
    const targetId = row[CSV_SPECIAL_COLUMNS.EDGE_TARGET_ID];

    if (!sourceId || !targetId) continue;

    const edgeType = row[CSV_SPECIAL_COLUMNS.EDGE_TYPE_ALT];
    const edgeName = row[CSV_SPECIAL_COLUMNS.EDGE_NAME_ALT];

    // Extract edge_* attributes
    const edgeAttrs: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      if (key.startsWith(CSV_ATTRIBUTE_PREFIXES.EDGE)) {
        const attrName = key.replace(CSV_ATTRIBUTE_PREFIXES.EDGE, '');
        edgeAttrs[attrName] = value;
      }
    }

    // Create nodes if they don't exist (auto-create missing nodes)
    if (!graph.hasNode(sourceId)) {
      graph.addNode(sourceId, { label: sourceId });
    }
    if (!graph.hasNode(targetId)) {
      graph.addNode(targetId, { label: targetId });
    }
    // Determine if edge should be undirected
    const forwardKey = `${sourceId}->${targetId}`;
    const reverseKey = `${targetId}->${sourceId}`;
    const forwardAttrs = edgeAttrsMap.get(forwardKey);
    const reverseAttrs = edgeAttrsMap.get(reverseKey);

    // Add undirected edge only once (when processing the first direction)
    const isUndirected = forwardAttrs === reverseAttrs && edgeMap.has(reverseKey);
    const shouldSkip = isUndirected && reverseKey < forwardKey; // Skip if reverse was already processed

    if (!shouldSkip) {
      const edgeLabel = edgeName || edgeType;
      if (isUndirected) {
        graph.addUndirectedEdge(sourceId, targetId, {
          ...(edgeType && { edgeType }),
          ...(edgeLabel && { label: edgeLabel }),
          ...edgeAttrs,
        });
      } else {
        graph.addEdge(sourceId, targetId, {
          ...(edgeType && { edgeType }),
          ...(edgeLabel && { label: edgeLabel }),
          ...edgeAttrs,
        });
      }
    }
  }

  return graph.export();
}

/**
 * Parse GraphML files using graphology-graphml
 */
export async function parseGraphML(file: File): Promise<SerializedGraph> {
  const { parse } = await import('graphology-graphml');
  const text = await file.text();

  try {
    const graph = parse(Graph, text);
    return graph.export();
  } catch (error) {
    throw new Error(`GraphML parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse GEXF files using graphology-gexf
 */
export async function parseGEXF(file: File): Promise<SerializedGraph> {
  const { parse } = await import('graphology-gexf');
  const text = await file.text();

  try {
    const graph = parse(Graph, text);
    return graph.export();
  } catch (error) {
    throw new Error(`GEXF parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
