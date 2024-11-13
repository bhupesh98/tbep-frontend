import type { Gene } from './Gene';

/**
 * API data for gene verification in index page
 * @interface GeneVerificationData
 */
export interface GeneVerificationData {
  /**
   * Genes to be displayed in the table
   */
  getGenes: Gene[];

  /**
   * User ID
   */
  getUserID?: string;
}

/**
 * Variables for gene verification GraphQL query
 * @interface GeneVerificationVariables
 */
export interface GeneVerificationVariables {
  /**
   * Gene IDs to be verified
   */
  geneIDs: string[];
}
