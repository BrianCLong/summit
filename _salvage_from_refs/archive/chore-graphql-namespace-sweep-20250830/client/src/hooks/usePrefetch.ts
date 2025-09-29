import { useEffect } from 'react';
import { useApolloClient } from '@apollo/client';
import { 
  useDB_ServerStatsQuery,
  useDB_InvestigationsQuery,
  DB_ServerStatsDocument,
  DB_InvestigationsDocument
} from '../generated/graphql.js';

/**
 * Hook to prefetch critical dashboard data on route enter
 * Eliminates "panel pop-in" by warming the cache
 */
export function useDashboardPrefetch() {
  const client = useApolloClient();

  useEffect(() => {
    const prefetchQueries = [
      // Core dashboard stats
      client.query({
        query: DB_ServerStatsDocument,
        fetchPolicy: 'cache-first',
        errorPolicy: 'all'
      }),
      
      // Recent investigations for dashboard overview
      client.query({
        query: DB_InvestigationsDocument,
        fetchPolicy: 'cache-first',
        errorPolicy: 'all'
      })
    ];

    // Execute all prefetch queries in parallel
    Promise.allSettled(prefetchQueries).then((results) => {
      if (import.meta.env.DEV) {
        const successful = results.filter(r => r.status === 'fulfilled').length;
        console.log(`🚀 Dashboard prefetch: ${successful}/${results.length} queries cached`);
      }
    });
  }, [client]);
}

/**
 * Hook to prefetch graph workbench data for a specific investigation
 */
export function useGraphWorkbenchPrefetch(investigationId?: string) {
  const client = useApolloClient();

  useEffect(() => {
    if (!investigationId) return;

    // Prefetch graph data for the investigation
    client.query({
      query: DB_ServerStatsDocument, // This would be GW_GraphDataDocument in real implementation
      variables: { investigationId },
      fetchPolicy: 'cache-first',
      errorPolicy: 'all'
    }).catch(() => {
      // Silently fail - this is just prefetching
    });
  }, [client, investigationId]);
}

/**
 * Hook for intelligent cache warming based on user behavior
 */
export function useIntelligentPrefetch() {
  const client = useApolloClient();

  useEffect(() => {
    // Prefetch likely next pages based on current route
    const currentPath = window.location.pathname;
    
    let nextQueries: Array<{ query: any; variables?: any }> = [];
    
    switch (currentPath) {
      case '/dashboard':
        // From dashboard, users often go to graph workbench
        nextQueries = [
          { query: DB_InvestigationsDocument }
        ];
        break;
      case '/investigations':
        // From investigations, users often open investigation details
        nextQueries = [
          { query: DB_ServerStatsDocument }
        ];
        break;
      default:
        // Default prefetch for common queries
        nextQueries = [
          { query: DB_ServerStatsDocument }
        ];
    }

    // Execute prefetch queries with low priority
    const prefetchTimer = setTimeout(() => {
      Promise.allSettled(
        nextQueries.map(({ query, variables }) =>
          client.query({
            query,
            variables,
            fetchPolicy: 'cache-first',
            errorPolicy: 'all'
          })
        )
      );
    }, 2000); // Wait 2s to avoid competing with critical queries

    return () => clearTimeout(prefetchTimer);
  }, [client]);
}