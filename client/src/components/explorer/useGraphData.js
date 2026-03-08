"use strict";
/**
 * useGraphData Hook
 * GraphQL hooks for live graph data synchronization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GRAPH_UPDATES_SUBSCRIPTION = exports.GET_ENRICHMENT = exports.PREDICT_RELATIONSHIPS = exports.SEARCH_ENTITIES = exports.GET_ENTITY_DETAILS = exports.GET_GRAPH_DATA = void 0;
exports.useGraphData = useGraphData;
exports.useEntityDetails = useEntityDetails;
exports.useEntitySearch = useEntitySearch;
exports.useEnrichment = useEnrichment;
const client_1 = require("@apollo/client");
const react_1 = require("react");
const types_1 = require("./types");
// GraphQL Queries
exports.GET_GRAPH_DATA = (0, client_1.gql) `
  query GetGraphData($investigationId: ID!) {
    graphData(investigationId: $investigationId) {
      nodes {
        id
        label
        type
        description
        confidence
        properties
        source
        createdAt
        updatedAt
      }
      edges {
        id
        fromEntityId
        toEntityId
        type
        label
        confidence
        properties
        source
        createdAt
        updatedAt
      }
      nodeCount
      edgeCount
    }
  }
`;
exports.GET_ENTITY_DETAILS = (0, client_1.gql) `
  query GetEntityDetails($entityId: ID!) {
    getEntityDetails(entityId: $entityId) {
      id
      label
      type
      description
      confidence
      properties
      source
      createdAt
      updatedAt
      attack_ttps
      capec_ttps
      actor_links
      triage_score
    }
  }
`;
exports.SEARCH_ENTITIES = (0, client_1.gql) `
  query SearchEntities($query: String!, $limit: Int) {
    searchEntities(query: $query, limit: $limit) {
      id
      label
      type
      description
      confidence
    }
  }
`;
exports.PREDICT_RELATIONSHIPS = (0, client_1.gql) `
  query PredictRelationships($entityId: ID!, $candidateIds: [ID!]!) {
    predictRelationships(entityId: $entityId, candidateIds: $candidateIds) {
      target_entity
      predicted_relationship
      confidence
      reasoning
    }
  }
`;
exports.GET_ENRICHMENT = (0, client_1.gql) `
  query GetEnrichment($entityId: ID!) {
    entityEnrichment(entityId: $entityId) {
      entityId
      lastEnriched
      externalSources {
        source
        data
        confidence
        lastUpdated
      }
      geolocation {
        country
        city
        latitude
        longitude
        accuracy
      }
      reputation {
        score
        category
        sources
        lastChecked
      }
      relatedEntities {
        id
        type
        label
        description
      }
    }
  }
`;
// Subscription for real-time updates
exports.GRAPH_UPDATES_SUBSCRIPTION = (0, client_1.gql) `
  subscription OnGraphUpdated($investigationId: ID!) {
    graphUpdated(investigationId: $investigationId) {
      type
      node {
        id
        label
        type
        description
        confidence
        properties
      }
      edge {
        id
        fromEntityId
        toEntityId
        type
        label
        confidence
      }
    }
  }
`;
function useGraphData({ investigationId, pollInterval = 30000, enableSubscription = true, }) {
    const { data, loading, error, refetch } = (0, client_1.useQuery)(exports.GET_GRAPH_DATA, {
        variables: { investigationId },
        pollInterval,
        skip: !investigationId,
        fetchPolicy: 'cache-and-network',
    });
    // Subscribe to real-time updates when enabled
    (0, client_1.useSubscription)(exports.GRAPH_UPDATES_SUBSCRIPTION, {
        variables: { investigationId },
        skip: !enableSubscription || !investigationId,
        onData: () => {
            // Refetch on updates to ensure consistency
            refetch();
        },
    });
    const nodes = (0, react_1.useMemo)(() => {
        if (!data?.graphData?.nodes)
            return [];
        return data.graphData.nodes.map(types_1.transformToGraphNode);
    }, [data?.graphData?.nodes]);
    const edges = (0, react_1.useMemo)(() => {
        if (!data?.graphData?.edges)
            return [];
        return data.graphData.edges.map(types_1.transformToGraphEdge);
    }, [data?.graphData?.edges]);
    const cytoscapeElements = (0, react_1.useMemo)(() => (0, types_1.toCytoscapeElements)(nodes, edges), [nodes, edges]);
    const handleRefetch = (0, react_1.useCallback)(async () => {
        await refetch();
    }, [refetch]);
    return {
        nodes,
        edges,
        cytoscapeElements,
        nodeCount: data?.graphData?.nodeCount ?? 0,
        edgeCount: data?.graphData?.edgeCount ?? 0,
        loading,
        error: error ?? null,
        refetch: handleRefetch,
    };
}
function useEntityDetails(entityId) {
    const { data, loading, error } = (0, client_1.useQuery)(exports.GET_ENTITY_DETAILS, {
        variables: { entityId },
        skip: !entityId,
        fetchPolicy: 'cache-first',
    });
    const entity = (0, react_1.useMemo)(() => {
        if (!data?.getEntityDetails)
            return null;
        return (0, types_1.transformToGraphNode)(data.getEntityDetails);
    }, [data?.getEntityDetails]);
    return {
        entity,
        loading,
        error: error ?? null,
    };
}
function useEntitySearch() {
    const { data, loading, error, refetch } = (0, client_1.useQuery)(exports.SEARCH_ENTITIES, {
        skip: true, // Don't run on mount
    });
    const results = (0, react_1.useMemo)(() => {
        if (!data?.searchEntities)
            return [];
        return data.searchEntities.map(types_1.transformToGraphNode);
    }, [data?.searchEntities]);
    const search = (0, react_1.useCallback)((query, limit = 20) => {
        if (query.length >= 2) {
            refetch({ query, limit });
        }
    }, [refetch]);
    return {
        results,
        loading,
        error: error ?? null,
        search,
    };
}
function useEnrichment(entityId) {
    const { data, loading, error } = (0, client_1.useQuery)(exports.GET_ENRICHMENT, {
        variables: { entityId },
        skip: !entityId,
        fetchPolicy: 'cache-first',
    });
    const enrichment = (0, react_1.useMemo)(() => {
        if (!data?.entityEnrichment)
            return null;
        const e = data.entityEnrichment;
        return {
            entityId: e.entityId,
            lastEnriched: e.lastEnriched,
            externalSources: e.externalSources,
            geolocation: e.geolocation ?? undefined,
            reputation: e.reputation,
            relatedEntities: e.relatedEntities.map(types_1.transformToGraphNode),
        };
    }, [data?.entityEnrichment]);
    return {
        enrichment,
        loading,
        error: error ?? null,
    };
}
