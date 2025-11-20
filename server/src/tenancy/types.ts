export interface Tenant {
  id: string;
  name: string;
  status: 'active' | 'suspended' | 'deleted';
  tier: 'free' | 'pro' | 'enterprise';
  config: TenantConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantConfig {
  features: Record<string, boolean>;
  limits: {
    maxUsers: number;
    maxStorageBytes: number;
    maxApiRequestsPerMinute: number;
  };
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
  };
  settings?: Record<string, any>;
}

export interface TenantContext {
  tenant: Tenant;
  // You might want to add other context-specific data here, like:
  // user: User; // If you want to bind user to tenant in context
  // permissions: string[];
}

// Extend Express Request to include tenant
declare global {
  namespace Express {
    interface Request {
      tenant?: Tenant;
      tenantId?: string;
    }
  }
}
