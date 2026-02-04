import React, { createContext, useContext, ReactNode, useMemo } from 'react';

// Item 3: Resilience Policy Engine
// Defines the shape of the policy that governs error recovery
export interface ResiliencePolicy {
  maxRetries: number;
  retryBackoffMs: number;
  fallbackStrategy: 'simple' | 'agentic';
  reportErrors: boolean;
}

export interface ResilienceContextType {
  policy: ResiliencePolicy;
  agenticRecoveryEnabled: boolean;
}

// Default policy - could be loaded from config/remote in the future
const defaultPolicy: ResiliencePolicy = {
  maxRetries: 3,
  retryBackoffMs: 2000,
  fallbackStrategy: 'simple', // Default OFF (Governance requirement)
  reportErrors: true,
};

const ResilienceContext = createContext<ResilienceContextType | undefined>(undefined);

export const ResilienceProvider: React.FC<{ children: ReactNode; overridePolicy?: Partial<ResiliencePolicy> }> = ({
  children,
  overridePolicy
}) => {
  const value = useMemo(() => {
    const policy = { ...defaultPolicy, ...overridePolicy };
    return {
      policy,
      agenticRecoveryEnabled: policy.fallbackStrategy === 'agentic',
    };
  }, [overridePolicy]);

  return (
    <ResilienceContext.Provider value={value}>
      {children}
    </ResilienceContext.Provider>
  );
};

export const useResilience = () => {
  const context = useContext(ResilienceContext);
  if (!context) {
    throw new Error('useResilience must be used within a ResilienceProvider');
  }
  return context;
};
