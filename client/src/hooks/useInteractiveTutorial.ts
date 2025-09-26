import { useCallback, useEffect, useMemo, useRef } from 'react';
import introJs, { type Step, type IntroJsOptions } from 'intro.js';
import { useTutorials } from '../context/TutorialContext';
import type { TutorialId } from '../tutorials/constants';

interface UseInteractiveTutorialConfig {
  tutorialId: TutorialId;
  steps: Step[];
  options?: Partial<IntroJsOptions>;
  startWhen?: boolean;
}

export const useInteractiveTutorial = ({
  tutorialId,
  steps,
  options,
  startWhen = true,
}: UseInteractiveTutorialConfig) => {
  const {
    loading,
    progress,
    pendingRequest,
    clearPendingRequest,
    markTutorialComplete,
    resetTutorial,
  } = useTutorials();
  const tutorialProgress = useMemo(
    () => progress[tutorialId] ?? { tutorialId, completed: false, completedAt: null },
    [progress, tutorialId]
  );
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (!startWhen) {
      hasStartedRef.current = false;
    }
  }, [startWhen]);

  const startTutorial = useCallback(() => {
    if (!startWhen) return;
    const instance = introJs();
    instance.setOptions({
      steps,
      showStepNumbers: false,
      exitOnOverlayClick: false,
      nextLabel: 'Next',
      prevLabel: 'Back',
      doneLabel: 'Finish',
      tooltipClass: 'intelgraph-tutorial-tooltip',
      ...(options ?? {}),
    });
    instance.oncomplete(async () => {
      hasStartedRef.current = false;
      await markTutorialComplete(tutorialId);
      clearPendingRequest();
    });
    instance.onexit(() => {
      hasStartedRef.current = false;
      clearPendingRequest();
    });
    instance.start();
    hasStartedRef.current = true;
    if (pendingRequest?.tutorialId === tutorialId) {
      clearPendingRequest();
    }
  }, [
    startWhen,
    steps,
    options,
    markTutorialComplete,
    tutorialId,
    clearPendingRequest,
    pendingRequest,
  ]);

  const startIfNeeded = useCallback(() => {
    if (!startWhen || loading || hasStartedRef.current) return;
    if (tutorialProgress.completed) return;
    startTutorial();
  }, [startWhen, loading, tutorialProgress.completed, startTutorial]);

  useEffect(() => {
    if (!pendingRequest || pendingRequest.tutorialId !== tutorialId) {
      return;
    }
    if (!startWhen) {
      return;
    }
    startTutorial();
  }, [pendingRequest, tutorialId, startWhen, startTutorial]);

  const resetAndRefresh = useCallback(async () => {
    hasStartedRef.current = false;
    await resetTutorial(tutorialId);
  }, [resetTutorial, tutorialId]);

  return {
    loading,
    progress: tutorialProgress,
    startTutorial,
    startIfNeeded,
    resetTutorial: resetAndRefresh,
  };
};
