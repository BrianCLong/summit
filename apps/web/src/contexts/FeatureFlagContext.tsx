// @ts-nocheck
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

export interface FlagEvaluation {
  key: string;
  value: any;
  variation?: string;
  reason?: string;
}

interface FeatureFlagContextType {
  flags: Record<string, any>;
  isEnabled: (key: string, defaultValue?: boolean) => boolean;
  getVariant: <T>(key: string, defaultValue: T) => T;
  reloadFlags: () => Promise<void>;
  loading: boolean;
  error: Error | null;
}

const FeatureFlagContext = createContext<FeatureFlagContextType | undefined>(undefined);

export function FeatureFlagProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user, token: contextToken } = useAuth() as { user: any; token?: string };
  const token = contextToken ?? localStorage.getItem('auth_token');

  const fetchFlags = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/feature-flags/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          context: {
            // Context is augmented by server based on token,
            // but we can add client-side context here (e.g., URL params, device info)
            url: window.location.href,
            userAgent: navigator.userAgent
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch feature flags');
      }

      const data = await response.json();
      setFlags(data);
      setError(null);
    } catch (err) {
      console.error('Error loading feature flags:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      fetchFlags();
    } else {
      setLoading(false);
    }
  }, [user, fetchFlags]);

  const isEnabled = useCallback((key: string, defaultValue = false): boolean => {
    if (flags[key] !== undefined) {
      return Boolean(flags[key]);
    }
    return defaultValue;
  }, [flags]);

  const getVariant = useCallback(<T,>(key: string, defaultValue: T): T => {
    if (flags[key] !== undefined) {
      return flags[key] as T;
    }
    return defaultValue;
  }, [flags]);

  return (
    <FeatureFlagContext.Provider value={{ flags, isEnabled, getVariant, reloadFlags: fetchFlags, loading, error }}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags() {
  const context = useContext(FeatureFlagContext);
  if (context === undefined) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }
  return context;
}
