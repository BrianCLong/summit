import { gql } from '@apollo/client';

export const GET_GRAPH_DATA = gql`
  query GetGraphData($investigationId: ID!) {
    graphData(investigationId: $investigationId) {
      nodes {
        id
        type
        label
        description
        properties
        confidence
        source
        investigationId
        createdBy
        updatedBy
        createdAt
        updatedAt
        attack_ttps
        capec_ttps
        triage_score
        actor_links
      }
      edges {
        id
        type
        label
        description
        properties
        confidence
        source
        fromEntityId
        toEntityId
        investigationId
        createdBy
        updatedBy
        since
        until
        createdAt
        updatedAt
        attack_ttps
        capec_ttps
      }
      nodeCount
      edgeCount
    }
  }
`;