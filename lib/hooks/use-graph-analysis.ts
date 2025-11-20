import type Graph from 'graphology';
import { useCallback, useState } from 'react';
import { computeDWPC, findAllPaths, findPathWithMetapath } from '@/lib/graph/algorithms';
import type { DWPCOptions, DWPCResult } from '@/lib/graph/algorithms/dwpc';
import type { PathResult } from '@/lib/graph/algorithms/path-finding';
import type { EdgeAttributes, NodeAttributes } from '@/lib/interface';

/**
 * Hook for DWPC computation
 */
export function useDWPC() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DWPCResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const compute = useCallback((graph: Graph<NodeAttributes, EdgeAttributes>, options: DWPCOptions) => {
    setLoading(true);
    setError(null);

    try {
      const dwpcResult = computeDWPC(graph, options);
      setResult(dwpcResult);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMsg);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    compute,
    reset,
    loading,
    result,
    error,
  };
}

/**
 * Hook for path finding
 */
export function usePathFinding() {
  const [loading, setLoading] = useState(false);
  const [paths, setPaths] = useState<PathResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const findPath = useCallback(
    (
      graph: Graph<NodeAttributes, EdgeAttributes>,
      source: string,
      target: string,
      options?: {
        maxDepth?: number;
        maxPaths?: number;
        metapath?: string[];
        maxMetapathPaths?: number;
      },
    ) => {
      setLoading(true);
      setError(null);

      try {
        let foundPaths: PathResult[];

        if (options?.metapath) {
          // Find paths matching metapath
          foundPaths = findPathWithMetapath(graph, source, target, options.metapath, options.maxMetapathPaths || 10);
        } else {
          // Find all simple paths up to maxDepth
          foundPaths = findAllPaths(graph, source, target, options?.maxDepth || 5, options?.maxPaths || 1000);
        }

        setPaths(foundPaths);

        if (foundPaths.length === 0) {
          setError('No path found between the selected nodes');
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMsg);
        setPaths([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setPaths([]);
    setError(null);
    setLoading(false);
  }, []);

  return {
    findPath,
    reset,
    loading,
    paths,
    error,
  };
}
