import { gql } from "@apollo/client";

export const GENE_VERIFICATION_QUERY = gql`
  query GeneVerification($geneIDs: [String!]!) {
    getGenes(input: { geneIDs: $geneIDs }) {
      ID
      Gene_name
      Description
      hgnc_gene_id
    }
  }
`;

export const GENE_GRAPH_QUERY = (disease: string) => gql`
  query GeneGraph(
    $geneIDs: [String!]!
    $minScore: Float!
    $order: Int!
    $interactionType: String!
  ) {
    getGeneInteractions(
      input: {
        geneIDs: $geneIDs
        minScore: $minScore
        interactionType: $interactionType
      }
      order: $order
    ) {
      genes {
        ID
        Description
        Gene_name
        common
        ${disease}
      }
      links {
        gene1 {
          ID
          index
        }
        gene2 {
          ID
          index
        }
        score
      }
    }
  }
`;

export const GENE_UNIVERSAL_QUERY = (disease: string) => gql`
  query GeneVerification($geneIDs: [String!]!) {
    getGenes(input: { geneIDs: $geneIDs }) {
      ID
      Gene_name
      Description
      common
      ${disease}
    }
  }
`;