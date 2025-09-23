import { useCallback, useRef } from 'react';

export interface OptimisticState<T> {
  version: number;
  data: T;
  isOptimistic: boolean;
}

/**
 * Basic optimistic update with rollback on error
 */
export function withOptimism<T>(
  update: () => void,
  rollback: () => void,
  run: () => Promise<T>
): Promise<T> {
  try {
    update();
  } catch (e) {
    console.warn('Optimistic update failed:', e);
  }

  return run().catch(e => {
    try {
      rollback();
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }
    throw e;
  });
}

/**
 * Hook for managing optimistic state with conflict detection
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

  const commitOptimistic = useCallback((serverData: T, serverVersion: number) => {
    const current = stateRef.current;
    
    // Conflict detection: server version advanced more than expected
    const hasConflict = current.isOptimistic && serverVersion > current.version + 1;
    
    stateRef.current = {
      version: serverVersion,
      data: serverData,
      isOptimistic: false,
    };

    return { hasConflict, data: serverData };
  }, []);

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

export function createOptimisticComment(
  content: string,
  currentUser: { id: string; displayName: string }
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

export function createOptimisticEvidence(
  name: string,
  type: string,
  uploadedBy: string
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