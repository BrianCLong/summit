export interface PurchaseOrder {
  id: string;
  tenantId: string;
  poNumber: string;
  issuer: string;
  issuedDate: Date;
  amount: number | null;
  currency: string;
  status: 'draft' | 'active' | 'fulfilled' | 'cancelled';
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contract {
  id: string;
  tenantId: string;
  title: string;
  status: 'draft' | 'active' | 'expired' | 'terminated';
  startDate: Date;
  endDate: Date | null;
  autoRenew: boolean;
  metadata: Record<string, any>;
  purchaseOrderId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaidArtifact {
  id: string;
  name: string;
  key: string;
  description: string | null;
  tier: string;
  pricingModel: 'flat' | 'usage' | 'per_seat';
  priceAmount: number | null;
  currency: string;
  isActive: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Entitlement {
  id: string;
  tenantId: string;
  artifactKey: string;
  status: 'active' | 'suspended' | 'expired';
  startDate: Date;
  endDate: Date | null;
  limits: Record<string, any>;
  source: string;
  sourceId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FraudSignal {
  id: string;
  tenantId: string | null;
  signalType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  payload: Record<string, any>;
  detectedAt: Date;
  investigationId: string | null;
}

export interface InvestigationCase {
  id: string;
  tenantId: string | null;
  title: string;
  status: 'open' | 'in_progress' | 'resolved' | 'false_positive';
  severity: 'medium' | 'high' | 'critical';
  assignedTo: string | null;
  resolutionNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface HoldAction {
  id: string;
  targetType: 'tenant' | 'payout' | 'account';
  targetId: string;
  reason: string;
  status: 'active' | 'released';
  appliedBy: string;
  releasedBy: string | null;
  releasedAt: Date | null;
  investigationId: string | null;
  createdAt: Date;
}
