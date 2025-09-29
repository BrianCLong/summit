import { gql } from '@apollo/client';

export const EXPORT_CASE = gql`
  mutation ExportCase($caseId: ID!) {
    exportCase(caseId: $caseId) {
      zipUrl
      manifest
      blockReason
    }
  }
`;

