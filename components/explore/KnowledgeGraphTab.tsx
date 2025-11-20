'use client';

import { unzip } from 'fflate';
import type { SerializedGraph } from 'graphology-types';
import { CheckCircle2Icon, FileTextIcon, LoaderIcon, UploadCloudIcon, XIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import AnimatedNetworkBackground from '@/components/AnimatedNetworkBackground';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { parseGEXF, parseGraphML, parseJSON, parseSingleCSV, parseTwoCSV } from '@/lib/graph/knowledge-graph-parser';
import { KNOWLEDGE_GRAPH_FILE_FORMATS, NETWORK_STORAGE_KEYS } from '@/lib/interface/knowledge-graph';
import { openDB } from '@/lib/utils';

/**
 * KnowledgeGraphTab - Upload and manage knowledge graph files
 *
 * Phase 1: File upload UI and storage
 * Future phases:
 * - Phase 2: JSON parsing and validation
 * - Phase 3: CSV parsing (nodes + edges)
 * - Phase 4: GraphML/GEXF import using graphology
 * - Phase 5: Network visualization with Sigma.js
 * - Phase 6: Export functionality (JSON, GraphML, GEXF)
 */
export function KnowledgeGraphTab() {
  const router = useRouter();
  const [files, setFiles] = React.useState<File[]>([]);
  const [loading, setLoading] = React.useState(false);

  const validateFiles = React.useCallback((filesToValidate: File[]): boolean => {
    const validFormats = KNOWLEDGE_GRAPH_FILE_FORMATS;

    // Check for ZIP files
    const zipFiles = filesToValidate.filter(f => f.name.toLowerCase().endsWith('.zip'));
    if (zipFiles.length > 0) {
      if (filesToValidate.length === 1) return true;
      toast.error('Invalid file selection', {
        cancel: { label: 'Close', onClick() {} },
        description: 'ZIP files must be uploaded alone',
      });
      return false;
    }

    // Validate all file extensions
    for (const f of filesToValidate) {
      const ext = `.${f.name.split('.').pop()?.toLowerCase()}`;
      if (!validFormats.includes(ext as (typeof validFormats)[number])) {
        toast.error('Invalid file format', {
          cancel: { label: 'Close', onClick() {} },
          description: `File "${f.name}" is not supported. Please use: ${validFormats.join(', ')}, or .zip`,
        });
        return false;
      }
    }

    // CSV-specific validation
    const csvFiles = filesToValidate.filter(f => f.name.toLowerCase().endsWith('.csv'));
    if (csvFiles.length > 0) {
      if (csvFiles.length > 2) {
        toast.error('Too many CSV files', {
          cancel: { label: 'Close', onClick() {} },
          description: 'Upload 1 CSV (combined) or 2 CSVs (nodes + edges)',
        });
        return false;
      }
      if (csvFiles.length !== filesToValidate.length) {
        toast.error('Mixed file types', {
          cancel: { label: 'Close', onClick() {} },
          description: 'Cannot mix CSV with other formats',
        });
        return false;
      }
      return true;
    }

    // Non-CSV formats: only single file allowed
    if (filesToValidate.length > 1) {
      toast.error('Multiple files not allowed', {
        cancel: { label: 'Close', onClick() {} },
        description: 'JSON, GraphML, and GEXF must be uploaded individually',
      });
      return false;
    }

    return true;
  }, []);

  const onDrop = React.useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      if (!validateFiles(acceptedFiles)) return;
      setFiles(acceptedFiles);
    },
    [validateFiles],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      'application/json': ['.json'],
      'text/csv': ['.csv'],
      'application/xml': ['.graphml', '.gexf'],
      'application/zip': ['.zip'],
    },
  });

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleReset = () => {
    setFiles([]);
    setLoading(false);
  };

  const handleVisualize = async () => {
    if (files.length === 0) {
      toast.error('No files selected', {
        cancel: { label: 'Close', onClick() {} },
      });
      return;
    }

    setLoading(true);
    try {
      // Prepare metadata
      const fileNames = files.map(f => f.name).join(', ');
      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      let fileFormat: string;
      let graphData: SerializedGraph;

      // Handle ZIP files - extract and parse
      if (files[0].name.toLowerCase().endsWith('.zip')) {
        fileFormat = 'csv';
        const zipData = await files[0].arrayBuffer();
        const unzipped = await new Promise<{ [key: string]: Uint8Array }>((resolve, reject) => {
          unzip(new Uint8Array(zipData), (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        });

        const csvEntries = Object.entries(unzipped).filter(([name]) => name.toLowerCase().endsWith('.csv'));

        if (csvEntries.length === 0) {
          toast.error('No CSV files found in ZIP', {
            cancel: { label: 'Close', onClick() {} },
          });
          return;
        }

        if (csvEntries.length > 2) {
          toast.error('Too many CSV files in ZIP', {
            cancel: { label: 'Close', onClick() {} },
            description: 'ZIP should contain 1 or 2 CSV files',
          });
          return;
        }

        // Convert to File objects
        const extractedFiles = csvEntries.map(([name, data]) => {
          const buffer = data.buffer instanceof ArrayBuffer ? data.buffer : data.slice().buffer;
          const blob = new Blob([buffer], { type: 'text/csv' });
          return new File([blob], name, { type: 'text/csv' });
        });

        // Parse extracted CSV files
        if (extractedFiles.length === 2) {
          graphData = await parseTwoCSV(extractedFiles[0], extractedFiles[1]);
        } else {
          graphData = await parseSingleCSV(extractedFiles[0]);
        }
      } else if (files.length === 2) {
        // Two CSV files
        fileFormat = 'csv';
        graphData = await parseTwoCSV(files[0], files[1]);
      } else {
        // Single file
        const file = files[0];
        const ext = file.name.split('.').pop()?.toLowerCase();
        fileFormat = ext || 'unknown';

        if (ext === 'json') {
          graphData = await parseJSON(file);
        } else if (ext === 'csv') {
          graphData = await parseSingleCSV(file);
        } else if (ext === 'graphml') {
          graphData = await parseGraphML(file);
        } else if (ext === 'gexf') {
          graphData = await parseGEXF(file);
        } else {
          throw new Error(`Unsupported file format: ${ext}`);
        }
      }

      // Add metadata to graph attributes
      graphData.attributes = {
        ...graphData.attributes,
        originalFileName: fileNames,
        uploadedAt: Date.now(),
        fileFormat,
        fileSize: totalSize,
      };

      // Store parsed graph with metadata (open new transaction)
      const store = await openDB('network', 'readwrite');
      if (!store) {
        throw new Error('Failed to open storage');
      }

      // Clear old data and store new parsed graph
      try {
        store.delete(NETWORK_STORAGE_KEYS.KNOWLEDGE_GRAPH);
      } catch (error) {
        console.warn('No existing knowledge graph to delete:', error);
      }

      store.put(graphData, NETWORK_STORAGE_KEYS.KNOWLEDGE_GRAPH);

      toast.success('Graph uploaded and parsed successfully!', {
        cancel: { label: 'Close', onClick() {} },
        description: `${graphData.nodes.length} nodes, ${graphData.edges.length} edges`,
      });

      // Navigate to knowledge graph visualization
      router.push('/knowledge-graph');
    } catch (parseError) {
      console.error('Parse error:', parseError);
      toast.error('Failed to parse graph', {
        cancel: { label: 'Close', onClick() {} },
        description: parseError instanceof Error ? parseError.message : 'Unknown error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='space-y-6'>
      {/* Upload Section */}
      <div className='rounded-lg border border-teal-100 bg-white p-6 shadow-md'>
        <div className='mb-6'>
          <h3 className='flex items-center gap-2 font-semibold text-lg text-teal-900'>
            <UploadCloudIcon className='size-5' />
            Upload Knowledge Graph
          </h3>
          <p className='mt-1 text-gray-600 text-sm'>
            Upload your knowledge graph file in JSON, CSV, GraphML, GEXF, or ZIP format
          </p>
        </div>

        <div className='space-y-4'>
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-all ${
              isDragActive
                ? 'border-teal-500 bg-teal-50'
                : files.length > 0
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-300 bg-gray-50 hover:border-teal-400 hover:bg-teal-50/50'
            }`}
          >
            <input {...getInputProps()} />
            <UploadCloudIcon className='mx-auto size-12 text-gray-400' />
            <p className='mt-3 font-medium text-gray-700'>
              {isDragActive ? 'Drop files here...' : 'Drag & drop files here, or click to select'}
            </p>
            <p className='mt-1 text-gray-500 text-xs'>
              JSON, CSV (1-2 files), GraphML, GEXF, or ZIP containing CSV files
            </p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className='space-y-2'>
              {files.map((file, index) => (
                <Alert
                  key={`${file.name}-${index}`}
                  className='flex items-center justify-between border-teal-200 bg-teal-50'
                >
                  <div className='flex items-start gap-2'>
                    <FileTextIcon className='mt-0.5 size-4 shrink-0 text-teal-600' />
                    <AlertDescription className='text-sm text-teal-800'>
                      <strong>{file.name}</strong> ({(file.size / 1024).toFixed(2)} KB)
                    </AlertDescription>
                  </div>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={e => {
                      e.stopPropagation();
                      handleRemoveFile(index);
                    }}
                    className='shrink-0 text-teal-600 hover:bg-teal-100 hover:text-teal-800'
                  >
                    <XIcon className='size-4' />
                  </Button>
                </Alert>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className='flex gap-3'>
            <Button
              type='button'
              onClick={handleVisualize}
              disabled={files.length === 0 || loading}
              className='relative flex-1 overflow-hidden bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60'
            >
              <AnimatedNetworkBackground
                className='pointer-events-none absolute inset-0 h-full w-full opacity-30'
                moving={loading}
                speedMultiplier={2.5}
              />
              <span className='relative z-10 flex items-center justify-center gap-2'>
                {loading ? (
                  <>
                    <LoaderIcon className='size-5 animate-spin' />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2Icon className='size-5' />
                    Visualize Graph
                  </>
                )}
              </span>
            </Button>

            {files.length > 0 && (
              <Button type='button' onClick={handleReset} variant='outline' disabled={loading} className='shrink-0'>
                <XIcon className='size-4' />
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Format Documentation */}
      <div className='rounded-lg border border-teal-100 bg-white p-6 shadow-md'>
        <h3 className='mb-4 font-semibold text-lg text-teal-900'>File Format Guide</h3>

        <Tabs defaultValue='csv' className='w-full'>
          <TabsList className='grid w-full grid-cols-4'>
            <TabsTrigger value='csv'>CSV</TabsTrigger>
            <TabsTrigger value='json'>JSON</TabsTrigger>
            <TabsTrigger value='graphml'>GraphML</TabsTrigger>
            <TabsTrigger value='gexf'>GEXF</TabsTrigger>
          </TabsList>

          <TabsContent value='json' className='mt-4 space-y-3'>
            <p className='text-gray-700 text-sm'>
              <strong>Graphology SerializedGraph format</strong> - This is the standard format used by Graphology
              library.
            </p>
            <pre className='overflow-x-auto rounded-md bg-gray-900 p-4 text-gray-100 text-xs'>
              {`{
  "attributes": {
    "name": "Sample Knowledge Graph"
  },
  "options": {
    "type": "directed",
    "multi": false,
    "allowSelfLoops": true
  },
  "nodes": [
    {
      "key": "BRCA1",
      "attributes": {
        "label": "BRCA1",
        "type": "Gene",
        "ensembl_id": "ENSG00000012048",
        "chromosome": "17"
      }
    },
    {
      "key": "breast_cancer",
      "attributes": {
        "label": "Breast Cancer",
        "type": "Disease",
        "mondo_id": "MONDO_0007254"
      }
    }
  ],
  "edges": [
    {
      "key": "e1",
      "source": "BRCA1",
      "target": "breast_cancer",
      "attributes": {
        "type": "ASSOCIATES",
        "weight": 0.95,
        "evidence": "PubMed:12345"
      },
      "undirected": false
    }
  ]
}`}
            </pre>
            <p className='text-gray-600 text-xs'>
              See{' '}
              <a
                href='https://graphology.github.io/serialization.html'
                target='_blank'
                rel='noopener noreferrer'
                className='text-teal-600 underline hover:text-teal-800'
              >
                Graphology Serialization Docs
              </a>
            </p>
          </TabsContent>

          <TabsContent value='csv' className='mt-4 space-y-3'>
            <div className='space-y-4'>
              <div>
                <h4 className='mb-2 font-semibold text-gray-800 text-sm'>Option 1: Single File </h4>
                <p className='mb-2 text-gray-600 text-xs'>
                  Special columns: <code className='rounded bg-gray-100 px-1'>source_id</code>,{' '}
                  <code className='rounded bg-gray-100 px-1'>target_id</code> (required),{' '}
                  <code className='rounded bg-gray-100 px-1'>source_name</code>,{' '}
                  <code className='rounded bg-gray-100 px-1'>target_name</code>,{' '}
                  <code className='rounded bg-gray-100 px-1'>source_type</code>,{' '}
                  <code className='rounded bg-gray-100 px-1'>target_type</code>,{' '}
                  <code className='rounded bg-gray-100 px-1'>edge_type</code>
                </p>
                <p className='mb-2 text-gray-600 text-xs'>
                  <strong>Attribute prefixes:</strong> <code className='rounded bg-gray-100 px-1'>source_*</code> for
                  source node, <code className='rounded bg-gray-100 px-1'>target_*</code> for target node,{' '}
                  <code className='rounded bg-gray-100 px-1'>edge_*</code> for edge
                </p>
                <pre className='overflow-x-auto rounded-md bg-gray-900 p-4 text-gray-100 text-xs'>
                  {`source_id,target_id,edge_type,source_type,target_type,source_name,target_name,edge_weight,source_chromosome
BRCA1,breast_cancer,ASSOCIATES,Gene,Disease,BRCA1,Breast Cancer,0.95,17
BRCA1,TP53,INTERACTS,Gene,Gene,BRCA1,TP53,0.87,17
TP53,breast_cancer,ASSOCIATES,Gene,Disease,TP53,Breast Cancer,0.82,`}
                </pre>
              </div>

              <div>
                <h4 className='mb-2 font-semibold text-gray-800 text-sm'>
                  Option 2: Two Files (nodes.csv + edges.csv)
                </h4>
                <p className='mb-2 text-gray-600 text-xs'>
                  <strong>nodes.csv</strong> - Special columns: <code className='rounded bg-gray-100 px-1'>id</code>{' '}
                  (required), <code className='rounded bg-gray-100 px-1'>name</code>,{' '}
                  <code className='rounded bg-gray-100 px-1'>type</code>. Prefixed:{' '}
                  <code className='rounded bg-gray-100 px-1'>node_*</code>
                </p>
                <pre className='overflow-x-auto rounded-md bg-gray-900 p-4 text-gray-100 text-xs'>
                  {`id,name,type,node_chromosome,node_description
BRCA1,BRCA1,Gene,17,Tumor suppressor gene
breast_cancer,Breast Cancer,Disease,,Cancer of breast tissue
TP53,TP53,Gene,17,Tumor protein p53`}
                </pre>

                <p className='mt-3 mb-2 text-gray-600 text-xs'>
                  <strong>edges.csv</strong> - Special columns:{' '}
                  <code className='rounded bg-gray-100 px-1'>source_id</code>,{' '}
                  <code className='rounded bg-gray-100 px-1'>target_id</code> (required),{' '}
                  <code className='rounded bg-gray-100 px-1'>type</code>,{' '}
                  <code className='rounded bg-gray-100 px-1'>name</code>. Prefixed:{' '}
                  <code className='rounded bg-gray-100 px-1'>edge_*</code>
                </p>
                <pre className='overflow-x-auto rounded-md bg-gray-900 p-4 text-gray-100 text-xs'>
                  {`source_id,target_id,type,edge_weight,edge_evidence
BRCA1,breast_cancer,ASSOCIATES,0.95,PubMed:12345
BRCA1,TP53,INTERACTS,0.87,STRING:9606.ENSP00000269305
TP53,breast_cancer,ASSOCIATES,0.82,PubMed:67890`}
                </pre>
              </div>

              <div className='rounded-md border border-amber-300 bg-amber-50 p-3'>
                <p className='text-amber-800 text-xs'>
                  <strong>Note:</strong> Columns without special names or prefixes will be ignored. All attribute
                  columns must start with <code className='rounded bg-amber-100 px-1'>node_</code>,{' '}
                  <code className='rounded bg-amber-100 px-1'>source_</code>,{' '}
                  <code className='rounded bg-amber-100 px-1'>target_</code>, or{' '}
                  <code className='rounded bg-amber-100 px-1'>edge_</code>.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value='graphml' className='mt-4 space-y-3'>
            <p className='text-gray-700 text-sm'>
              GraphML is an XML-based format. We'll use{' '}
              <a
                href='https://graphology.github.io/standard-library/graphml.html'
                target='_blank'
                rel='noopener noreferrer'
                className='text-teal-600 underline hover:text-teal-800'
              >
                graphology-graphml
              </a>{' '}
              to parse it.
            </p>
            <pre className='overflow-x-auto rounded-md bg-gray-900 p-4 text-gray-100 text-xs'>
              {`<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="type" for="node" attr.name="type" attr.type="string"/>
  <graph id="G" edgedefault="directed">
    <node id="gene_1">
      <data key="label">BRCA1</data>
      <data key="type">Gene</data>
    </node>
    <edge source="gene_1" target="disease_1"/>
  </graph>
</graphml>`}
            </pre>
          </TabsContent>

          <TabsContent value='gexf' className='mt-4 space-y-3'>
            <p className='text-gray-700 text-sm'>
              GEXF (Graph Exchange XML Format) for complex networks. We'll use{' '}
              <a
                href='https://graphology.github.io/standard-library/gexf.html'
                target='_blank'
                rel='noopener noreferrer'
                className='text-teal-600 underline hover:text-teal-800'
              >
                graphology-gexf
              </a>{' '}
              to parse it.
            </p>
            <pre className='overflow-x-auto rounded-md bg-gray-900 p-4 text-gray-100 text-xs'>
              {`<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://www.gexf.net/1.2draft" version="1.2">
  <graph mode="static" defaultedgetype="directed">
    <nodes>
      <node id="gene_1" label="BRCA1">
        <attvalues>
          <attvalue for="type" value="Gene"/>
        </attvalues>
      </node>
    </nodes>
    <edges>
      <edge id="0" source="gene_1" target="disease_1"/>
    </edges>
  </graph>
</gexf>`}
            </pre>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
