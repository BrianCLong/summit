/**
 * Intelligence OS — shared hooks
 */
import { useCallback, useMemo, useState } from 'react';
import type {
  CopilotContext,
  EntityId,
  InvestigationMemory,
  SearchDomain,
  SearchFilters,
  SearchResult,
  TimeRange,
} from '@/types/intelligence-os';

// ---------------------------------------------------------------------------
// useInvestigationMemory — manage memory state for a single investigation
// ---------------------------------------------------------------------------

const EMPTY_MEMORY: InvestigationMemory = {
  investigationId: '',
  title: '',
  status: 'active',
  entities: [],
  events: [],
  hypotheses: [],
  evidence: [],
  analystNotes: [],
  agentFindings: [],
  timeline: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function useInvestigationMemory(initial?: Partial<InvestigationMemory>) {
  const [memory, setMemory] = useState<InvestigationMemory>({
    ...EMPTY_MEMORY,
    ...initial,
  });

  const addTimelineEntry = useCallback(
    (type: InvestigationMemory['timeline'][number]['type'], refId: string, summary: string) => {
      setMemory((prev) => ({
        ...prev,
        updatedAt: new Date().toISOString(),
        timeline: [
          ...prev.timeline,
          {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            type,
            refId,
            summary,
          },
        ],
      }));
    },
    [],
  );

  return { memory, setMemory, addTimelineEntry } as const;
}

// ---------------------------------------------------------------------------
// useCopilotContext — track copilot awareness of the current UI state
// ---------------------------------------------------------------------------

export function useCopilotContext() {
  const [ctx, setCtx] = useState<CopilotContext>({
    selectedEntityIds: [],
    visibleEntityIds: [],
    currentView: 'default',
  });

  const selectEntities = useCallback((ids: EntityId[]) => {
    setCtx((prev) => ({ ...prev, selectedEntityIds: ids }));
  }, []);

  const setView = useCallback((view: string) => {
    setCtx((prev) => ({ ...prev, currentView: view }));
  }, []);

  const setTimeRange = useCallback((range: TimeRange | undefined) => {
    setCtx((prev) => ({ ...prev, activeTimeRange: range }));
  }, []);

  return { ctx, setCtx, selectEntities, setView, setTimeRange } as const;
}

// ---------------------------------------------------------------------------
// useIntelSearch — lightweight client-side search state
// ---------------------------------------------------------------------------

export function useIntelSearch() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const activeDomain = useMemo<SearchDomain>(() => filters.domain ?? 'all', [filters.domain]);

  const search = useCallback(
    async (q: string, f?: SearchFilters) => {
      setQuery(q);
      if (f) setFilters(f);
      setIsSearching(true);
      // Placeholder: wire to GraphQL / REST endpoint
      setIsSearching(false);
    },
    [],
  );

  const clearSearch = useCallback(() => {
    setQuery('');
    setFilters({});
    setResults([]);
  }, []);

  return { query, filters, results, isSearching, activeDomain, search, clearSearch, setResults } as const;
}
