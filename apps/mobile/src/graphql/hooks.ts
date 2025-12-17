import { useQuery, useMutation, useSubscription, type QueryHookOptions } from '@apollo/client';
import { useCallback, useEffect } from 'react';
import {
  GET_ENTITIES,
  GET_ENTITY,
  CREATE_ENTITY,
  UPDATE_ENTITY,
  GET_INVESTIGATIONS,
  GET_INVESTIGATION,
  GET_ALERTS,
  ACKNOWLEDGE_ALERT,
  MARK_ALERT_READ,
  GET_GEOINT_FEATURES,
  GET_GEOINT_LAYERS,
  GET_DASHBOARD_STATS,
  ENTITY_CREATED_SUBSCRIPTION,
  ENTITY_UPDATED_SUBSCRIPTION,
  ALERT_CREATED_SUBSCRIPTION,
} from './operations';
import type { Entity, Investigation, OSINTAlert, GEOINTFeature, GEOINTLayer, Priority } from '@/types';

// ============================================
// Entity Hooks
// ============================================

export interface UseEntitiesOptions {
  filter?: Record<string, unknown>;
  search?: string;
  first?: number;
  after?: string;
}

export const useEntities = (options: UseEntitiesOptions = {}) => {
  const { filter, search, first = 20, after } = options;

  const { data, loading, error, fetchMore, refetch, subscribeToMore } = useQuery(
    GET_ENTITIES,
    {
      variables: { filter, search, first, after },
      notifyOnNetworkStatusChange: true,
    },
  );

  // Subscribe to new entities
  useEffect(() => {
    const unsubscribe = subscribeToMore({
      document: ENTITY_CREATED_SUBSCRIPTION,
      updateQuery: (prev, { subscriptionData }) => {
        if (!subscriptionData.data) return prev;
        const newEntity = subscriptionData.data.entityCreated;
        return {
          ...prev,
          entities: {
            ...prev.entities,
            edges: [
              { node: newEntity, cursor: newEntity.id, __typename: 'EntityEdge' },
              ...prev.entities.edges,
            ],
            totalCount: prev.entities.totalCount + 1,
          },
        };
      },
    });

    return () => unsubscribe();
  }, [subscribeToMore]);

  const loadMore = useCallback(() => {
    if (data?.entities?.pageInfo?.hasNextPage) {
      fetchMore({
        variables: { after: data.entities.pageInfo.endCursor },
      });
    }
  }, [data, fetchMore]);

  return {
    entities: data?.entities?.edges?.map((e: { node: Entity }) => e.node) || [],
    totalCount: data?.entities?.totalCount || 0,
    hasNextPage: data?.entities?.pageInfo?.hasNextPage || false,
    loading,
    error,
    loadMore,
    refetch,
  };
};

export const useEntity = (id: string) => {
  const { data, loading, error, refetch } = useQuery(GET_ENTITY, {
    variables: { id },
    skip: !id,
  });

  // Subscribe to updates
  const { data: updateData } = useSubscription(ENTITY_UPDATED_SUBSCRIPTION);

  useEffect(() => {
    if (updateData?.entityUpdated?.id === id) {
      refetch();
    }
  }, [updateData, id, refetch]);

  return {
    entity: data?.entity as Entity | undefined,
    loading,
    error,
    refetch,
  };
};

export const useCreateEntity = () => {
  const [createEntityMutation, { loading, error }] = useMutation(CREATE_ENTITY, {
    refetchQueries: [GET_ENTITIES],
  });

  const createEntity = useCallback(
    async (input: Partial<Entity>) => {
      const result = await createEntityMutation({ variables: { input } });
      return result.data?.createEntity;
    },
    [createEntityMutation],
  );

  return { createEntity, loading, error };
};

export const useUpdateEntity = () => {
  const [updateEntityMutation, { loading, error }] = useMutation(UPDATE_ENTITY);

  const updateEntity = useCallback(
    async (id: string, input: Partial<Entity>) => {
      const result = await updateEntityMutation({ variables: { id, input } });
      return result.data?.updateEntity;
    },
    [updateEntityMutation],
  );

  return { updateEntity, loading, error };
};

// ============================================
// Investigation Hooks
// ============================================

export interface UseInvestigationsOptions {
  filter?: Record<string, unknown>;
  first?: number;
  after?: string;
}

