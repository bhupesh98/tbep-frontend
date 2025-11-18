'use client';

import type { CheckedState } from '@radix-ui/react-checkbox';
import { Trash2Icon, UploadIcon } from 'lucide-react';
import Papa from 'papaparse';
import React, { useId } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useKGStore, useStore } from '@/lib/hooks';
import { formatBytes, openDB } from '@/lib/utils';

/**
 * KGFileSheet - Upload property files for knowledge graph nodes
 * Supports CSV files where first column is node ID matching graph nodes
 */
export function KGFileSheet() {
  const [uploadedFiles, setUploadedFiles] = React.useState<File[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [checkedOptions, setCheckedOptions] = React.useState<Record<string, boolean>>({});
  const sigmaInstance = useKGStore(state => state.sigmaInstance);

  React.useEffect(() => {
    openDB('files', 'readonly').then(store => {
      if (!store) {
        toast.error('Failed to open IndexedDB database', {
          cancel: { label: 'Close', onClick() {} },
          description: 'Please make sure you have enabled IndexedDB in your browser',
        });
        return;
      }
      const request = store.getAll();
      request.onsuccess = () => {
        setUploadedFiles(request.result);
        const checkedOptions: Record<string, boolean> = {};
        for (const file of request.result) {
          checkedOptions[file.name] = false;
        }
        setCheckedOptions(checkedOptions);
      };
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (acceptedFiles, fileRejections) => {
      const store = await openDB('files', 'readwrite');
      if (!store) {
        toast.error('Failed to open IndexedDB database', {
          cancel: { label: 'Close', onClick() {} },
          description: 'Please make sure you have enabled IndexedDB in your browser',
        });
        return;
      }
      const filesToAdd: File[] = [];
      const newCheckedOptions: Record<string, boolean> = {};

      for (const file of acceptedFiles) {
        const request = store.put(file, file.name);
        request.onerror = ev => console.error(ev);
        request.onsuccess = () => {
          filesToAdd.push(file);
          newCheckedOptions[file.name] = true;

          if (filesToAdd.length === acceptedFiles.length) {
            setUploadedFiles(prev => {
              const seen = new Set();
              return [...filesToAdd, ...prev].filter(file => {
                if (seen.has(file.name)) return false;
                seen.add(file.name);
                return true;
              });
            });
            setCheckedOptions(prev => ({ ...prev, ...newCheckedOptions }));
          }
        };
      }
      if (fileRejections.length > 0) {
        const rejectedFiles = fileRejections.map(r => r.file.name).join(', ');
        toast.error(`Files rejected: ${rejectedFiles}`, {
          cancel: { label: 'Close', onClick() {} },
          description: 'Please make sure files are in CSV format',
        });
      }
    },
    accept: { 'text/csv': ['.csv'] },
  });

  const handleCheckboxChange = (fileName: string) => {
    setCheckedOptions({
      ...checkedOptions,
      [fileName]: !checkedOptions[fileName],
    });
  };

  const removeFile = async (name?: string) => {
    setUploadedFiles(name ? uploadedFiles.filter(file => file.name !== name) : []);
    setShowConfirmDialog(false);
    const store = await openDB('files', 'readwrite');
    if (!store) {
      toast.error('Failed to open IndexedDB database', {
        cancel: { label: 'Close', onClick() {} },
        description: 'Please make sure you have enabled IndexedDB in your browser',
      });
      return;
    }
    if (name) store.delete(name).onerror = ev => console.error(ev);
    else {
      store.clear().onerror = ev => console.error(ev);
    }
  };

  const handleConfirmDialogChange = (checked: CheckedState) => {
    sessionStorage.setItem('showKGConfirmDialog', JSON.stringify(!checked));
  };

  const handlePropertyUpdate = async () => {
    if (!sigmaInstance) {
      toast.error('Graph not loaded', {
        cancel: { label: 'Close', onClick() {} },
        description: 'Please load a knowledge graph first',
      });
      return;
    }

    const graph = sigmaInstance.getGraph();
    const _nodePropertyData = useKGStore.getState().nodePropertyData;
    const radioOptions = useStore.getState().radioOptions;
    let updatedProperties = 0;

    for (const file of uploadedFiles) {
      if (!checkedOptions[file.name]) continue;

      const store = await openDB('files', 'readonly');
      if (!store) {
        toast.error('Failed to open IndexedDB database', {
          cancel: { label: 'Close', onClick() {} },
        });
        return;
      }

      const request = store.get(file.name);
      request.onsuccess = async () => {
        const data = await (request.result as File).text();
        const parsedData = Papa.parse<Record<string, string>>(data, {
          header: true,
          skipEmptyLines: true,
        });

        const IDHeaderName = parsedData.meta.fields?.[0];
        if (!IDHeaderName) {
          toast.error(`Invalid file: ${file.name}`, {
            cancel: { label: 'Close', onClick() {} },
            description: 'First column must be node ID',
          });
          return;
        }

        // Detect target node type by checking uploaded IDs
        const uploadedNodeIds = parsedData.data.map(row => row[IDHeaderName]).filter(id => graph.hasNode(id));
        if (uploadedNodeIds.length === 0) {
          toast.error(`No matching nodes found in file: ${file.name}`, {
            cancel: { label: 'Close', onClick() {} },
            description: 'Node IDs in file do not match graph nodes',
          });
          return;
        }

        // Determine target node type from first matching node
        const firstNodeId = uploadedNodeIds[0];
        const targetNodeType = graph.getNodeAttribute(firstNodeId, 'nodeType') || 'Unknown';
        const isGeneNode = targetNodeType === 'Gene';

        const universalData = useStore.getState().universalData;
        const nodePropertyData = useKGStore.getState().nodePropertyData;
        const kgPropertyOptions = useKGStore.getState().kgPropertyOptions;

        try {
          // Process each property column
          for (const propertyName of parsedData.meta.fields ?? []) {
            if (propertyName === IDHeaderName) continue;

            if (isGeneNode) {
              // Store Gene properties in universalData with user/diseaseId structure
              for (const row of parsedData.data) {
                const nodeId = row[IDHeaderName];
                if (!graph.hasNode(nodeId)) continue;

                if (!universalData[nodeId]) {
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
                if (!universalData[nodeId].user.Custom_Color) {
                  universalData[nodeId].user.Custom_Color = {};
                }

                // Try to parse as number, fallback to string
                const value = row[propertyName];
                const numValue = Number.parseFloat(value);
                (universalData[nodeId].user.Custom_Color as Record<string, number | string>)[propertyName] =
                  Number.isNaN(numValue) ? value : numValue;
              }

              // Add to radioOptions.user.Custom_Color if not already present
              if (!radioOptions.user.Custom_Color.includes(propertyName)) {
                radioOptions.user.Custom_Color.push(propertyName);
              }
            } else {
              // Non-Gene nodes: store in nodePropertyData with kgPropertyOptions metadata
              // Check for property name conflicts and resolve
              let finalPropertyName = propertyName;
              if (kgPropertyOptions[propertyName]) {
                // Conflict exists - append _file suffix
                finalPropertyName = `${propertyName}_file`;
                let counter = 1;
                while (kgPropertyOptions[finalPropertyName]) {
                  finalPropertyName = `${propertyName}_file${counter}`;
                  counter++;
                }
                toast.info(`Property "${propertyName}" renamed to "${finalPropertyName}"`, {
                  cancel: { label: 'Close', onClick() {} },
                  description: 'To avoid conflict with existing property',
                });
              }

              // Store property metadata in kgPropertyOptions
              kgPropertyOptions[finalPropertyName] = {
                targetNodeType,
                source: 'file',
              };

              // Store property data for matching nodes
              for (const row of parsedData.data) {
                const nodeId = row[IDHeaderName];
                if (!graph.hasNode(nodeId)) continue;

                if (!nodePropertyData[nodeId]) {
                  nodePropertyData[nodeId] = {};
                }

                // Try to parse as number, fallback to string
                const value = row[propertyName];
                const numValue = Number.parseFloat(value);
                nodePropertyData[nodeId][finalPropertyName] = Number.isNaN(numValue) ? value : numValue;
              }
            }

            updatedProperties++;
          }

          useStore.setState({ universalData, radioOptions });
          useKGStore.setState({ nodePropertyData, kgPropertyOptions });
        } catch (error) {
          console.error(error);
          toast.error('Error processing property data', {
            cancel: { label: 'Close', onClick() {} },
          });
          return;
        }
      };
    }

    if (updatedProperties > 0) {
      toast.success(`${updatedProperties} properties loaded successfully`, {
        cancel: { label: 'Close', onClick() {} },
        description: 'You can now use these properties for node coloring/sizing',
      });
    }
  };

  const handleReset = async () => {
    setCheckedOptions(value => {
      const updatedCheckedOptions = { ...value };
      for (const key in updatedCheckedOptions) {
        updatedCheckedOptions[key] = false;
      }
      return updatedCheckedOptions;
    });

    // Remove only file-sourced properties
    const kgPropertyOptions = useKGStore.getState().kgPropertyOptions;
    const nodePropertyData = useKGStore.getState().nodePropertyData;
    const universalData = useStore.getState().universalData;
    const radioOptions = useStore.getState().radioOptions;

    // Clear file properties from kgPropertyOptions (non-Gene nodes)
    const kgFileProperties = Object.keys(kgPropertyOptions).filter(prop => kgPropertyOptions[prop].source === 'file');
    for (const prop of kgFileProperties) {
      delete kgPropertyOptions[prop];
    }

    // Clear file property data from non-Gene nodes
    for (const nodeId in nodePropertyData) {
      for (const prop of kgFileProperties) {
        delete nodePropertyData[nodeId][prop];
      }
    }

    // Clear file properties from Gene nodes (Custom_Color)
    radioOptions.user.Custom_Color = [];
    for (const nodeId in universalData) {
      if (universalData[nodeId].user?.Custom_Color) {
        universalData[nodeId].user.Custom_Color = {};
      }
    }

    useKGStore.setState({ nodePropertyData, kgPropertyOptions });
    useStore.setState({ universalData, radioOptions });

    toast.info('File properties reset successfully', {
      cancel: { label: 'Close', onClick() {} },
    });
  };

  const doNotShowAgainId = useId();

  return (
    <div>
      <div className='flex flex-col justify-between gap-2 lg:flex-row'>
        <Sheet>
          <SheetTrigger asChild>
            <Button size='sm' className='w-[48%] text-xs'>
              <UploadIcon className='size-3' />
              Upload Files
            </Button>
          </SheetTrigger>
          <SheetContent side='bottom'>
            <SheetHeader>
              <SheetTitle>Node Property Files</SheetTitle>
              <SheetDescription>
                Upload CSV files with node properties. First column must be node ID matching your graph nodes.
              </SheetDescription>
            </SheetHeader>
            <div className='py-4'>
              <div
                className='mb-4 cursor-pointer rounded-lg border-2 border-gray-300 border-dashed p-4 text-center'
                {...getRootProps()}
              >
                <input {...getInputProps()} />
                {isDragActive ? (
                  <p>Drop the files here ...</p>
                ) : (
                  <p>Drag and drop CSV files here, or click to select files</p>
                )}
              </div>
              {(uploadedFiles.length || null) && (
                <div className='flex flex-row-reverse'>
                  <Button size='sm' className='mb-2' variant='destructive' onClick={() => setShowConfirmDialog(true)}>
                    Delete All
                  </Button>
                </div>
              )}
              <AlertDialog open={showConfirmDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription className='text-black'>
                      This action cannot be undone. This will permanently delete all uploaded property files.
                    </AlertDialogDescription>
                    <div className='mt-4 flex items-center space-x-2'>
                      <Checkbox id={doNotShowAgainId} onCheckedChange={handleConfirmDialogChange} />
                      <Label
                        htmlFor={doNotShowAgainId}
                        className='font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                      >
                        Do not show again
                      </Label>
                    </div>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setShowConfirmDialog(false)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => removeFile()}>Continue</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <ScrollArea className='h-[200px]'>
                {uploadedFiles.map(file => (
                  <div
                    key={file.name}
                    className='mb-2 flex items-center justify-between rounded bg-primary-foreground p-2 shadow-sm'
                  >
                    <div>
                      <div className='flex gap-4 font-medium text-sm'>
                        <Checkbox
                          id={file.name}
                          checked={checkedOptions[file.name] || false}
                          onCheckedChange={() => handleCheckboxChange(file.name)}
                        />
                        {file.name}
                      </div>
                      <span className='ml-8 text-gray-500 text-xs'>
                        Date: {new Date(file.lastModified).toLocaleString()} | Size: {formatBytes(file.size)}
                      </span>
                    </div>
                    <Button variant='ghost' size='icon' onClick={() => removeFile(file.name)}>
                      <Trash2Icon className='size-4' />
                    </Button>
                  </div>
                ))}
              </ScrollArea>
            </div>
            <SheetFooter>
              <SheetTrigger asChild>
                <Button onClick={handlePropertyUpdate} className='w-full'>
                  Apply Properties
                </Button>
              </SheetTrigger>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        <Button variant={'destructive'} size={'sm'} className='w-[48%] text-xs' onClick={handleReset}>
          Reset Files
        </Button>
      </div>
      <div className='mt-2 text-gray-500 text-xs italic'>
        <b>NOTE:</b> Uploaded files are stored in your browser and not shared with anyone.
      </div>
    </div>
  );
}
