/**
 * useGraphData Hook
 * GraphQL hooks for live graph data synchronization
 */

import { useQuery, useMutation, useSubscription, gql } from '@apollo/client';
import { useCallback, useMemo } from 'react';
import type { GraphData, Node, Edge } from '../../generated/graphql';
import {
  GraphNode,
  GraphEdge,
  transformToGraphNode,
  transformToGraphEdge,
  toCytoscapeElements,
} from './types';

// GraphQL Queries
export const GET_GRAPH_DATA = gql`
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

export const GET_ENTITY_DETAILS = gql`
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

export const SEARCH_ENTITIES = gql`
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

export const PREDICT_RELATIONSHIPS = gql`
  query PredictRelationships($entityId: ID!, $candidateIds: [ID!]!) {
    predictRelationships(entityId: $entityId, candidateIds: $candidateIds) {
      target_entity
      predicted_relationship
      confidence
      reasoning
    }
  }
`;

export const GET_ENRICHMENT = gql`
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
export const GRAPH_UPDATES_SUBSCRIPTION = gql`
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

export interface UseGraphDataOptions {
  investigationId: string;
  pollInterval?: number;
  enableSubscription?: boolean;
}

export interface UseGraphDataResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  cytoscapeElements: ReturnType<typeof toCytoscapeElements>;
  nodeCount: number;
  edgeCount: number;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useGraphData({
  investigationId,
  pollInterval = 30000,
  enableSubscription = true,
}: UseGraphDataOptions): UseGraphDataResult {
  const { data, loading, error, refetch } = useQuery<{
    graphData: GraphData;
  }>(GET_GRAPH_DATA, {
    variables: { investigationId },
    pollInterval,
    skip: !investigationId,
    fetchPolicy: 'cache-and-network',
  });

  // Subscribe to real-time updates when enabled
  useSubscription(GRAPH_UPDATES_SUBSCRIPTION, {
    variables: { investigationId },
    skip: !enableSubscription || !investigationId,
    onData: () => {
      // Refetch on updates to ensure consistency
      refetch();
    },
  });

  const nodes = useMemo(() => {
    if (!data?.graphData?.nodes) return [];
    return data.graphData.nodes.map(transformToGraphNode);
  }, [data?.graphData?.nodes]);

  const edges = useMemo(() => {
    if (!data?.graphData?.edges) return [];
    return data.graphData.edges.map(transformToGraphEdge);
  }, [data?.graphData?.edges]);

  const cytoscapeElements = useMemo(
    () => toCytoscapeElements(nodes, edges),
    [nodes, edges],
  );

  const handleRefetch = useCallback(async () => {
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

export interface UseEntityDetailsResult {
  entity: GraphNode | null;
  loading: boolean;
  error: Error | null;
}

export function useEntityDetails(entityId: string | null): UseEntityDetailsResult {
  const { data, loading, error } = useQuery<{ getEntityDetails: Node }>(
    GET_ENTITY_DETAILS,
    {
      variables: { entityId },
      skip: !entityId,
      fetchPolicy: 'cache-first',
    },
  );

  const entity = useMemo(() => {
    if (!data?.getEntityDetails) return null;
    return transformToGraphNode(data.getEntityDetails);
  }, [data?.getEntityDetails]);

  return {
    entity,
    loading,
    error: error ?? null,
  };
}

export interface UseEntitySearchResult {
  results: GraphNode[];
  loading: boolean;
  error: Error | null;
  search: (query: string, limit?: number) => void;
}

export function useEntitySearch(): UseEntitySearchResult {
  const { data, loading, error, refetch } = useQuery<{
    searchEntities: Node[];
  }>(SEARCH_ENTITIES, {
    skip: true, // Don't run on mount
  });

  const results = useMemo(() => {
    if (!data?.searchEntities) return [];
    return data.searchEntities.map(transformToGraphNode);
  }, [data?.searchEntities]);

  const search = useCallback(
    (query: string, limit = 20) => {
      if (query.length >= 2) {
        refetch({ query, limit });
      }
    },
    [refetch],
  );

  return {
    results,
    loading,
    error: error ?? null,
    search,
  };
}

export interface UseEnrichmentResult {
  enrichment: {
    entityId: string;
    lastEnriched: string;
    externalSources: Array<{
      source: string;
      data: unknown;
      confidence: number;
      lastUpdated: string;
    }>;
    geolocation?: {
      country?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
    };
    reputation: {
      score: number;
      category: string;
      sources: string[];
    };
    relatedEntities: GraphNode[];
  } | null;
  loading: boolean;
  error: Error | null;
}

export function useEnrichment(entityId: string | null): UseEnrichmentResult {
  const { data, loading, error } = useQuery(GET_ENRICHMENT, {
    variables: { entityId },
    skip: !entityId,
    fetchPolicy: 'cache-first',
  });

  const enrichment = useMemo(() => {
    if (!data?.entityEnrichment) return null;
    const e = data.entityEnrichment;
    return {
      entityId: e.entityId,
      lastEnriched: e.lastEnriched,
      externalSources: e.externalSources,
      geolocation: e.geolocation ?? undefined,
      reputation: e.reputation,
      relatedEntities: e.relatedEntities.map(transformToGraphNode),
    };
  }, [data?.entityEnrichment]);

  return {
    enrichment,
    loading,
    error: error ?? null,
  };
}
