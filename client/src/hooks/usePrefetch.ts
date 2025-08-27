import { useEffect } from 'react';
// import { useApolloClient } from '@apollo/client';
// TODO: Re-enable when GraphQL schema is available
// import { 
//   useDB_ServerStatsQuery,
//   useDB_InvestigationsQuery,
//   DB_ServerStatsDocument,
//   DB_InvestigationsDocument
// } from '../generated/graphql.js';

/**
 * Hook to prefetch critical dashboard data on route enter
 * Eliminates "panel pop-in" by warming the cache
 */
export function useDashboardPrefetch() {
  // TODO: Re-enable when GraphQL schema is available
  // const client = useApolloClient();

  useEffect(() => {
    // Placeholder - no prefetching until GraphQL is available
    console.log('🚀 Dashboard prefetch: GraphQL schema not available');
  }, []);
}

/**
 * Hook to prefetch graph workbench data for a specific investigation
 */
export function useGraphWorkbenchPrefetch(investigationId?: string) {
  // TODO: Re-enable when GraphQL schema is available
  // const client = useApolloClient();

  useEffect(() => {
    if (!investigationId) return;
    // Placeholder - no prefetching until GraphQL is available
    console.log('🚀 GraphWorkbench prefetch: GraphQL schema not available');
  }, [investigationId]);
}

/**
 * Hook for intelligent cache warming based on user behavior
 */
export function useIntelligentPrefetch() {
  // TODO: Re-enable when GraphQL schema is available
  // const client = useApolloClient();

  useEffect(() => {
    // Placeholder - no prefetching until GraphQL is available
    console.log('🚀 Intelligent prefetch: GraphQL schema not available');
  }, []);
}