export const useInvestigations = (options: UseInvestigationsOptions = {}) => {
  const { filter, first = 20, after } = options;

  const { data, loading, error, fetchMore, refetch } = useQuery(
    GET_INVESTIGATIONS,
    {
      variables: { filter, first, after },
      notifyOnNetworkStatusChange: true,
    },
  );

  const loadMore = useCallback(() => {
    if (data?.investigations?.pageInfo?.hasNextPage) {
      fetchMore({
        variables: { after: data.investigations.pageInfo.endCursor },
      });
    }
  }, [data, fetchMore]);

  return {
    investigations:
      data?.investigations?.edges?.map((e: { node: Investigation }) => e.node) || [],
    totalCount: data?.investigations?.totalCount || 0,
    hasNextPage: data?.investigations?.pageInfo?.hasNextPage || false,
    loading,
    error,
    loadMore,
    refetch,
  };
};

export const useInvestigation = (id: string) => {
  const { data, loading, error, refetch } = useQuery(GET_INVESTIGATION, {
    variables: { id },
    skip: !id,
  });

  return {
    investigation: data?.investigation as Investigation | undefined,
    loading,
    error,
    refetch,
  };
};

// ============================================
// Alert Hooks
// ============================================

export interface UseAlertsOptions {
  filter?: Record<string, unknown>;
  priority?: Priority;
  first?: number;
  after?: string;
}

export const useAlerts = (options: UseAlertsOptions = {}) => {
  const { filter, priority, first = 20, after } = options;

  const { data, loading, error, fetchMore, refetch, subscribeToMore } = useQuery(
    GET_ALERTS,
    {
      variables: { filter, priority, first, after },
      notifyOnNetworkStatusChange: true,
    },
  );

  // Subscribe to new alerts
  useEffect(() => {
    const unsubscribe = subscribeToMore({
      document: ALERT_CREATED_SUBSCRIPTION,
      updateQuery: (prev, { subscriptionData }) => {
        if (!subscriptionData.data) return prev;
        const newAlert = subscriptionData.data.alertCreated;
        return {
          ...prev,
          alerts: {
            ...prev.alerts,
            edges: [
              { node: newAlert, cursor: newAlert.id, __typename: 'AlertEdge' },
              ...prev.alerts.edges,
            ],
            totalCount: prev.alerts.totalCount + 1,
          },
        };
      },
    });

    return () => unsubscribe();
  }, [subscribeToMore]);

  const loadMore = useCallback(() => {
    if (data?.alerts?.pageInfo?.hasNextPage) {
      fetchMore({
        variables: { after: data.alerts.pageInfo.endCursor },
      });
    }
  }, [data, fetchMore]);

  return {
    alerts: data?.alerts?.edges?.map((e: { node: OSINTAlert }) => e.node) || [],
    totalCount: data?.alerts?.totalCount || 0,
    hasNextPage: data?.alerts?.pageInfo?.hasNextPage || false,
    loading,
    error,
    loadMore,
    refetch,
  };
};

export const useAcknowledgeAlert = () => {
  const [acknowledgeAlertMutation, { loading, error }] = useMutation(ACKNOWLEDGE_ALERT);

  const acknowledgeAlert = useCallback(
    async (id: string) => {
      const result = await acknowledgeAlertMutation({ variables: { id } });
      return result.data?.acknowledgeAlert;
    },
    [acknowledgeAlertMutation],
  );

  return { acknowledgeAlert, loading, error };
};

export const useMarkAlertRead = () => {
  const [markReadMutation, { loading, error }] = useMutation(MARK_ALERT_READ);

  const markAlertRead = useCallback(
    async (id: string) => {
      const result = await markReadMutation({ variables: { id } });
      return result.data?.markAlertRead;
    },
    [markReadMutation],
  );

  return { markAlertRead, loading, error };
};

// ============================================
// GEOINT Hooks
// ============================================

export interface UseGEOINTFeaturesOptions {
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  filter?: Record<string, unknown>;
  first?: number;
}

export const useGEOINTFeatures = (options: UseGEOINTFeaturesOptions = {}) => {
  const { bounds, filter, first = 500 } = options;

  const { data, loading, error, refetch } = useQuery(GET_GEOINT_FEATURES, {
    variables: { bounds, filter, first },
    skip: !bounds,
  });

  return {
    features: (data?.geointFeatures || []) as GEOINTFeature[],
    loading,
    error,
    refetch,
  };
};

export const useGEOINTLayers = () => {
  const { data, loading, error, refetch } = useQuery(GET_GEOINT_LAYERS);

  return {
    layers: (data?.geointLayers || []) as GEOINTLayer[],
    loading,
    error,
    refetch,
  };
};

// ============================================
// Dashboard Hooks
// ============================================

export const useDashboardStats = () => {
  const { data, loading, error, refetch } = useQuery(GET_DASHBOARD_STATS, {
    pollInterval: 60000, // Refresh every minute
  });

  return {
    stats: data?.dashboardStats,
    loading,
    error,
    refetch,
  };
};
