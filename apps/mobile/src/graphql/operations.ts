import { gql } from '@apollo/client';

// ============================================
// Entity Queries & Mutations
// ============================================

export const GET_ENTITIES = gql`
  query GetEntities(
    $filter: EntityFilter
    $search: String
    $first: Int
    $after: String
  ) {
    entities(filter: $filter, search: $search, first: $first, after: $after) {
      edges {
        node {
          id
          type
          name
          description
          classification
          priority
          confidence
          createdAt
          updatedAt
          location {
            latitude
            longitude
          }
          tags
          metadata
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

export const GET_ENTITY = gql`
  query GetEntity($id: ID!) {
    entity(id: $id) {
      id
      type
      name
      description
      classification
      priority
      confidence
      createdAt
      updatedAt
      location {
        latitude
        longitude
        accuracy
      }
      tags
      sources
      metadata
      relationships {
        id
        type
        targetId
        target {
          id
          name
          type
        }
        confidence
      }
    }
  }
`;

export const CREATE_ENTITY = gql`
  mutation CreateEntity($input: CreateEntityInput!) {
    createEntity(input: $input) {
      id
      type
      name
      description
      classification
      createdAt
    }
  }
`;

export const UPDATE_ENTITY = gql`
  mutation UpdateEntity($id: ID!, $input: UpdateEntityInput!) {
    updateEntity(id: $id, input: $input) {
      id
      type
      name
      description
      classification
      updatedAt
    }
  }
`;

// ============================================
// Investigation Queries & Mutations
// ============================================

export const GET_INVESTIGATIONS = gql`
  query GetInvestigations(
    $filter: InvestigationFilter
    $first: Int
    $after: String
  ) {
    investigations(filter: $filter, first: $first, after: $after) {
      edges {
        node {
          id
          title
          description
          classification
          priority
          status
          leadAnalyst
          team
          createdAt
          updatedAt
          dueDate
          tags
          entityCount
          relationshipCount
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

export const GET_INVESTIGATION = gql`
  query GetInvestigation($id: ID!) {
    investigation(id: $id) {
      id
      title
      description
      classification
      priority
      status
      leadAnalyst
      team
      createdAt
      updatedAt
      dueDate
      tags
      entityCount
      relationshipCount
      entities {
        id
        type
        name
        classification
      }
      timeline {
        id
        eventType
        description
        timestamp
        entityId
      }
    }
  }
`;

// ============================================
// OSINT Alert Queries & Mutations
// ============================================

export const GET_ALERTS = gql`
  query GetAlerts(
    $filter: AlertFilter
    $priority: Priority
    $first: Int
    $after: String
  ) {
    alerts(filter: $filter, priority: $priority, first: $first, after: $after) {
      edges {
        node {
          id
          title
          description
          priority
          source
          sourceUrl
          entities
          location {
            latitude
            longitude
            name
          }
          timestamp
          isRead
          isAcknowledged
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

export const ACKNOWLEDGE_ALERT = gql`
  mutation AcknowledgeAlert($id: ID!) {
    acknowledgeAlert(id: $id) {
      id
      isAcknowledged
      acknowledgedAt
      acknowledgedBy
    }
  }
`;

export const MARK_ALERT_READ = gql`
  mutation MarkAlertRead($id: ID!) {
    markAlertRead(id: $id) {
      id
      isRead
    }
  }
`;

// ============================================
// GEOINT Queries
// ============================================

export const GET_GEOINT_FEATURES = gql`
  query GetGEOINTFeatures(
    $bounds: BoundsInput
    $filter: GEOINTFilter
    $first: Int
  ) {
    geointFeatures(bounds: $bounds, filter: $filter, first: $first) {
      id
      type
      geometry {
        type
        coordinates
      }
      properties {
        name
        entityId
        entityType
        classification
        priority
        description
        timestamp
        source
        confidence
      }
    }
  }
`;

export const GET_GEOINT_LAYERS = gql`
  query GetGEOINTLayers {
    geointLayers {
      id
      name
      type
      visible
      opacity
      featureCount
    }
  }
`;

// ============================================
// Dashboard Queries
// ============================================

export const GET_DASHBOARD_STATS = gql`
  query GetDashboardStats {
    dashboardStats {
      totalEntities
      totalInvestigations
      activeAlerts
      pendingTasks
      recentActivity {
        id
        type
        description
        timestamp
        entityId
        userId
      }
      entityBreakdown {
        type
        count
      }
      priorityBreakdown {
        priority
        count
      }
    }
  }
`;

// ============================================
// Subscriptions
// ============================================

export const ENTITY_CREATED_SUBSCRIPTION = gql`
  subscription OnEntityCreated {
    entityCreated {
      id
      type
      name
      description
      classification
      priority
      confidence
      createdAt
      location {
        latitude
        longitude
      }
    }
  }
`;

export const ENTITY_UPDATED_SUBSCRIPTION = gql`
  subscription OnEntityUpdated {
    entityUpdated {
      id
      type
      name
      description
      classification
      priority
      confidence
      updatedAt
      location {
        latitude
        longitude
      }
    }
  }
`;

export const ALERT_CREATED_SUBSCRIPTION = gql`
  subscription OnAlertCreated {
    alertCreated {
      id
      title
      description
      priority
      source
      location {
        latitude
        longitude
        name
      }
      timestamp
    }
  }
`;

export const INVESTIGATION_UPDATED_SUBSCRIPTION = gql`
  subscription OnInvestigationUpdated($id: ID!) {
    investigationUpdated(id: $id) {
      id
      status
      entityCount
      relationshipCount
      updatedAt
    }
  }
`;

export const SYNC_STATUS_SUBSCRIPTION = gql`
  subscription OnSyncStatus {
    syncStatus {
      lastSyncAt
      pendingChanges
      status
    }
  }
`;
