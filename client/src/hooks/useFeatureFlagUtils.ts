// client/src/hooks/useFeatureFlagUtils.ts
import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { FeatureFlag, FeatureFlagContextType } from './useFeatureFlag';

// Hook to get multiple flags
export const useMultipleFeatureFlags = (flagKeys: string[]): {
  flags: Record<string, boolean>;
  values: Record<string, unknown>;
  isLoading: boolean;
  error: Error | null;
} => {
  const context = useContext(createContext<FeatureFlagContextType | undefined>(undefined));

  if (!context) {
    throw new Error('useMultipleFeatureFlags must be used within a FeatureFlagProvider');
  }

  const flags: Record<string, boolean> = {};
  const values: Record<string, unknown> = {};

  flagKeys.forEach((key) => {
    const flag = context.getFlag(key);
    flags[key] = flag ? Boolean(flag.value !== undefined ? flag.value : flag.enabled) : false;
    values[key] = flag ? (flag.value !== undefined ? flag.value : flag.enabled) : undefined;
  });

  return {
    flags,
    values,
    isLoading: context.isLoading,
    error: context.error
  };
};

// Hook to check if all flags are enabled
export const useFeatureFlagAll = (flagKeys: string[]): {
  allEnabled: boolean;
  isLoading: boolean;
  error: Error | null;
} => {
  const { flags, isLoading, error } = useMultipleFeatureFlags(flagKeys);

  // Check if all flags are enabled
  const allEnabled = flagKeys.every((key) => flags[key]);

  return {
    allEnabled,
    isLoading,
    error
  };
};

// Hook to check if any flag is enabled
export const useFeatureFlagAny = (flagKeys: string[]): {
  anyEnabled: boolean;
  isLoading: boolean;
  error: Error | null;
} => {
  const { flags, isLoading, error } = useMultipleFeatureFlags(flagKeys);

  // Check if any flag is enabled
  const anyEnabled = flagKeys.some((key) => flags[key]);

  return {
    anyEnabled,
    isLoading,
    error
  };
};