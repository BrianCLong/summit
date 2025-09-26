import { gql } from '@apollo/client';

export const PREVIEW_NL_QUERY = gql`
  mutation PreviewNLQuery($prompt: String!, $tenantId: String!, $manualCypher: String) {
    previewNLQuery(prompt: $prompt, tenantId: $tenantId, manualCypher: $manualCypher) {
      cypher
      estimatedRows
      estimatedCost
      warnings
      diffVsManual
    }
  }
`;

export const RUN_NL_GRAPH_SEARCH = gql`
  query NaturalLanguageGraphSearch($input: NaturalLanguageGraphInput!) {
    naturalLanguageGraphSearch(input: $input) {
      cypher
      graphql
      params
      warnings
      rows
    }
  }
`;
