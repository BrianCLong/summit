export type CanonicalEntityKind = 'Person' | 'Org' | 'Account' | 'Document' | 'Event';

export interface PolicyLabels {
  sensitivity: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  jurisdiction?: string[];
  retention?: string;
}

export interface CanonicalEntity {
  id: string;
  kind: CanonicalEntityKind;
  tenantId: string;
  sourceIds: string[];
  properties: Record<string, unknown>;

  // Bitemporal & Provenance
  createdAt: string;
  updatedAt: string;
  validFrom?: string;
  validTo?: string;
  observedAt?: string;
  provenanceId?: string;

  // Governance
  policyLabels?: PolicyLabels;
}

export interface Person extends CanonicalEntity {
  kind: 'Person';
  properties: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    role?: string;
  };
}

export interface Org extends CanonicalEntity {
  kind: 'Org';
  properties: {
    name: string;
    industry?: string;
    domain?: string;
  };
}

export interface Account extends CanonicalEntity {
  kind: 'Account';
  properties: {
    accountId: string;
    type?: string;
    status?: string;
  };
}

export interface Document extends CanonicalEntity {
  kind: 'Document';
  properties: {
    title: string;
    text: string;
    mimeType?: string;
    metadata?: Record<string, unknown>;
  };
}

export interface Event extends CanonicalEntity {
  kind: 'Event';
  properties: {
    name: string;
    date: string;
    location?: string;
    participants?: string[];
  };
}
