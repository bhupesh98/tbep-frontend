import type { SimulationNodeDatum } from 'd3-force';
import type { Attributes } from 'graphology-types';
/**
 * Node attributes used in the graph
 * @extends Attributes
 * @interface NodeAttributes
 */
export interface NodeAttributes extends Attributes, SimulationNodeDatum {
  /**
   * x coordinate of the node
   */
  x?: number;

  /**
   * y coordinate of the node
   */
  y?: number;

  /**
   * size of the node
   */
  size?: number;

  /**
   * color of the node
   */
  color?: string;

  /**
   * label of the node visible on the graph
   */
  label?: string;

  /**
   * ENSG ID of the node
   */
  ID?: string;

  /**
   * description of the node
   */
  description?: string;

  /**
   * boolean whether the node is hidden
   */
  hidden?: boolean;

  /**
   * type of the node (custom defined but ProgramClasses needs to be mapped in SigmaContainer)
   * defeault: circle
   */
  type?: 'circle' | 'border' | 'highlight' | 'normal';

  /**
   * Node category/type (e.g., Gene, Drug, Disease)
   */
  nodeType?: string;

  /**
   * boolean whether the node is highlighted (shows hoverlabel on true)
   */
  highlighted?: boolean;

  /**
   * border color of the node (only for BorderNodeProgram of sigmajs)
   */
  borderColor?: string;

  /**
   * border size of the node (only for BorderNodeProgram of sigmajs)
   */
  borderSize?: number;

  /**
   * Community ID
   */
  community?: string;

  /**
   * z-index of the node
   */
  zIndex?: number;

  /**
   * boolean whether the node is clicked
   */
  clicked?: boolean;
}
