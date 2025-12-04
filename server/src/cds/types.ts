export type SecurityClassification = 'UNCLASSIFIED' | 'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET';

export interface SecurityLabel {
  classification: SecurityClassification;
  releasability?: string[]; // e.g., ['REL_TO_USA', 'REL_TO_GBR']
  compartments?: string[]; // e.g., ['HCS', 'G', 'SI']
}

export interface SecurityDomain {
  id: string; // e.g., 'high-side', 'low-side'
  name: string;
  classification: SecurityClassification;
  releasability?: string[];
}

export interface UserSecurityContext {
  userId: string;
  clearance: SecurityClassification;
  nationality: string; // ISO 3166-1 alpha-3
  accessCompartments: string[];
  authorizedDomains: string[];
}

export interface TransferRequest {
  entityId: string;
  sourceDomainId: string;
  targetDomainId: string;
  justification: string;
  userContext: UserSecurityContext;
}

export interface TransferResult {
  success: boolean;
  transferId?: string;
  timestamp: Date;
  error?: string;
}

export interface InspectionResult {
  passed: boolean;
  issues: string[];
  sanitizedContent?: any;
}
