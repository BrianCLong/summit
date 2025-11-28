/**
 * Cases Hook
 * Provides case data with offline support
 */
import { useState, useEffect, useCallback } from 'react';
import type { Case } from '@/types';
import { offlineCache } from '@/lib/offlineCache';
import { useNetwork } from '@/contexts/NetworkContext';
import { useAuth } from '@/contexts/AuthContext';

interface UseCasesResult {
  cases: Case[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getCase: (id: string) => Promise<Case | null>;
}

export function useCases(): UseCasesResult {
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isOnline } = useNetwork();
  const { accessToken } = useAuth();

  // Load cases from cache
  const loadFromCache = useCallback(async () => {
    try {
      const cached = await offlineCache.cases.getAll();
      setCases(cached.sort((a, b) =>
        new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      ));
    } catch (err) {
      console.error('Failed to load cases from cache:', err);
    }
  }, []);

  // Fetch cases from server
  const fetchFromServer = useCallback(async () => {
    if (!isOnline || !accessToken) return;

    try {
      const response = await fetch('/api/mobile/cases/assigned', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch cases');
      }

      const data = await response.json();
      await offlineCache.cases.setMany(data);
      setCases(data.sort((a: Case, b: Case) =>
        new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      ));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cases');
      await loadFromCache();
    }
  }, [isOnline, accessToken, loadFromCache]);

  // Refresh cases
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

  // Get single case
  const getCase = useCallback(async (id: string): Promise<Case | null> => {
    // Check cache first
    let caseData = await offlineCache.cases.get(id);

    // If online, fetch fresh data
    if (isOnline && accessToken) {
      try {
        const response = await fetch(`/api/mobile/cases/${id}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          caseData = await response.json();
          await offlineCache.cases.set(caseData);
        }
      } catch {
        // Use cached data
      }
    }

    return caseData;
  }, [isOnline, accessToken]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    cases,
    isLoading,
    error,
    refresh,
    getCase,
  };
}
