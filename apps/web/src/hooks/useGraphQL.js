"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INVESTIGATION_UPDATES = exports.ALERT_UPDATES = exports.ENTITY_UPDATES = exports.UPDATE_ALERT_STATUS = exports.ADD_ENTITY_TO_INVESTIGATION = exports.UPDATE_INVESTIGATION = exports.CREATE_INVESTIGATION = exports.GET_ALERTS = exports.GET_INVESTIGATIONS = exports.GET_ENTITY_RELATIONSHIPS = exports.GET_ENTITIES = void 0;
exports.useEntities = useEntities;
exports.useEntityRelationships = useEntityRelationships;
exports.useInvestigations = useInvestigations;
exports.useAlerts = useAlerts;
exports.useCreateInvestigation = useCreateInvestigation;
exports.useUpdateInvestigation = useUpdateInvestigation;
exports.useAddEntityToInvestigation = useAddEntityToInvestigation;
exports.useUpdateAlertStatus = useUpdateAlertStatus;
exports.useEntityUpdates = useEntityUpdates;
exports.useAlertUpdates = useAlertUpdates;
exports.useInvestigationUpdates = useInvestigationUpdates;
const react_1 = require("@apollo/client/react");
const client_1 = require("@apollo/client");
// GraphQL Queries
exports.GET_ENTITIES = (0, client_1.gql) `
  query GetEntities($filters: EntityFilters) {
    entities(filters: $filters) {
      id
      type
      value
      confidence
      source
      firstSeen
      lastSeen
      properties
      metadata
      riskScore
      threatLevel
    }
  }
`;
exports.GET_ENTITY_RELATIONSHIPS = (0, client_1.gql) `
  query GetEntityRelationships($entityId: ID!) {
    entity(id: $entityId) {
      id
      relationships {
        id
        type
        targetEntity {
          id
          type
          value
          confidence
        }
        confidence
        source
        firstSeen
        lastSeen
        properties
      }
    }
  }
`;
exports.GET_INVESTIGATIONS = (0, client_1.gql) `
  query GetInvestigations($status: String, $assignedTo: ID) {
    investigations(status: $status, assignedTo: $assignedTo) {
      id
      name
      description
      status
      priority
      assignedTo {
        id
        name
        email
      }
      createdAt
      updatedAt
      entities {
        id
        type
        value
      }
      tags
      metadata
    }
  }
`;
exports.GET_ALERTS = (0, client_1.gql) `
  query GetAlerts($severity: String, $status: String) {
    alerts(severity: $severity, status: $status) {
      id
      title
      description
      severity
      status
      source
      createdAt
      updatedAt
      entities {
        id
        type
        value
      }
      rules {
        id
        name
        type
      }
      metadata
    }
  }
`;
// GraphQL Mutations
exports.CREATE_INVESTIGATION = (0, client_1.gql) `
  mutation CreateInvestigation($input: CreateInvestigationInput!) {
    createInvestigation(input: $input) {
      id
      name
      description
      status
      priority
      assignedTo {
        id
        name
      }
      createdAt
    }
  }
`;
exports.UPDATE_INVESTIGATION = (0, client_1.gql) `
  mutation UpdateInvestigation($id: ID!, $input: UpdateInvestigationInput!) {
    updateInvestigation(id: $id, input: $input) {
      id
      name
      description
      status
      priority
      updatedAt
    }
  }
`;
exports.ADD_ENTITY_TO_INVESTIGATION = (0, client_1.gql) `
  mutation AddEntityToInvestigation($investigationId: ID!, $entityId: ID!) {
    addEntityToInvestigation(
      investigationId: $investigationId
      entityId: $entityId
    ) {
      id
      entities {
        id
        type
        value
      }
    }
  }
`;
exports.UPDATE_ALERT_STATUS = (0, client_1.gql) `
  mutation UpdateAlertStatus($id: ID!, $status: String!) {
    updateAlertStatus(id: $id, status: $status) {
      id
      status
      updatedAt
    }
  }
`;
// GraphQL Subscriptions
exports.ENTITY_UPDATES = (0, client_1.gql) `
  subscription EntityUpdates {
    entityUpdated {
      id
      type
      value
      confidence
      lastSeen
      riskScore
      threatLevel
    }
  }
`;
exports.ALERT_UPDATES = (0, client_1.gql) `
  subscription AlertUpdates {
    alertCreated {
      id
      title
      severity
      status
      createdAt
      entities {
        id
        type
        value
      }
    }
  }
`;
exports.INVESTIGATION_UPDATES = (0, client_1.gql) `
  subscription InvestigationUpdates($investigationId: ID) {
    investigationUpdated(id: $investigationId) {
      id
      name
      status
      priority
      updatedAt
      entities {
        id
        type
        value
      }
    }
  }
`;
// Custom hooks for common operations
function useEntities(filters) {
    return (0, react_1.useQuery)(exports.GET_ENTITIES, {
        variables: { filters },
        fetchPolicy: 'cache-and-network',
        errorPolicy: 'all',
    });
}
function useEntityRelationships(entityId) {
    return (0, react_1.useQuery)(exports.GET_ENTITY_RELATIONSHIPS, {
        variables: { entityId },
        skip: !entityId,
        fetchPolicy: 'cache-and-network',
    });
}
function useInvestigations(filters) {
    return (0, react_1.useQuery)(exports.GET_INVESTIGATIONS, {
        variables: filters,
        fetchPolicy: 'cache-and-network',
        pollInterval: 30000, // Poll every 30 seconds
    });
}
function useAlerts(filters) {
    return (0, react_1.useQuery)(exports.GET_ALERTS, {
        variables: filters,
        fetchPolicy: 'cache-and-network',
        pollInterval: 15000, // Poll every 15 seconds for alerts
    });
}
function useCreateInvestigation() {
    return (0, react_1.useMutation)(exports.CREATE_INVESTIGATION, {
        refetchQueries: [{ query: exports.GET_INVESTIGATIONS }],
    });
}
function useUpdateInvestigation() {
    return (0, react_1.useMutation)(exports.UPDATE_INVESTIGATION);
}
function useAddEntityToInvestigation() {
    return (0, react_1.useMutation)(exports.ADD_ENTITY_TO_INVESTIGATION);
}
function useUpdateAlertStatus() {
    return (0, react_1.useMutation)(exports.UPDATE_ALERT_STATUS, {
        refetchQueries: [{ query: exports.GET_ALERTS }],
    });
}
// Subscription hooks
function useEntityUpdates() {
    return (0, react_1.useSubscription)(exports.ENTITY_UPDATES);
}
function useAlertUpdates() {
    return (0, react_1.useSubscription)(exports.ALERT_UPDATES);
}
function useInvestigationUpdates(investigationId) {
    return (0, react_1.useSubscription)(exports.INVESTIGATION_UPDATES, {
        variables: { investigationId },
        skip: !investigationId,
    });
}
