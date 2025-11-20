/**
 * useCopilot Hook
 *
 * Custom React hook for managing AI Copilot state and operations.
 * Provides a clean interface for query preview, execution, and history.
 */

import { useState, useCallback, useEffect } from 'react';
import { useLazyQuery, useMutation } from '@apollo/client';
import {
  PREVIEW_NL_QUERY,
  EXECUTE_NL_QUERY,
  GENERATE_HYPOTHESES,
  GENERATE_NARRATIVE,
  GET_COPILOT_SUGGESTIONS,
} from '../graphql/copilot.operations';
import type {
  CopilotState,
  UseCopilotReturn,
  QueryHistoryEntry,
  SavedQuery,
  QueryTemplate,
  HypothesisInput,
  NarrativeInput,
} from '../types/copilot';

const STORAGE_KEY = 'copilot_query_history';
const SAVED_QUERIES_KEY = 'copilot_saved_queries';

interface UseCopilotOptions {
  investigationId: string;
  userId?: string;
  onQueryExecuted?: (result: any) => void;
  onError?: (error: Error) => void;
  maxHistorySize?: number;
}

export function useCopilot({
  investigationId,
  userId,
  onQueryExecuted,
  onError,
  maxHistorySize = 50,
}: UseCopilotOptions): UseCopilotReturn {
  // ========================================================================
  // State
  // ========================================================================

  const [state, setState] = useState<CopilotState>({
    currentQuery: '',
    preview: null,
    results: null,
    isPreviewing: false,
    isExecuting: false,
    isGeneratingHypotheses: false,
    isGeneratingNarrative: false,
    activeTab: 'query',
    hypotheses: [],
    narrative: null,
    queryHistory: [],
    savedQueries: [],
    showCypher: false,
    selectedTemplate: null,
  });

  // ========================================================================
  // GraphQL Operations
  // ========================================================================

  const [previewQueryGQL, { loading: previewLoading }] = useLazyQuery(
    PREVIEW_NL_QUERY,
    {
      onCompleted: (data) => {
        setState((prev) => ({
          ...prev,
          preview: data.previewNLQuery,
          isPreviewing: false,
        }));
      },
      onError: (error) => {
        setState((prev) => ({ ...prev, isPreviewing: false }));
        onError?.(error);
      },
    }
  );

  const [executeQueryGQL, { loading: executeLoading }] = useMutation(
    EXECUTE_NL_QUERY,
    {
      onCompleted: (data) => {
        const result = data.executeNLQuery;

        setState((prev) => ({
          ...prev,
          results: result,
          isExecuting: false,
        }));

        // Add to history
        addToHistory({
          id: crypto.randomUUID(),
          query: state.currentQuery,
          cypher: state.preview?.cypher || '',
          timestamp: new Date().toISOString(),
          recordCount: result.summary.recordCount,
          executionTime: result.summary.executionTime,
          success: true,
          auditId: result.auditId,
        });

        onQueryExecuted?.(result);
      },
      onError: (error) => {
        setState((prev) => ({ ...prev, isExecuting: false }));

        // Add failed query to history
        addToHistory({
          id: crypto.randomUUID(),
          query: state.currentQuery,
          cypher: state.preview?.cypher || '',
          timestamp: new Date().toISOString(),
          recordCount: 0,
          executionTime: 0,
          success: false,
        });

        onError?.(error);
      },
    }
  );

  const [generateHypothesesGQL, { loading: hypothesesLoading }] = useLazyQuery(
    GENERATE_HYPOTHESES,
    {
      onCompleted: (data) => {
        setState((prev) => ({
          ...prev,
          hypotheses: data.generateHypotheses,
          isGeneratingHypotheses: false,
        }));
      },
      onError: (error) => {
        setState((prev) => ({ ...prev, isGeneratingHypotheses: false }));
        onError?.(error);
      },
    }
  );

  const [generateNarrativeGQL, { loading: narrativeLoading }] = useLazyQuery(
    GENERATE_NARRATIVE,
    {
      onCompleted: (data) => {
        setState((prev) => ({
          ...prev,
          narrative: data.generateNarrative,
          isGeneratingNarrative: false,
        }));
      },
      onError: (error) => {
        setState((prev) => ({ ...prev, isGeneratingNarrative: false }));
        onError?.(error);
      },
    }
  );

  const [getSuggestionsGQL] = useLazyQuery(GET_COPILOT_SUGGESTIONS);

  // ========================================================================
  // Local Storage Management
  // ========================================================================

  useEffect(() => {
    // Load history from localStorage
    try {
      const storedHistory = localStorage.getItem(STORAGE_KEY);
      const storedSavedQueries = localStorage.getItem(SAVED_QUERIES_KEY);

      if (storedHistory) {
        const history: QueryHistoryEntry[] = JSON.parse(storedHistory);
        setState((prev) => ({ ...prev, queryHistory: history }));
      }

      if (storedSavedQueries) {
        const saved: SavedQuery[] = JSON.parse(storedSavedQueries);
        setState((prev) => ({ ...prev, savedQueries: saved }));
      }
    } catch (error) {
      console.error('Failed to load copilot data from localStorage', error);
    }
  }, []);

  const addToHistory = useCallback(
    (entry: QueryHistoryEntry) => {
      setState((prev) => {
        const newHistory = [entry, ...prev.queryHistory].slice(
          0,
          maxHistorySize
        );

        // Persist to localStorage
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
        } catch (error) {
          console.error('Failed to save history to localStorage', error);
        }

        return { ...prev, queryHistory: newHistory };
      });
    },
    [maxHistorySize]
  );

  // ========================================================================
  // Actions
  // ========================================================================

  const previewQuery = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        return;
      }

      setState((prev) => ({
        ...prev,
        currentQuery: query,
        isPreviewing: true,
        preview: null,
        results: null,
      }));

      await previewQueryGQL({
        variables: {
          input: {
            query: query.trim(),
            investigationId,
            userId,
            dryRun: true,
          },
        },
      });
    },
    [investigationId, userId, previewQueryGQL]
  );

  const executeQuery = useCallback(async () => {
    if (!state.preview || !state.preview.allowed) {
      throw new Error('Cannot execute query: preview not allowed');
    }

    setState((prev) => ({ ...prev, isExecuting: true }));

    await executeQueryGQL({
      variables: {
        input: {
          query: state.currentQuery,
          investigationId,
          userId,
          dryRun: false,
        },
      },
    });
  }, [state.preview, state.currentQuery, investigationId, userId, executeQueryGQL]);

  const generateHypotheses = useCallback(
    async (input?: Partial<HypothesisInput>) => {
      setState((prev) => ({ ...prev, isGeneratingHypotheses: true }));

      await generateHypothesesGQL({
        variables: {
          input: {
            investigationId,
            count: 3,
            ...input,
          },
        },
      });
    },
    [investigationId, generateHypothesesGQL]
  );

  const generateNarrative = useCallback(
    async (input?: Partial<NarrativeInput>) => {
      setState((prev) => ({ ...prev, isGeneratingNarrative: true }));

      await generateNarrativeGQL({
        variables: {
          input: {
            investigationId,
            style: 'ANALYTICAL',
            ...input,
          },
        },
      });
    },
    [investigationId, generateNarrativeGQL]
  );

  const saveQuery = useCallback(
    async (name: string, description?: string) => {
      if (!state.currentQuery || !state.preview) {
        throw new Error('No query to save');
      }

      const savedQuery: SavedQuery = {
        id: crypto.randomUUID(),
        name,
        description,
        query: state.currentQuery,
        category: 'user',
        createdBy: userId || 'unknown',
        createdAt: new Date().toISOString(),
        usageCount: 0,
      };

      setState((prev) => {
        const newSavedQueries = [...prev.savedQueries, savedQuery];

        // Persist to localStorage
        try {
          localStorage.setItem(
            SAVED_QUERIES_KEY,
            JSON.stringify(newSavedQueries)
          );
        } catch (error) {
          console.error('Failed to save query to localStorage', error);
        }

        return { ...prev, savedQueries: newSavedQueries };
      });
    },
    [state.currentQuery, state.preview, userId]
  );

  const loadQuery = useCallback((queryId: string) => {
    setState((prev) => {
      const query = prev.savedQueries.find((q) => q.id === queryId);
      if (!query) {
        return prev;
      }

      return {
        ...prev,
        currentQuery: query.query,
        preview: null,
        results: null,
      };
    });
  }, []);

  const clearHistory = useCallback(() => {
    setState((prev) => ({ ...prev, queryHistory: [] }));

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear history from localStorage', error);
    }
  }, []);

  const setQuery = useCallback((query: string) => {
    setState((prev) => ({ ...prev, currentQuery: query }));
  }, []);

  const setActiveTab = useCallback((tab: CopilotState['activeTab']) => {
    setState((prev) => ({ ...prev, activeTab: tab }));
  }, []);

  const toggleCypherView = useCallback(() => {
    setState((prev) => ({ ...prev, showCypher: !prev.showCypher }));
  }, []);

  const applyTemplate = useCallback(
    (template: QueryTemplate, variables?: Record<string, any>) => {
      let query = template.template;

      // Replace variables in template
      if (variables) {
        Object.entries(variables).forEach(([key, value]) => {
          query = query.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
        });
      }

      setState((prev) => ({
        ...prev,
        currentQuery: query,
        selectedTemplate: template,
        preview: null,
        results: null,
      }));
    },
    []
  );

  const reset = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentQuery: '',
      preview: null,
      results: null,
      showCypher: false,
      selectedTemplate: null,
    }));
  }, []);

  // ========================================================================
  // Sync loading states
  // ========================================================================

  useEffect(() => {
    setState((prev) => ({
      ...prev,
      isPreviewing: previewLoading,
      isExecuting: executeLoading,
      isGeneratingHypotheses: hypothesesLoading,
      isGeneratingNarrative: narrativeLoading,
    }));
  }, [previewLoading, executeLoading, hypothesesLoading, narrativeLoading]);

  // ========================================================================
  // Return Hook Interface
  // ========================================================================

  return {
    state,
    previewQuery,
    executeQuery,
    generateHypotheses,
    generateNarrative,
    saveQuery,
    loadQuery,
    clearHistory,
    setQuery,
    setActiveTab,
    toggleCypherView,
    applyTemplate,
    reset,
  };
}

export default useCopilot;
