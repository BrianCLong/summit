import { gql } from '@apollo/client';

export const EXPAND_NEIGHBORS = gql`
  mutation ExpandNeighbors($entityId: ID!, $limit: Int) {
    expandNeighbors(entityId: $entityId, limit: $limit) {
      nodes {
        id
        label
        type
      }
      edges {
        id
        source
        target
        type
        label
      }
    }
  }
`;

export const TAG_ENTITY = gql`
  mutation TagEntity($entityId: ID!, $tag: String!) {
    tagEntity(entityId: $entityId, tag: $tag) {
      id
      tags
    }
  }
`;

export const REQUEST_AI_ANALYSIS = gql`
  mutation RequestAIAnalysis($entityId: ID!) {
    requestAIAnalysis(entityId: $entityId) {
      ok
      requestId
    }
  }
`;

export const BULK_DELETE_GRAPH_ELEMENTS = gql`
  mutation BulkDeleteGraphElements(
    $investigationId: ID!
    $nodeIds: [ID!]
    $edgeIds: [ID!]
  ) {
    bulkDeleteGraphElements(
      investigationId: $investigationId
      nodeIds: $nodeIds
      edgeIds: $edgeIds
    ) {
      deletedNodeIds
      deletedEdgeIds
    }
  }
`;
