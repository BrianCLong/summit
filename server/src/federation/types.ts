export enum IdentifierType {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  HANDLE = 'HANDLE',
  SSN = 'SSN', // For policy testing (should be blocked in some contexts)
  OTHER = 'OTHER'
}

export interface HashedToken {
  token: string;
  type: IdentifierType;
  tenantId: string;
  entityId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface DeconflictionRequest {
  id: string;
  requesterTenantId: string;
  targetTenantId: string;
  purpose: string;
  tokens: string[]; // List of hashed tokens to check for overlap
  status: 'PENDING' | 'COMPLETED' | 'REJECTED';
  createdAt: Date;
  result?: DeconflictionResponse;
  rejectionReason?: string;
}

export interface DeconflictionResponse {
  overlapCount: number;
  matchedTokens: string[];
  metadata: {
    entityCount: number;
    summary: string;
  };
  timestamp: Date;
}
