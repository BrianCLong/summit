import { gql } from "@apollo/client";

export const GET_DEDUPLICATION_CANDIDATES = gql`
  query GetDeduplicationCandidates($investigationId: ID, $threshold: Float) {
    deduplicationCandidates(investigationId: $investigationId, threshold: $threshold) {
      entityA {
        id
        label
        description
      }
      entityB {
        id
        label
        description
      }
      similarity
      reasons
    }
  }
`;

export const SUGGEST_MERGE = gql`
  mutation SuggestMerge($sourceId: ID!, $targetId: ID!) {
    suggestMerge(sourceId: $sourceId, targetId: $targetId) {
      id
      label
      description
    }
  }
`;
