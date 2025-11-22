import { toUndirected } from 'graphology-operators';
import type { AbstractGraph } from 'graphology-types';
import { toast } from 'sonner';
import type { EdgeAttributes, NodeAttributes } from '@/lib/interface';

/**
 * Apply Leiden clustering to knowledge graph
 * Uses graphology-communities-louvain for local clustering
 */
export async function applyLeidenClustering(
  graph: AbstractGraph<NodeAttributes, EdgeAttributes>,
  resolution = 1.0,
  weighted = false,
  minCommunitySize = 5,
) {
  try {
    const louvain = await import('graphology-communities-louvain').then(lib => lib.default);

    // Convert to undirected for clustering (required for mixed graphs)
    const undirectedGraph = toUndirected(graph, (currentAttr: EdgeAttributes, nextAttr: EdgeAttributes) => {
      if (weighted && currentAttr.score && nextAttr.score) {
        return {
          ...currentAttr,
          score: currentAttr.score + nextAttr.score,
        };
      }
      return currentAttr;
    });

    const hslToHex = (h: number, s: number, l: number) => {
      l /= 100;
      const a = (s * Math.min(l, 1 - l)) / 100;
      const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color)
          .toString(16)
          .padStart(2, '0');
      };
      return `#${f(0)}${f(8)}${f(4)}`;
    };

    const res = louvain.detailed(undirectedGraph, {
      resolution: +resolution,
      getEdgeWeight: weighted ? 'score' : null,
    });

    const map: Record<string, { name: string; nodes: string[]; color: string }> = {};
    let count = 0;

    for (const [node, comm] of Object.entries(res.communities)) {
      if (!map[comm]) {
        map[comm] = {
          name: `Community ${count++}`,
          nodes: [],
          color: hslToHex(count * 137.508, 75, 50),
        };
      }
      map[comm].nodes.push(node);
    }

    // Apply colors and filter by size
    const communitiesData: Record<string, string[]> = {};
    for (const [id, community] of Object.entries(map)) {
      if (community.nodes.length < +minCommunitySize) {
        for (const node of community.nodes) {
          if (graph.hasNode(node)) {
            graph.setNodeAttribute(node, 'color', undefined);
          }
        }
        continue;
      }
      for (const node of community.nodes) {
        if (graph.hasNode(node)) {
          graph.setNodeAttribute(node, 'color', community.color);
          graph.setNodeAttribute(node, 'community', community.name);
        }
      }
      communitiesData[id] = community.nodes;
    }

    const filteredCount = Object.keys(communitiesData).length;
    if (filteredCount > 100) {
      toast.error('Too many communities detected', {
        description: 'Increase minimum community size or decrease resolution',
        cancel: { label: 'Close', onClick() {} },
      });
    } else {
      toast.success('Leiden clustering completed', {
        description: `${filteredCount} communities (modularity: ${res.modularity.toFixed(3)})`,
      });
    }

    return { communities: communitiesData, modularity: res.modularity };
  } catch (error) {
    console.error('Leiden error:', error);
    toast.error('Failed to run Leiden clustering', {
      description: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}
