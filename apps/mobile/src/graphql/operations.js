"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SYNC_STATUS_SUBSCRIPTION = exports.INVESTIGATION_UPDATED_SUBSCRIPTION = exports.ALERT_CREATED_SUBSCRIPTION = exports.ENTITY_UPDATED_SUBSCRIPTION = exports.ENTITY_CREATED_SUBSCRIPTION = exports.GET_DASHBOARD_STATS = exports.GET_GEOINT_LAYERS = exports.GET_GEOINT_FEATURES = exports.MARK_ALERT_READ = exports.ACKNOWLEDGE_ALERT = exports.GET_ALERTS = exports.GET_INVESTIGATION = exports.GET_INVESTIGATIONS = exports.UPDATE_ENTITY = exports.CREATE_ENTITY = exports.GET_ENTITY = exports.GET_ENTITIES = void 0;
const client_1 = require("@apollo/client");
// ============================================
// Entity Queries & Mutations
// ============================================
exports.GET_ENTITIES = (0, client_1.gql) `
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
exports.GET_ENTITY = (0, client_1.gql) `
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
exports.CREATE_ENTITY = (0, client_1.gql) `
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
exports.UPDATE_ENTITY = (0, client_1.gql) `
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
exports.GET_INVESTIGATIONS = (0, client_1.gql) `
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
exports.GET_INVESTIGATION = (0, client_1.gql) `
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
exports.GET_ALERTS = (0, client_1.gql) `
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
exports.ACKNOWLEDGE_ALERT = (0, client_1.gql) `
  mutation AcknowledgeAlert($id: ID!) {
    acknowledgeAlert(id: $id) {
      id
      isAcknowledged
      acknowledgedAt
      acknowledgedBy
    }
  }
`;
exports.MARK_ALERT_READ = (0, client_1.gql) `
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
exports.GET_GEOINT_FEATURES = (0, client_1.gql) `
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
exports.GET_GEOINT_LAYERS = (0, client_1.gql) `
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
exports.GET_DASHBOARD_STATS = (0, client_1.gql) `
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
exports.ENTITY_CREATED_SUBSCRIPTION = (0, client_1.gql) `
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
exports.ENTITY_UPDATED_SUBSCRIPTION = (0, client_1.gql) `
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
exports.ALERT_CREATED_SUBSCRIPTION = (0, client_1.gql) `
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
exports.INVESTIGATION_UPDATED_SUBSCRIPTION = (0, client_1.gql) `
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
exports.SYNC_STATUS_SUBSCRIPTION = (0, client_1.gql) `
  subscription OnSyncStatus {
    syncStatus {
      lastSyncAt
      pendingChanges
      status
    }
  }
`;
