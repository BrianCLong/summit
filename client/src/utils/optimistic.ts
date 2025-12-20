import { useCallback, useRef } from 'react';

/**
 * Interface representing the optimistic state.
 */
export interface OptimisticState<T> {
  version: number;
  data: T;
  isOptimistic: boolean;
}

/**
 * Basic optimistic update with rollback on error.
 * Executes an update function immediately, then runs an async operation.
 * If the async operation fails, the rollback function is called.
 *
 * @param update - The synchronous optimistic update function.
 * @param rollback - The function to rollback changes on failure.
 * @param run - The async operation (e.g., API call).
 * @returns A promise resolving to the result of the async operation.
 */
export function withOptimism<T>(
  update: () => void,
  rollback: () => void,
  run: () => Promise<T>,
): Promise<T> {
  try {
    update();
  } catch (e) {
    console.warn('Optimistic update failed:', e);
  }

  return run().catch((e) => {
    try {
      rollback();
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }
    throw e;
  });
}

/**
 * Hook for managing optimistic state with conflict detection.
 *
 * @param initialData - The initial data state.
 * @param serverVersion - The initial server version (optional).
 * @returns An object containing the current state and methods to update, commit, or rollback.
 */
export function useOptimisticState<T>(initialData: T, serverVersion?: number) {
  const stateRef = useRef<OptimisticState<T>>({
    version: serverVersion || 0,
    data: initialData,
    isOptimistic: false,
  });

  const updateOptimistic = useCallback((updater: (current: T) => T) => {
    stateRef.current = {
      ...stateRef.current,
      data: updater(stateRef.current.data),
      isOptimistic: true,
    };
  }, []);

  const commitOptimistic = useCallback(
    (serverData: T, serverVersion: number) => {
      const current = stateRef.current;

      // Conflict detection: server version advanced more than expected
      const hasConflict =
        current.isOptimistic && serverVersion > current.version + 1;

      stateRef.current = {
        version: serverVersion,
        data: serverData,
        isOptimistic: false,
      };

      return { hasConflict, data: serverData };
    },
    [],
  );

  const rollbackOptimistic = useCallback(() => {
    if (stateRef.current.isOptimistic) {
      stateRef.current = {
        ...stateRef.current,
        isOptimistic: false,
      };
    }
  }, []);

  return {
    state: stateRef.current,
    updateOptimistic,
    commitOptimistic,
    rollbackOptimistic,
  };
}

/**
 * Optimistic comment operations
 */
export interface OptimisticComment {
  id: string;
  content: string;
  author: {
    id: string;
    displayName: string;
  };
  timestamp: string;
  tempId?: string;
  isOptimistic?: boolean;
}

/**
 * Creates an optimistic comment object.
 *
 * @param content - The comment content.
 * @param currentUser - The user creating the comment.
 * @returns An OptimisticComment object with a temporary ID.
 */
export function createOptimisticComment(
  content: string,
  currentUser: { id: string; displayName: string },
): OptimisticComment {
  return {
    id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    content,
    author: currentUser,
    timestamp: new Date().toISOString(),
    tempId: `temp-${Date.now()}`,
    isOptimistic: true,
  };
}

/**
 * Optimistic evidence operations
 */
export interface OptimisticEvidence {
  id: string;
  name: string;
  type: string;
  uploadedBy: string;
  uploadedAt: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  isOptimistic?: boolean;
}

/**
 * Creates an optimistic evidence object.
 *
 * @param name - The name of the evidence file.
 * @param type - The MIME type of the file.
 * @param uploadedBy - The ID of the user uploading the evidence.
 * @returns An OptimisticEvidence object with 'uploading' status.
 */
export function createOptimisticEvidence(
  name: string,
  type: string,
  uploadedBy: string,
): OptimisticEvidence {
  return {
    id: `temp-evidence-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name,
    type,
    uploadedBy,
    uploadedAt: new Date().toISOString(),
    status: 'uploading',
    isOptimistic: true,
  };
}
