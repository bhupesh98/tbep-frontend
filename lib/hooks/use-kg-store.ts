import type Sigma from 'sigma';
import { create } from 'zustand';
import type { EdgeAttributes, NodeAttributes } from '../interface';

/**
 * Knowledge Graph Store - Zustand store for KG visualization state
 * Simplified from GraphStore, removing gene-specific logic
 */
export interface KGStore {
  /**
   * Node suggestions for search auto-complete
   */
  nodeSuggestions: string[];
  /**
   * Node search query string
   */
  nodeSearchQuery: string;
  /**
   * Sigma instance reference for direct graph access
   */
  sigmaInstance: Sigma<NodeAttributes, EdgeAttributes> | null;

  /**
   * Active properties tracking which nodeTypes have properties applied
   * Tracks both color and size properties separately
   */
  activePropertyNodeTypes: {
    color: Set<string>; // NodeTypes with color property applied
    size: Set<string>; // NodeTypes with size property applied
  };

  /**
   * Set of node IDs currently in the graph
   */
  nodeNames: Set<string>;

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
  forceSettings: {
    linkDistance: number;
    charge?: number;
    gravity?: number;
  };

  /**
   * Default base node size (used for proportional sizing)
   */
  defaultNodeSize: number;

  /**
   * Maximum degree in the graph (for size normalization)
   */
  maxDegree: number;

  /**
   * Default label rendered size threshold
   */
  defaultLabelDensity: number;

  /**
   * Default label size of the graph
   */
  defaultLabelSize: number;

  /**
   * Selected nodes in the graph
   */
  selectedNodes: Array<{ id: string; label: string; nodeType?: string }>;

  /**
   * Selected property for node coloring
   */
  selectedRadioNodeColor: string | undefined;

  /**
   * Selected property for node sizing
   */
  selectedRadioNodeSize: string | undefined;

  /**
   * Whether to show edge colors
   */
  showEdgeColor: boolean;

  /**
   * Proportional node sizing based on degree
   */
  proportionalSizing: boolean;

  /**
   * Network Statistics
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
    top10ByDegree: Array<Record<'id' | 'label' | 'nodeType' | 'degree', string>> | null;
    top10ByBetweenness: Array<Record<'id' | 'label' | 'nodeType' | 'betweenness', string>> | null;
    top10ByCloseness: Array<Record<'id' | 'label' | 'nodeType' | 'closeness', string>> | null;
    top10ByEigenvector: Array<Record<'id' | 'label' | 'nodeType' | 'eigenvector', string>> | null;
    top10ByPageRank: Array<Record<'id' | 'label' | 'nodeType' | 'pagerank', string>> | null;
  };

  /**
   * Set Network Statistics
   */
  setNetworkStatistics: (stats: Partial<KGStore['networkStatistics']>) => void;

  /**
   * Flag to track if statistics have been computed
   */
  statisticsComputed: boolean;

  /**
   * Radial Analysis settings (node filtering)
   */
  radialAnalysis: {
    edgeWeightCutOff: number;
    candidatePrioritizationCutOff: number;
    seedNodeProximityCutOff: number;
    nodeDegreeProperty: string;
  };

  /**
   * Node property data: nodeId -> propertyName -> value
   * Stores both file-uploaded and backend-fetched properties for non-Gene nodes
   */
  nodePropertyData: Record<string, Record<string, number | string>>;

  /**
   * Available properties for non-Gene nodes with metadata
   * For Gene nodes, use useStore().radioOptions instead
   */
  kgPropertyOptions: Record<
    string,
    {
      targetNodeType: string;
      source: 'file' | 'backend';
    }
  >;

  /**
   * Selected Node Size Property name
   */
  selectedNodeSizeProperty: string;

  /**
   * Selected Node Color Property name
   */
  selectedNodeColorProperty: string;

  /**
   * Edge Opacity
   */
  edgeOpacity: number;

  /**
   * Edge width control
   */
  edgeWidth: number;

  /**
   * Highlight Neighbor Nodes on hover
   */
  highlightNeighborNodes: boolean;

  /**
   * Active tab in the main layout
   */
  activeTab: string;

  /**
   * Setter function for the active tab
   */
  setActiveTab: (tab: string) => void;

  /**
   * Show only visible nodes in analysis
   */
  showOnlyVisible: boolean;

  /**
   * Leiden clustering communities
   */
  communities: Record<string, string[]> | null;

  /**
   * Minimap visibility toggle
   */
  minimapVisible: boolean;
}

export const useKGStore = create<KGStore>(set => ({
  nodeSuggestions: [],
  nodeSearchQuery: '',
  // Sigma instance
  sigmaInstance: null,

  // Active property tracking
  activePropertyNodeTypes: {
    color: new Set(),
    size: new Set(),
  },

  nodeNames: new Set(),
  forceWorker: {
    start() {},
    stop() {},
  },
  forceSettings: {
    linkDistance: 30,
  },
  defaultNodeSize: 5,
  maxDegree: 1,
  defaultLabelDensity: 3,
  defaultLabelSize: 8,
  selectedNodes: [],
  selectedRadioNodeColor: undefined,
  selectedRadioNodeSize: undefined,
  showEdgeColor: false,
  proportionalSizing: false,

  networkStatistics: {
    totalNodes: 0,
    totalEdges: 0,
    avgDegree: 0,
    density: 0,
    diameter: 0,
    averageClusteringCoefficient: 0,
    degreeDistribution: null,
    edgeScoreDistribution: null,
    top10ByDegree: null,
    top10ByBetweenness: null,
    top10ByCloseness: null,
    top10ByEigenvector: null,
    top10ByPageRank: null,
  },
  setNetworkStatistics: (stats: Partial<KGStore['networkStatistics']>) => {
    set(state => ({
      networkStatistics: {
        ...state.networkStatistics,
        ...stats,
      },
    }));
  },
  statisticsComputed: false,
  radialAnalysis: {
    edgeWeightCutOff: 0,
    candidatePrioritizationCutOff: 0,
    seedNodeProximityCutOff: 0,
    nodeDegreeProperty: 'Node Degree',
  },
  nodePropertyData: {},
  kgPropertyOptions: {},
  selectedNodeSizeProperty: '',
  selectedNodeColorProperty: '',
  edgeOpacity: 1,
  edgeWidth: 1,
  highlightNeighborNodes: false,

  activeTab: 'Network',
  setActiveTab: tab => set({ activeTab: tab }),

  showOnlyVisible: false,
  communities: null,
  minimapVisible: true,
}));
