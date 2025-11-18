'use client';

import Papa from 'papaparse';
import type Sigma from 'sigma';
import { toast } from 'sonner';
import type { EdgeAttributes, NodeAttributes } from '@/lib/interface';
import { downloadFile } from '@/lib/utils';

/**
 * Export knowledge graph in multiple formats
 * Supports: JPEG, JSON, GEXF, GraphML, CSV
 */
export function exportKnowledgeGraph(
  sigmaInstance: Sigma<NodeAttributes, EdgeAttributes>,
  format: 'jpeg' | 'json' | 'gexf' | 'graphml' | 'csv',
) {
  if (!sigmaInstance) {
    toast.error('Graph not initialized');
    return;
  }

  const graph = sigmaInstance.getGraph();

  try {
    switch (format) {
      case 'jpeg': {
        import('@sigma/export-image').then(mod => {
          mod.downloadAsImage(sigmaInstance, {
            format: 'jpeg',
            fileName: 'knowledge-graph',
            backgroundColor: 'white',
          });
        });
        break;
      }
      case 'json': {
        const jsonData = graph.export();
        downloadFile(JSON.stringify(jsonData, null, 2), 'knowledge-graph.json');
        break;
      }
      case 'gexf': {
        import('graphology-gexf/browser').then(mod => {
          const gexfString = mod.write(graph);
          downloadFile(gexfString, 'knowledge-graph.gexf');
        });
        break;
      }
      case 'graphml': {
        // Export as GraphML-compatible XML (graphology-graphml write only works in Node.js)
        const jsonData = graph.export();
        const graphmlData = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <graph id="knowledge-graph" edgedefault="undirected">
${jsonData.nodes.map(n => `    <node id="${n.key}"${n.attributes?.label ? ` label="${n.attributes.label}"` : ''}${n.attributes?.nodeType ? ` nodeType="${n.attributes.nodeType}"` : ''} />`).join('\n')}
${jsonData.edges.map(e => `    <edge source="${e.source}" target="${e.target}"${e.attributes?.edgeType ? ` edgeType="${e.attributes.edgeType}"` : ''} />`).join('\n')}
  </graph>
</graphml>`;
        downloadFile(graphmlData, 'knowledge-graph.graphml');
        break;
      }
      case 'csv': {
        // Export in KG upload format: single file with source/target pairs
        // Required columns: source_id, target_id, source_name, target_name, source_type, target_type, edge_type
        // Additional attributes with prefixes: source_*, target_*, edge_*

        const kgData = graph.mapEdges((_edge, edgeAttributes, sourceId, targetId) => {
          const sourceNode = graph.getNodeAttributes(sourceId);
          const targetNode = graph.getNodeAttributes(targetId);

          // Build row with required columns
          const row: Record<string, string | number> = {
            source_id: sourceId,
            target_id: targetId,
            source_name: sourceNode.label || sourceId,
            target_name: targetNode.label || targetId,
            source_type: sourceNode.nodeType || '',
            target_type: targetNode.nodeType || '',
            edge_type: edgeAttributes.edgeType || '',
          };

          // Add additional source node attributes (exclude internal/rendering properties)
          const excludedProps = [
            'x',
            'y',
            'size',
            'color',
            'label',
            'nodeType',
            'highlighted',
            'hidden',
            'forceLabel',
            'zIndex',
          ];
          for (const [key, value] of Object.entries(sourceNode)) {
            if (!excludedProps.includes(key) && value !== undefined && value !== null) {
              row[`source_${key}`] = value;
            }
          }

          // Add additional target node attributes
          for (const [key, value] of Object.entries(targetNode)) {
            if (!excludedProps.includes(key) && value !== undefined && value !== null) {
              row[`target_${key}`] = value;
            }
          }

          // Add additional edge attributes (exclude internal/rendering properties)
          const excludedEdgeProps = [
            'edgeType',
            'type',
            'curvature',
            'parallelIndex',
            'parallelMinIndex',
            'parallelMaxIndex',
            'color',
            'size',
            'hidden',
            'forceLabel',
            'zIndex',
            'undirected',
          ];
          for (const [key, value] of Object.entries(edgeAttributes)) {
            if (!excludedEdgeProps.includes(key) && value !== undefined && value !== null) {
              row[`edge_${key}`] = value;
            }
          }

          return row;
        });

        const kgCsv = Papa.unparse(kgData);
        downloadFile(kgCsv, 'knowledge-graph.csv');
        break;
      }
    }
    toast.success(`Exported as ${format.toUpperCase()}`);
  } catch (error) {
    toast.error('Export failed', {
      description: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
