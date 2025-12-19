// src/hooks/useMaestroRun.ts

import { useCallback, useRef, useState } from 'react';
import { runMaestroRequest } from '@/lib/api/maestro';
import type { MaestroRunResponse } from '@/types/maestro';

interface UseMaestroRunState {
  isRunning: boolean;
  error: string | null;
  data: MaestroRunResponse | null;
}

export function useMaestroRun(initialUserId: string): {
  state: UseMaestroRunState;
  run: (requestText: string) => Promise<void>;
  reset: () => void;
} {
  const [state, setState] = useState<UseMaestroRunState>({
    isRunning: false,
    error: null,
    data: null,
  });

  const userIdRef = useRef(initialUserId);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async (requestText: string) => {
    if (!requestText.trim()) return;

    // Abort any previous run
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setState(prev => ({
      ...prev,
      isRunning: true,
      error: null,
    }));

    try {
      const data = await runMaestroRequest({
        userId: userIdRef.current,
        requestText,
        signal: controller.signal,
      });

      setState({
        isRunning: false,
        error: null,
        data,
      });
    } catch (err: any) {
      if (controller.signal.aborted) {
        return;
      }
      setState(prev => ({
        ...prev,
        isRunning: false,
        error:
          err?.message ?? 'Unknown error while running Maestro pipeline.',
      }));
    }
  }, []);

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setState({
      isRunning: false,
      error: null,
      data: null,
    });
  }, []);

  return { state, run, reset };
}
