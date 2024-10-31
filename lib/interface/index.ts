export * from './api/index';
export * from './graph';
export * from './PopUpTableProps';
export * from './PopUpDataTableProps';
export * from './RadialAnalysisProps';
export * from './SelectedNodeProperty';

/**
 * Chat Window Message format
 * @interface Message
 */
export interface Message {
  /**
   * Message text
   */
  text: string;

  /**
   * Message sender
   */
  sender: 'user' | 'llm';
}

/**
 * GSEA data format
 * @interface Gsea
 */
export interface Gsea {
  Gene_set: string;
  Overlap: string;
  'P-value': string;
  'Adjusted P-value': string;
  'Odds Ratio': string;
  'Combined Score': string;
  Genes: string;
}
