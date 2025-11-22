import type {
  DiseaseDependentProperties,
  DiseaseIndependentProperties,
  GeneProperties,
  GraphConfig,
  NodeColorType,
  NodeSizeType,
} from '@/lib/data';
import type { GenePropertyMetadata, SelectedNodeProperty } from '..';
import type { ForceSettings, RadialAnalysisSetting } from '.';

/**
 * Store for Zustand
 * @interface GraphStore
 */
export interface GraphStore {
  /**
   * Project Title for file saving
   */
  projectTitle: string;

  /**
   * Node textarea tearch query value
   */
  nodeSearchQuery: string;

  /**
   * Node suggestions
   */
  nodeSuggestions: string[];

  /**
   * Force Layout worker
   */
  forceWorker: {
    start: () => void;
    stop: () => void;
  };

  /**
   * Force Layout settings
   */
  forceSettings: ForceSettings;

  /**
   * Default node color of the graph
   */
  defaultNodeColor: string;

  /**
   * Default node size of the graph
   */
  defaultNodeSize: number;

  /**
   * Default label rendered size threshold
   */
  defaultLabelDensity: number;

  /**
   * Default label size of the graph
   */
  defaultLabelSize: number;

  /**
   * Selected nodes in the graph through Drag and Drop
   * @inheritdoc SelectedNodeProperty
   */
  selectedNodes: SelectedNodeProperty[];

  /**
   * Selected radio button option for Node Color of graph
   */
  selectedRadioNodeColor: NodeColorType | undefined;

  /**
   * Selected radio button option for Node Size of graph
   */
  selectedRadioNodeSize: NodeSizeType | undefined;

  /**
   * Whether to show the edge label or not
   */
  showEdgeColor: boolean;

  /**
   * Network Statistics for 2nd Tab in network page
   */
  networkStatistics: {
    totalNodes: number;
    totalEdges: number;
    avgDegree: number;
    density: number;
    diameter: number;
    averageClusteringCoefficient: number;
    degreeDistribution: Array<{ degree: number; count: number }> | null;
    edgeScoreDistribution: Array<{ score: number; count: number }> | null;
    top10ByDegree: Array<Record<'ID' | 'geneName' | 'description' | 'degree', string>> | null;
    top10ByBetweenness: Array<Record<'ID' | 'geneName' | 'description' | 'betweenness', string>> | null;
    top10ByCloseness: Array<Record<'ID' | 'geneName' | 'description' | 'closeness', string>> | null;
    top10ByEigenvector: Array<Record<'ID' | 'geneName' | 'description' | 'eigenvector', string>> | null;
    top10ByPageRank: Array<Record<'ID' | 'geneName' | 'description' | 'pagerank', string>> | null;
  };

  /**
   * Set Network Statistics
   * @param stats Partial<GraphStore['networkStatistics']>
   */
  setNetworkStatistics: (stats: Partial<GraphStore['networkStatistics']>) => void;

  /**
   * Radial Analysis settings
   */
  radialAnalysis: RadialAnalysisSetting;

  /**
   * ENSG IDs of all the nodes in Graph
   */
  geneNames: string[];

  /**
   * Disease Name
   */
  diseaseName: string;

  /**
   * Universal Data of all the diseases to be mapped on left sidebar
   */
  universalData: UniversalData;

  /**
   * Options for radio buttons
   */
  radioOptions: RadioOptions;
  /**
   * Selected Node Size Property
   */
  selectedNodeSizeProperty: string | Set<string>;

  /**
   * Selected Node Color Property
   */
  selectedNodeColorProperty: string | Set<string>;

  /**
   * Map of Gene Name to Gene ID
   */
  geneNameToID: Map<string, string>;

  /**
   *
   */
  graphConfig: GraphConfig | null;

  /**
   * Edge Opacity
   */
  edgeOpacity: number;

  /**
   * Highlight Neighbor Nodes
   */
  highlightNeighborNodes: boolean;
  /**
   * Pagination state for the OpenTargets heatmap.
   */
  heatmapPagination: { page: number; limit: number };
  /**
   * Sorting column for the OpenTargets heatmap.
   */
  heatmapSortingColumn: string;
  /**
   * Show only visible nodes (for global heatmap visibility)
   */
  showOnlyVisible: boolean;
}

export type RadioOptions = {
  user: Record<GeneProperties, Array<string>>;
  database: Record<GeneProperties, Array<GenePropertyMetadata>>;
};

/**
 * Universal Data of all the diseases to be mapped on left sidebar
 * It contains:
 * - ENSG ID of the gene
 *    - DiseaseType/`common(Pathway, Druggability)
 *    - DiseaseType/`ALS`
 */
export type UniversalData = Record<
  string,
  {
    common: CommonSection;
    user: CommonSection & OtherSection;
    [disease: string]: CommonSection | OtherSection;
  }
>;

export type CommonSection = {
  [K in DiseaseIndependentProperties]: Record<string, K extends 'Custom_Color' ? string : number>;
};
export type OtherSection = Record<DiseaseDependentProperties, Record<string, number>>;
