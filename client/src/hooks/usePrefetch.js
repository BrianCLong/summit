"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDashboardPrefetch = useDashboardPrefetch;
exports.useGraphWorkbenchPrefetch = useGraphWorkbenchPrefetch;
exports.useIntelligentPrefetch = useIntelligentPrefetch;
const react_1 = require("react");
const client_1 = require("@apollo/client");
const graphql_ts_1 = require("../generated/graphql.ts");
/**
 * Hook to prefetch critical dashboard data on route enter
 * Eliminates "panel pop-in" by warming the cache
 */
function useDashboardPrefetch() {
    const client = (0, client_1.useApolloClient)();
    (0, react_1.useEffect)(() => {
        void client
            .query({ query: graphql_ts_1.DB_ServerStatsDocument, fetchPolicy: 'cache-first' })
            .catch((error) => {
            console.warn('Dashboard prefetch failed: server stats', error);
        });
        void client
            .query({ query: graphql_ts_1.DB_InvestigationsDocument, fetchPolicy: 'cache-first' })
            .catch((error) => {
            console.warn('Dashboard prefetch failed: investigations', error);
        });
    }, [client]);
}
/**
 * Hook to prefetch graph workbench data for a specific investigation
 */
function useGraphWorkbenchPrefetch(investigationId) {
    const client = (0, client_1.useApolloClient)();
    (0, react_1.useEffect)(() => {
        if (!investigationId)
            return;
        void client
            .query({
            query: graphql_ts_1.GW_GraphDataDocument,
            variables: { investigationId },
            fetchPolicy: 'cache-first',
        })
            .catch((error) => {
            console.warn('Graph workbench prefetch failed', error);
        });
    }, [client, investigationId]);
}
/**
 * Hook for intelligent cache warming based on user behavior
 */
function useIntelligentPrefetch() {
    const client = (0, client_1.useApolloClient)();
    (0, react_1.useEffect)(() => {
        let cancelled = false;
        const schedule = () => {
            if (cancelled)
                return;
            void client
                .query({ query: graphql_ts_1.DB_InvestigationsDocument, fetchPolicy: 'cache-first' })
                .catch((error) => {
                console.warn('Intelligent prefetch failed', error);
            });
        };
        if (typeof window !== 'undefined') {
            const requestIdleCallback = window
                .requestIdleCallback;
            const cancelIdleCallback = window
                .cancelIdleCallback;
            if (requestIdleCallback) {
                const id = requestIdleCallback(schedule, { timeout: 2000 });
                return () => {
                    cancelled = true;
                    if (cancelIdleCallback)
                        cancelIdleCallback(id);
                };
            }
        }
        const timer = setTimeout(schedule, 1500);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [client]);
}
