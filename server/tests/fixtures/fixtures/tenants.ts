export interface TestTenant {
  id: string;
  name: string;
  variant: 'alpha' | 'beta' | 'secure';
  config: Record<string, any>;
}

export const TEST_TENANTS: Record<string, TestTenant> = {
  ALPHA: {
    id: 'tenant-alpha-123',
    name: 'Alpha Corp',
    variant: 'alpha',
    config: {
      features: {
        graph_analytics: true,
        maestro: true,
      },
    },
  },
  BETA: {
    id: 'tenant-beta-456',
    name: 'Beta Industries',
    variant: 'beta',
    config: {
      features: {
        graph_analytics: true,
        maestro: true,
        experimental: true,
      },
    },
  },
  SECURE: {
    id: 'tenant-secure-789',
    name: 'Secure Systems',
    variant: 'secure',
    config: {
      features: {
        graph_analytics: false,
        maestro: false,
      },
      security: {
        enforce_2fa: true,
        ip_allowlist: ['127.0.0.1'],
      },
    },
  },
};

export const createTestTenant = (
  variant: 'alpha' | 'beta' | 'secure' = 'alpha',
): TestTenant => {
  return TEST_TENANTS[variant.toUpperCase()];
};
