import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  COMPLETE_TUTORIAL,
  GET_TUTORIAL_CHECKLIST,
  RESET_TUTORIAL,
} from '../graphql/tutorials.gql.js';
import { DEFAULT_TUTORIAL_IDS, TUTORIAL_CONFIG, TutorialId } from '../tutorials/constants';

export interface TutorialProgressState {
  tutorialId: string;
  completed: boolean;
  completedAt: string | null;
}

interface TutorialStartRequest {
  tutorialId: TutorialId;
  options?: Record<string, unknown>;
  requestedAt: number;
}

interface TutorialContextValue {
  loading: boolean;
  progress: Record<string, TutorialProgressState>;
  requestTutorialStart: (tutorialId: TutorialId, options?: Record<string, unknown>) => void;
  pendingRequest: TutorialStartRequest | null;
  clearPendingRequest: () => void;
  markTutorialComplete: (tutorialId: TutorialId) => Promise<void>;
  resetTutorial: (tutorialId: TutorialId) => Promise<void>;
  isMutating: boolean;
}

const TutorialContext = createContext<TutorialContextValue | undefined>(undefined);

export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data, loading, refetch } = useQuery(GET_TUTORIAL_CHECKLIST);
  const [completeMutation, { loading: completing }] = useMutation(COMPLETE_TUTORIAL);
  const [resetMutation, { loading: resetting }] = useMutation(RESET_TUTORIAL);
  const [pendingRequest, setPendingRequest] = useState<TutorialStartRequest | null>(null);

  const progress = useMemo(() => {
    const base: Record<string, TutorialProgressState> = {};
    DEFAULT_TUTORIAL_IDS.forEach((id) => {
      base[id] = {
        tutorialId: id,
        completed: false,
        completedAt: null,
      };
    });

    if (data?.tutorialChecklist) {
      for (const entry of data.tutorialChecklist) {
        if (!entry?.tutorialId) continue;
        base[entry.tutorialId] = {
          tutorialId: entry.tutorialId,
          completed: Boolean(entry.completed),
          completedAt: entry.completedAt ?? null,
        };
      }
    }

    return base;
  }, [data]);

  const requestTutorialStart = useCallback(
    (tutorialId: TutorialId, options?: Record<string, unknown>) => {
      if (!TUTORIAL_CONFIG[tutorialId]) {
        return;
      }
      setPendingRequest({ tutorialId, options, requestedAt: Date.now() });
    },
    []
  );

  const clearPendingRequest = useCallback(() => setPendingRequest(null), []);

  const markTutorialComplete = useCallback(
    async (tutorialId: TutorialId) => {
      await completeMutation({ variables: { tutorialId } });
      await refetch();
    },
    [completeMutation, refetch]
  );

  const resetTutorial = useCallback(
    async (tutorialId: TutorialId) => {
      await resetMutation({ variables: { tutorialId } });
      await refetch();
    },
    [resetMutation, refetch]
  );

  const value = useMemo<TutorialContextValue>(
    () => ({
      loading,
      progress,
      requestTutorialStart,
      pendingRequest,
      clearPendingRequest,
      markTutorialComplete,
      resetTutorial,
      isMutating: completing || resetting,
    }),
    [
      loading,
      progress,
      requestTutorialStart,
      pendingRequest,
      clearPendingRequest,
      markTutorialComplete,
      resetTutorial,
      completing,
      resetting,
    ]
  );

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
};

export const useTutorials = (): TutorialContextValue => {
  const ctx = useContext(TutorialContext);
  if (!ctx) {
    throw new Error('useTutorials must be used within a TutorialProvider');
  }
  return ctx;
};
