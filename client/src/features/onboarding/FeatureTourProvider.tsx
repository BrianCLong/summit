import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useMutation, useQuery } from '@apollo/client';
import {
  FEATURE_TOUR_PROGRESS,
  RECORD_FEATURE_TOUR_PROGRESS,
} from '../../graphql/onboarding.gql.js';
import { useAuth } from '../../context/AuthContext.jsx';

type TourKey = string;

type TourProgressState = {
  completed: boolean;
  lastStep: number | null;
  completedAt: string | null;
};

interface FeatureTourContextValue {
  startTour: (tourKey: TourKey, steps: Step[]) => void;
  resetTour: (tourKey: TourKey) => void;
  progress: Record<TourKey, TourProgressState>;
  isRunning: boolean;
  activeTourKey: TourKey | null;
}

interface JoyrideState {
  running: boolean;
  steps: Step[];
  tourKey: TourKey | null;
}

const FeatureTourContext = createContext<FeatureTourContextValue | undefined>(undefined);

const DEFAULT_PROGRESS: TourProgressState = {
  completed: false,
  lastStep: null,
  completedAt: null,
};

export function FeatureTourProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const canPersist = Boolean(user?.id);
  const [tourState, setTourState] = useState<JoyrideState>({ running: false, steps: [], tourKey: null });
  const [progressMap, setProgressMap] = useState<Record<TourKey, TourProgressState>>({});

  const { data } = useQuery(FEATURE_TOUR_PROGRESS, {
    skip: authLoading || !canPersist,
    fetchPolicy: 'cache-first',
  });

  const [recordProgress] = useMutation(RECORD_FEATURE_TOUR_PROGRESS);

  useEffect(() => {
    if (!data?.featureTourProgresses) return;

    setProgressMap((prev) => {
      const next = { ...prev };
      for (const item of data.featureTourProgresses) {
        next[item.tourKey] = {
          completed: Boolean(item.completed),
          lastStep: typeof item.lastStep === 'number' ? item.lastStep : null,
          completedAt: item.completedAt ?? null,
        };
      }
      return next;
    });
  }, [data]);

  const persistProgress = useCallback(
    (tourKey: TourKey, completed: boolean, lastStep: number | null) => {
      if (!canPersist) return;

      const timestamp = completed ? new Date().toISOString() : null;

      void recordProgress({
        variables: {
          input: {
            tourKey,
            completed,
            lastStep,
          },
        },
        optimisticResponse: {
          recordFeatureTourProgress: {
            __typename: 'FeatureTourProgress',
            id: `feature-tour-${tourKey}`,
            tourKey,
            completed,
            completedAt: timestamp,
            lastStep,
          },
        },
      }).catch((error) => {
        if (import.meta.env.DEV) {
          console.warn('Failed to persist feature tour progress', error);
        }
      });
    },
    [recordProgress, canPersist],
  );

  const startTour = useCallback(
    (tourKey: TourKey, steps: Step[]) => {
      if (!steps?.length) return;

      setTourState({ running: true, steps, tourKey });
      setProgressMap((prev) => ({
        ...prev,
        [tourKey]: { ...DEFAULT_PROGRESS },
      }));
      persistProgress(tourKey, false, null);
    },
    [persistProgress],
  );

  const resetTour = useCallback(
    (tourKey: TourKey) => {
      setProgressMap((prev) => ({
        ...prev,
        [tourKey]: { ...DEFAULT_PROGRESS },
      }));
      persistProgress(tourKey, false, null);
    },
    [persistProgress],
  );

  const handleJoyrideCallback = useCallback(
    (callbackData: CallBackProps) => {
      const { status, index, type } = callbackData;
      const activeKey = tourState.tourKey;
      if (!activeKey) return;

      if (type === 'step:after' || type === 'target:notFound') {
        setProgressMap((prev) => ({
          ...prev,
          [activeKey]: {
            completed: false,
            lastStep: index,
            completedAt: null,
          },
        }));
        persistProgress(activeKey, false, index);
      }

      if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
        const completed = status === STATUS.FINISHED;
        const completedAt = completed ? new Date().toISOString() : null;

        setTourState({ running: false, steps: [], tourKey: null });
        setProgressMap((prev) => ({
          ...prev,
          [activeKey]: {
            completed,
            lastStep: index,
            completedAt,
          },
        }));
        persistProgress(activeKey, completed, index);
      }
    },
    [tourState.tourKey, persistProgress],
  );

  const contextValue = useMemo<FeatureTourContextValue>(
    () => ({
      startTour,
      resetTour,
      progress: progressMap,
      isRunning: tourState.running,
      activeTourKey: tourState.tourKey,
    }),
    [startTour, resetTour, progressMap, tourState.running, tourState.tourKey],
  );

  return (
    <FeatureTourContext.Provider value={contextValue}>
      {children}
      <Joyride
        callback={handleJoyrideCallback}
        continuous
        disableScrolling
        run={tourState.running}
        scrollToFirstStep
        showSkipButton
        showProgress
        steps={tourState.steps}
        styles={{
          options: {
            zIndex: 2000,
          },
          tooltipContent: {
            fontSize: '0.95rem',
            lineHeight: 1.5,
          },
        }}
        locale={{
          back: 'Back',
          close: 'Close',
          last: 'Done',
          next: 'Next',
          skip: 'Skip tour',
        }}
      />
    </FeatureTourContext.Provider>
  );
}

export function useFeatureTour(): FeatureTourContextValue {
  const context = useContext(FeatureTourContext);
  if (!context) {
    throw new Error('useFeatureTour must be used within a FeatureTourProvider');
  }
  return context;
}
