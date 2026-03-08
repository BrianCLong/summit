"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDashboardStats = exports.useGEOINTLayers = exports.useGEOINTFeatures = exports.useMarkAlertRead = exports.useAcknowledgeAlert = exports.useAlerts = exports.useInvestigation = exports.useInvestigations = exports.useUpdateEntity = exports.useCreateEntity = exports.useEntity = exports.useEntities = void 0;
const client_1 = require("@apollo/client");
const react_1 = require("react");
const operations_1 = require("./operations");
const useEntities = (options = {}) => {
    const { filter, search, first = 20, after } = options;
    const { data, loading, error, fetchMore, refetch, subscribeToMore } = (0, client_1.useQuery)(operations_1.GET_ENTITIES, {
        variables: { filter, search, first, after },
        notifyOnNetworkStatusChange: true,
    });
    // Subscribe to new entities
    (0, react_1.useEffect)(() => {
        const unsubscribe = subscribeToMore({
            document: operations_1.ENTITY_CREATED_SUBSCRIPTION,
            updateQuery: (prev, { subscriptionData }) => {
                if (!subscriptionData.data)
                    return prev;
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
    const loadMore = (0, react_1.useCallback)(() => {
        if (data?.entities?.pageInfo?.hasNextPage) {
            fetchMore({
                variables: { after: data.entities.pageInfo.endCursor },
            });
        }
    }, [data, fetchMore]);
    return {
        entities: data?.entities?.edges?.map((e) => e.node) || [],
        totalCount: data?.entities?.totalCount || 0,
        hasNextPage: data?.entities?.pageInfo?.hasNextPage || false,
        loading,
        error,
        loadMore,
        refetch,
    };
};
exports.useEntities = useEntities;
const useEntity = (id) => {
    const { data, loading, error, refetch } = (0, client_1.useQuery)(operations_1.GET_ENTITY, {
        variables: { id },
        skip: !id,
    });
    // Subscribe to updates
    const { data: updateData } = (0, client_1.useSubscription)(operations_1.ENTITY_UPDATED_SUBSCRIPTION);
    (0, react_1.useEffect)(() => {
        if (updateData?.entityUpdated?.id === id) {
            refetch();
        }
    }, [updateData, id, refetch]);
    return {
        entity: data?.entity,
        loading,
        error,
        refetch,
    };
};
exports.useEntity = useEntity;
const useCreateEntity = () => {
    const [createEntityMutation, { loading, error }] = (0, client_1.useMutation)(operations_1.CREATE_ENTITY, {
        refetchQueries: [operations_1.GET_ENTITIES],
    });
    const createEntity = (0, react_1.useCallback)(async (input) => {
        const result = await createEntityMutation({ variables: { input } });
        return result.data?.createEntity;
    }, [createEntityMutation]);
    return { createEntity, loading, error };
};
exports.useCreateEntity = useCreateEntity;
const useUpdateEntity = () => {
    const [updateEntityMutation, { loading, error }] = (0, client_1.useMutation)(operations_1.UPDATE_ENTITY);
    const updateEntity = (0, react_1.useCallback)(async (id, input) => {
        const result = await updateEntityMutation({ variables: { id, input } });
        return result.data?.updateEntity;
    }, [updateEntityMutation]);
    return { updateEntity, loading, error };
};
exports.useUpdateEntity = useUpdateEntity;
const useInvestigations = (options = {}) => {
    const { filter, first = 20, after } = options;
    const { data, loading, error, fetchMore, refetch } = (0, client_1.useQuery)(operations_1.GET_INVESTIGATIONS, {
        variables: { filter, first, after },
        notifyOnNetworkStatusChange: true,
    });
    const loadMore = (0, react_1.useCallback)(() => {
        if (data?.investigations?.pageInfo?.hasNextPage) {
            fetchMore({
                variables: { after: data.investigations.pageInfo.endCursor },
            });
        }
    }, [data, fetchMore]);
    return {
        investigations: data?.investigations?.edges?.map((e) => e.node) || [],
        totalCount: data?.investigations?.totalCount || 0,
        hasNextPage: data?.investigations?.pageInfo?.hasNextPage || false,
        loading,
        error,
        loadMore,
        refetch,
    };
};
exports.useInvestigations = useInvestigations;
const useInvestigation = (id) => {
    const { data, loading, error, refetch } = (0, client_1.useQuery)(operations_1.GET_INVESTIGATION, {
        variables: { id },
        skip: !id,
    });
    return {
        investigation: data?.investigation,
        loading,
        error,
        refetch,
    };
};
exports.useInvestigation = useInvestigation;
const useAlerts = (options = {}) => {
    const { filter, priority, first = 20, after } = options;
    const { data, loading, error, fetchMore, refetch, subscribeToMore } = (0, client_1.useQuery)(operations_1.GET_ALERTS, {
        variables: { filter, priority, first, after },
        notifyOnNetworkStatusChange: true,
    });
    // Subscribe to new alerts
    (0, react_1.useEffect)(() => {
        const unsubscribe = subscribeToMore({
            document: operations_1.ALERT_CREATED_SUBSCRIPTION,
            updateQuery: (prev, { subscriptionData }) => {
                if (!subscriptionData.data)
                    return prev;
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
    const loadMore = (0, react_1.useCallback)(() => {
        if (data?.alerts?.pageInfo?.hasNextPage) {
            fetchMore({
                variables: { after: data.alerts.pageInfo.endCursor },
            });
        }
    }, [data, fetchMore]);
    return {
        alerts: data?.alerts?.edges?.map((e) => e.node) || [],
        totalCount: data?.alerts?.totalCount || 0,
        hasNextPage: data?.alerts?.pageInfo?.hasNextPage || false,
        loading,
        error,
        loadMore,
        refetch,
    };
};
exports.useAlerts = useAlerts;
const useAcknowledgeAlert = () => {
    const [acknowledgeAlertMutation, { loading, error }] = (0, client_1.useMutation)(operations_1.ACKNOWLEDGE_ALERT);
    const acknowledgeAlert = (0, react_1.useCallback)(async (id) => {
        const result = await acknowledgeAlertMutation({ variables: { id } });
        return result.data?.acknowledgeAlert;
    }, [acknowledgeAlertMutation]);
    return { acknowledgeAlert, loading, error };
};
exports.useAcknowledgeAlert = useAcknowledgeAlert;
const useMarkAlertRead = () => {
    const [markReadMutation, { loading, error }] = (0, client_1.useMutation)(operations_1.MARK_ALERT_READ);
    const markAlertRead = (0, react_1.useCallback)(async (id) => {
        const result = await markReadMutation({ variables: { id } });
        return result.data?.markAlertRead;
    }, [markReadMutation]);
    return { markAlertRead, loading, error };
};
exports.useMarkAlertRead = useMarkAlertRead;
const useGEOINTFeatures = (options = {}) => {
    const { bounds, filter, first = 500 } = options;
    const { data, loading, error, refetch } = (0, client_1.useQuery)(operations_1.GET_GEOINT_FEATURES, {
        variables: { bounds, filter, first },
        skip: !bounds,
    });
    return {
        features: (data?.geointFeatures || []),
        loading,
        error,
        refetch,
    };
};
exports.useGEOINTFeatures = useGEOINTFeatures;
const useGEOINTLayers = () => {
    const { data, loading, error, refetch } = (0, client_1.useQuery)(operations_1.GET_GEOINT_LAYERS);
    return {
        layers: (data?.geointLayers || []),
        loading,
        error,
        refetch,
    };
};
exports.useGEOINTLayers = useGEOINTLayers;
// ============================================
// Dashboard Hooks
// ============================================
const useDashboardStats = () => {
    const { data, loading, error, refetch } = (0, client_1.useQuery)(operations_1.GET_DASHBOARD_STATS, {
        pollInterval: 60000, // Refresh every minute
    });
    return {
        stats: data?.dashboardStats,
        loading,
        error,
        refetch,
    };
};
exports.useDashboardStats = useDashboardStats;
