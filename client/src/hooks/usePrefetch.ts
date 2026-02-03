import { useEffect } from 'react';
import { useApolloClient } from '@apollo/client';
import {
  DB_ServerStatsDocument,
  DB_InvestigationsDocument,
  GW_GraphDataDocument,
} from '../generated/graphql.ts';

/**
 * Hook to prefetch critical dashboard data on route enter
 * Eliminates "panel pop-in" by warming the cache
 */
export function useDashboardPrefetch() {
  const client = useApolloClient();

  useEffect(() => {
    void client
      .query({ query: DB_ServerStatsDocument, fetchPolicy: 'cache-first' })
      .catch((error) => {
        console.warn('Dashboard prefetch failed: server stats', error);
      });
    void client
      .query({ query: DB_InvestigationsDocument, fetchPolicy: 'cache-first' })
      .catch((error) => {
        console.warn('Dashboard prefetch failed: investigations', error);
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
    void client
      .query({
        query: GW_GraphDataDocument,
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
export function useIntelligentPrefetch() {
  const client = useApolloClient();

  useEffect(() => {
    let cancelled = false;
    const schedule = () => {
      if (cancelled) return;
      void client
        .query({ query: DB_InvestigationsDocument, fetchPolicy: 'cache-first' })
        .catch((error) => {
          console.warn('Intelligent prefetch failed', error);
        });
    };

    if (typeof window !== 'undefined') {
      const requestIdleCallback = (window as any)
        .requestIdleCallback as ((cb: () => void, opts?: { timeout?: number }) => number) | undefined;
      const cancelIdleCallback = (window as any)
        .cancelIdleCallback as ((id: number) => void) | undefined;
      if (requestIdleCallback) {
        const id = requestIdleCallback(schedule, { timeout: 2000 });
        return () => {
          cancelled = true;
          if (cancelIdleCallback) cancelIdleCallback(id);
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
