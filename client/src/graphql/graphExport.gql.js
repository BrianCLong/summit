import { gql } from '@apollo/client';

export const EXPORT_GRAPH_DATA = gql`
  mutation ExportGraphData($input: GraphExportInput!) {
    exportGraphData(input: $input) {
      filename
      contentType
      content
      contentEncoding
      recordCount
    }
  }
`;
