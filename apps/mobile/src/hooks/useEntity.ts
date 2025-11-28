/**
 * Entities Hook
 * Provides entity data with offline support
 */
import { useState, useCallback } from 'react';
import type { Entity } from '@/types';
import { offlineCache } from '@/lib/offlineCache';
import { useNetwork } from '@/contexts/NetworkContext';
import { useAuth } from '@/contexts/AuthContext';

interface UseEntityResult {
  entity: Entity | null;
  isLoading: boolean;
  error: string | null;
  fetchEntity: (id: string) => Promise<void>;
}

export function useEntity(initialId?: string): UseEntityResult {
  const [entity, setEntity] = useState<Entity | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isOnline } = useNetwork();
  const { accessToken } = useAuth();

  const fetchEntity = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Check cache first
      let entityData = await offlineCache.entities.get(id);

      // If online, try to fetch fresh data
      if (isOnline && accessToken) {
        try {
          const response = await fetch(`/api/mobile/entities/${id}`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (response.ok) {
            entityData = await response.json();
            await offlineCache.entities.set(entityData);
          }
        } catch {
          // Use cached data if fetch fails
        }
      }

      if (entityData) {
        setEntity(entityData);
      } else {
        setError('Entity not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch entity');
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, accessToken]);

  // Fetch initial entity if provided
  if (initialId && !entity && !isLoading) {
    fetchEntity(initialId);
  }

  return {
    entity,
    isLoading,
    error,
    fetchEntity,
  };
}
