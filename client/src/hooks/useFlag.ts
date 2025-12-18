import { useState, useEffect, useMemo } from 'react';

interface FlagConfig {
  [key: string]: {
    enabled: boolean;
    rollout?: number; // 0-100 percentage
    conditions?: {
      env?: string[];
      tenant?: string[];
      role?: string[];
      user?: string[];
    };
  };
}

// Default feature flags configuration
const DEFAULT_FLAGS: FlagConfig = {
  'realtime-presence': {
    enabled: true,
    rollout: 100,
    conditions: {
      env: ['development', 'staging', 'production'],
    },
  },
  'graph-streaming': {
    enabled: true,
    rollout: 80,
    conditions: {
      env: ['development', 'staging', 'production'],
    },
  },
  'graph-lod': {
    enabled: true,
    rollout: 100,
    conditions: {
      env: ['development', 'staging', 'production'],
    },
  },
  'graph-lod-aggregation': {
    enabled: true,
    rollout: 100,
    conditions: {
      env: ['development', 'staging', 'production'],
    },
  },
  'graph-lod-benchmark': {
    enabled: import.meta.env.DEV ?? true,
    rollout: 100,
    conditions: {
      env: ['development', 'staging', 'production'],
    },
  },
  'k-shortest-paths': {
    enabled: true,
    rollout: 100,
    conditions: {
      env: ['development', 'staging'],
    },
  },
  'advanced-search': {
    enabled: true,
    rollout: 100,
  },
  'bulk-actions': {
    enabled: true,
    rollout: 90,
  },
  'report-templates': {
    enabled: true,
    rollout: 100,
    conditions: {
      role: ['analyst', 'admin', 'investigator'],
    },
  },
  'forensics-reports': {
    enabled: true,
    rollout: 100,
    conditions: {
      role: ['forensics', 'admin', 'legal'],
    },
  },
  'fps-monitor': {
    enabled: import.meta.env.DEV,
    rollout: 100,
    conditions: {
      env: ['development'],
    },
  },
  'event-inspector': {
    enabled: import.meta.env.DEV,
    rollout: 100,
    conditions: {
      env: ['development'],
    },
  },
  'optimistic-updates': {
    enabled: true,
    rollout: 75,
  },
  'multi-language': {
    enabled: true,
    rollout: 50,
    conditions: {
      env: ['staging', 'production'],
    },
  },
  'otel.correlation': {
    enabled: true,
    rollout: 100,
  },
};

interface UserContext {
  userId?: string;
  tenantId?: string;
  role?: string;
  env?: string;
}

/**
 * Feature flag hook with env/tenant/role fallback
 */
export function useFlag(flagKey: string, context?: UserContext): boolean {
  const [dynamicFlags, setDynamicFlags] = useState<FlagConfig>({});

  // Load dynamic flags from server/localStorage (simplified implementation)
  useEffect(() => {
    const storedFlags = localStorage.getItem('feature-flags');
    if (storedFlags) {
      try {
        setDynamicFlags(JSON.parse(storedFlags));
      } catch (error) {
        console.warn('Failed to parse stored feature flags:', error);
      }
    }
  }, []);

  const isEnabled = useMemo(() => {
    const flags = { ...DEFAULT_FLAGS, ...dynamicFlags };
    const flag = flags[flagKey];

    if (!flag) {
      console.warn(`Feature flag "${flagKey}" not found`);
      return false;
    }

    // Check if flag is globally disabled
    if (!flag.enabled) {
      return false;
    }

    // Check rollout percentage
    if (flag.rollout && flag.rollout < 100) {
      const hash = hashString(`${flagKey}-${context?.userId || 'anonymous'}`);
      const bucket = hash % 100;
      if (bucket >= flag.rollout) {
        return false;
      }
    }

    // Check conditions
    if (flag.conditions) {
      const { env, tenant, role, user } = flag.conditions;

      // Environment check
      if (env && context?.env && !env.includes(context.env)) {
        return false;
      }

      // Tenant check
      if (tenant && context?.tenantId && !tenant.includes(context.tenantId)) {
        return false;
      }

      // Role check
      if (role && context?.role && !role.includes(context.role)) {
        return false;
      }

      // User check
      if (user && context?.userId && !user.includes(context.userId)) {
        return false;
      }
    }

    return true;
  }, [flagKey, dynamicFlags, context]);

  return isEnabled;
}

/**
 * Hook to get all available flags with their status
 */
export function useFlags(context?: UserContext): Record<string, boolean> {
  const [dynamicFlags] = useState<FlagConfig>({});

  return useMemo(() => {
    const flags = { ...DEFAULT_FLAGS, ...dynamicFlags };
    const result: Record<string, boolean> = {};

    for (const flagKey of Object.keys(flags)) {
      result[flagKey] = useFlag(flagKey, context);
    }

    return result;
  }, [dynamicFlags, context]);
}

/**
 * Hook for updating feature flags (admin use)
 */
export function useFlagUpdater() {
  const updateFlag = (flagKey: string, config: Partial<FlagConfig[string]>) => {
    const storedFlags = localStorage.getItem('feature-flags');
    let flags: FlagConfig = {};

    if (storedFlags) {
      try {
        flags = JSON.parse(storedFlags);
      } catch (error) {
        console.warn('Failed to parse stored flags:', error);
      }
    }

    flags[flagKey] = { ...flags[flagKey], ...config };
    localStorage.setItem('feature-flags', JSON.stringify(flags));

    // Trigger re-evaluation
    window.dispatchEvent(new CustomEvent('feature-flags-updated'));
  };

  return { updateFlag };
}

// Simple hash function for consistent bucketing
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
