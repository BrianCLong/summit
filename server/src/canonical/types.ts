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

export function filterByTemporal<T extends CanonicalEntity>(entities: T[], pointInTime: string): T[] {
  const pit = new Date(pointInTime).getTime();
  return entities.filter(e => {
    const from = e.validFrom ? new Date(e.validFrom).getTime() : 0;
    const to = e.validTo ? new Date(e.validTo).getTime() : Infinity;
    return pit >= from && pit <= to;
  });
}

// Bitemporal fields for tracking valid time and knowledge time
export interface BitemporalFields {
  validFrom: Date;
  validTo: Date | null;
  observedAt: Date;
  recordedAt: Date;
}

// Check if entity was valid at a specific point in time
export function isValidAt(entity: BitemporalFields, pointInTime: Date): boolean {
  const pit = pointInTime.getTime();
  const from = entity.validFrom.getTime();
  const to = entity.validTo ? entity.validTo.getTime() : Infinity;
  return pit >= from && pit <= to;
}

// Check if entity was known/recorded at a specific point in time
export function wasKnownAt(entity: BitemporalFields, pointInTime: Date): boolean {
  return pointInTime.getTime() >= entity.recordedAt.getTime();
}
