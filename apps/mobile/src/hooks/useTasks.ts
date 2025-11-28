/**
 * Tasks Hook
 * Provides task data with offline support
 */
import { useState, useEffect, useCallback } from 'react';
import type { Task, TaskStatus } from '@/types';
import { offlineCache } from '@/lib/offlineCache';
import { syncEngine } from '@/lib/syncEngine';
import { useNetwork } from '@/contexts/NetworkContext';
import { useAuth } from '@/contexts/AuthContext';

interface UseTasksResult {
  tasks: Task[];
  pendingCount: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateStatus: (id: string, status: TaskStatus) => Promise<void>;
  getByCase: (caseId: string) => Task[];
}

export function useTasks(): UseTasksResult {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isOnline } = useNetwork();
  const { accessToken } = useAuth();

  // Load tasks from cache
  const loadFromCache = useCallback(async () => {
    try {
      const cached = await offlineCache.tasks.getPending();
      setTasks(cached.sort((a, b) => {
        // Sort by priority first, then due date
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const aPriority = priorityOrder[a.priority] ?? 4;
        const bPriority = priorityOrder[b.priority] ?? 4;

        if (aPriority !== bPriority) return aPriority - bPriority;

        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        return 0;
      }));
    } catch (err) {
      console.error('Failed to load tasks from cache:', err);
    }
  }, []);

  // Fetch tasks from server
  const fetchFromServer = useCallback(async () => {
    if (!isOnline || !accessToken) return;

    try {
      const response = await fetch('/api/mobile/tasks', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }

      const data = await response.json();
      await offlineCache.tasks.setMany(data);
      setTasks(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
      await loadFromCache();
    }
  }, [isOnline, accessToken, loadFromCache]);

  // Refresh tasks
  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isOnline) {
        await fetchFromServer();
      } else {
        await loadFromCache();
      }
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, fetchFromServer, loadFromCache]);

  // Update task status
  const updateStatus = useCallback(async (id: string, status: TaskStatus) => {
    const now = new Date().toISOString();

    // Optimistic update
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? {
              ...task,
              status,
              completedAt: status === 'completed' ? now : undefined,
            }
          : task
      )
    );

    // Get current task and update cache
    const task = tasks.find((t) => t.id === id);
    if (task) {
      const updatedTask = {
        ...task,
        status,
        completedAt: status === 'completed' ? now : undefined,
      };
      await offlineCache.tasks.set(updatedTask);

      // Queue for sync
      await syncEngine.queueForSync('update', 'acknowledgement', {
        taskId: id,
        status,
        timestamp: now,
      });
    }
  }, [tasks]);

  // Get tasks by case
  const getByCase = useCallback(
    (caseId: string): Task[] => {
      return tasks.filter((t) => t.caseId === caseId);
    },
    [tasks]
  );

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Pending count
  const pendingCount = tasks.filter(
    (t) => t.status === 'pending' || t.status === 'in_progress'
  ).length;

  return {
    tasks,
    pendingCount,
    isLoading,
    error,
    refresh,
    updateStatus,
    getByCase,
  };
}
