import { gql } from '@apollo/client';

export const GET_SERVER_STATS = gql`
  query GetServerStats {
    serverStats {
      uptime
      totalInvestigations
      totalEntities
      totalRelationships
      databaseStatus {
        redis
        postgres
        neo4j
      }
    }
  }
`;

export const GET_HEALTH = gql`
  query GetHealth {
    health
  }
`;

export const GET_INVESTIGATIONS = gql`
  query GetInvestigations {
    getInvestigations {
      id
      name
      description
      status
      createdAt
      nodeCount
      edgeCount
    }
  }
`;