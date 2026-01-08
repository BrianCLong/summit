import { gql } from "@apollo/client";

export const SUGGEST_LINKS = gql`
  query SuggestLinks($entityId: ID!, $limit: Int) {
    suggestLinks(entityId: $entityId, limit: $limit) {
      from
      to
      score
      reason
    }
  }
`;

export const DETECT_ANOMALIES = gql`
  query DetectAnomalies($investigationId: ID, $limit: Int) {
    detectAnomalies(investigationId: $investigationId, limit: $limit) {
      entityId
      anomalyScore
      reason
    }
  }
`;

export const SEARCH_ENTITIES = gql`
  query SearchEntities($q: String!, $filters: JSON, $limit: Int) {
    searchEntities(q: $q, filters: $filters, limit: $limit) {
      id
      type
      label
      description
      properties
      investigationId
    }
  }
`;

export const AI_SUGGESTIONS_SUB = gql`
  subscription AiSuggestions($entityId: ID!) {
    aiSuggestions(entityId: $entityId) {
      from
      to
      score
      reason
    }
  }
`;
