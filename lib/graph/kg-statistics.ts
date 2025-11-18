import type Graph from 'graphology';
import { betweenness, closeness, eigenvector, pagerank } from 'graphology-metrics/centrality';
import { density, diameter } from 'graphology-metrics/graph';
import type { KGStore } from '../hooks/use-kg-store';
import type { EdgeAttributes, NodeAttributes } from '../interface';

/**
 * KG Statistics Generator - Computes network statistics for Knowledge Graph
 * Similar to statisticsGenerator but uses KG node attributes (label, nodeType)
 */
export function kgStatisticsGenerator(
  graph: Graph<NodeAttributes, EdgeAttributes>,
): Omit<KGStore['networkStatistics'], 'totalNodes' | 'totalEdges'> {
  /**  Average Degree  **/
  const avgDegree = graph.order ? (2 * graph.size) / graph.order : 0;

  /**  Degree Distribution Top 10 By Degree */
  const nodeDegreeArr: NonNullable<KGStore['networkStatistics']['top10ByDegree']> = [];
  const degreeDistribution = Object.entries(
    Array.from(graph.nodes()).reduce<Record<number, number>>((acc, node) => {
      const degree = graph.degree(node);
      nodeDegreeArr.push({
        id: node,
        label: graph.getNodeAttribute(node, 'label') || node,
        nodeType: graph.getNodeAttribute(node, 'nodeType') || '',
        degree: degree.toString(),
      });
      acc[degree] = (acc[degree] || 0) + 1;
      return acc;
    }, {}),
  ).map(([degree, count]) => ({
    degree: +degree,
    count,
  }));
  const top10ByDegree = nodeDegreeArr.sort((a, b) => +b.degree - +a.degree).slice(0, 10);

  /**  Top 10 By Betweenness */
  let top10ByBetweenness: NonNullable<KGStore['networkStatistics']['top10ByBetweenness']> = [];
  try {
    const betweennessCentrality = betweenness(graph, { getEdgeWeight: null });
    top10ByBetweenness = Object.entries(betweennessCentrality)
      .map(([node, value]) => ({
        id: node,
        label: graph.getNodeAttribute(node, 'label') || node,
        nodeType: graph.getNodeAttribute(node, 'nodeType') || '',
        betweenness: value.toFixed(3),
      }))
      .sort((a, b) => +b.betweenness - +a.betweenness)
      .slice(0, 10);
  } catch (error) {
    console.warn('Betweenness centrality calculation failed for large graph:', error);
  }

  /** Top 10 By Closeness */
  let top10ByCloseness: NonNullable<KGStore['networkStatistics']['top10ByCloseness']> = [];
  try {
    const closenessCentrality = closeness(graph);
    top10ByCloseness = Object.entries(closenessCentrality)
      .map(([node, value]) => ({
        id: node,
        label: graph.getNodeAttribute(node, 'label') || node,
        nodeType: graph.getNodeAttribute(node, 'nodeType') || '',
        closeness: value.toFixed(3),
      }))
      .sort((a, b) => +b.closeness - +a.closeness)
      .slice(0, 10);
  } catch (error) {
    console.warn('Closeness centrality calculation failed for large graph:', error);
  }

  /** Top 10 By Eigenvector */
  let top10ByEigenvector: NonNullable<KGStore['networkStatistics']['top10ByEigenvector']> = [];
  try {
    const eigenvectorCentrality = eigenvector(graph, { getEdgeWeight: null, tolerance: 1e-3 });
    top10ByEigenvector = Object.entries(eigenvectorCentrality)
      .map(([node, value]) => ({
        id: node,
        label: graph.getNodeAttribute(node, 'label') || node,
        nodeType: graph.getNodeAttribute(node, 'nodeType') || '',
        eigenvector: value.toFixed(3),
      }))
      .sort((a, b) => +b.eigenvector - +a.eigenvector)
      .slice(0, 10);
  } catch (error) {
    console.warn('Eigenvector centrality calculation failed:', error);
  }

  /** Top 10 By PageRank */
  let top10ByPageRank: NonNullable<KGStore['networkStatistics']['top10ByPageRank']> = [];
  try {
    const pagerankCentrality = pagerank(graph, { getEdgeWeight: 'score', tolerance: 1e-6, maxIterations: 100 });
    top10ByPageRank = Object.entries(pagerankCentrality)
      .map(([node, value]) => ({
        id: node,
        label: graph.getNodeAttribute(node, 'label') || node,
        nodeType: graph.getNodeAttribute(node, 'nodeType') || '',
        pagerank: value.toFixed(3),
      }))
      .sort((a, b) => +b.pagerank - +a.pagerank)
      .slice(0, 10);
  } catch (error) {
    console.warn('PageRank centrality calculation failed:', error);
  }

  /** Edge Score Cumulative Distribution */
  const edgeScoreDistribution = graph.size
    ? Object.entries(
        Array.from(graph.edges()).reduce<Record<number, number>>((acc, edge) => {
          const score = graph.getEdgeAttribute(edge, 'score');
          if (score !== undefined) {
            acc[score] = (acc[score] || 0) + 1;
          }
          return acc;
        }, {}),
      )
        .sort(([a], [b]) => +b - +a)
        .reduce<{ score: number; count: number }[]>((acc, [score, count]) => {
          acc.push({ score: +score, count: count + (acc[acc.length - 1]?.count || 0) });
          return acc;
        }, [])
        .toReversed()
    : null;

  /** Network Metrics */
  let networkDensity = 0;
  let networkDiameter = 0;
  const clusteringCoefficient = 0;

  try {
    networkDensity = density(graph);
    networkDiameter = diameter(graph);
  } catch (error) {
    console.warn('Network metrics calculation failed:', error);
  }

  return {
    avgDegree,
    density: networkDensity,
    diameter: networkDiameter,
    averageClusteringCoefficient: clusteringCoefficient,
    degreeDistribution,
    top10ByDegree,
    top10ByBetweenness,
    top10ByCloseness,
    top10ByEigenvector,
    top10ByPageRank,
    edgeScoreDistribution,
  };
}
