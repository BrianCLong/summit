export type CanonicalEntityKind =
  | 'Person'
  | 'Org'
  | 'Organization'
  | 'Account'
  | 'Document'
  | 'Event'
  | 'Activity'
  | 'Asset'
  | 'Authority'
  | 'Campaign'
  | 'Case'
  | 'Claim'
  | 'Communication'
  | 'Decision'
  | 'Device'
  | 'Evidence'
  | 'Financial'
  | 'FinancialInstrument'
  | 'Indicator'
  | 'Infrastructure'
  | 'Legal'
  | 'License'
  | 'Location'
  | 'Narrative'
  | 'Sensor'
  | 'Vehicle';

export interface PolicyLabels {
  sensitivity: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED' | 'public' | 'internal' | 'confidential' | 'restricted';
  jurisdiction?: string[];
  retention?: string;
}

export interface BaseCanonicalEntity {
  id: string;
  kind: CanonicalEntityKind;
  tenantId: string;
  sourceIds: string[];

  // Bitemporal & Provenance
  createdAt: string | Date;
  updatedAt: string | Date;
  validFrom?: string | Date;
  validTo?: string | Date;
  observedAt?: string | Date;
  provenanceId?: string;

  // Governance
  policyLabels?: PolicyLabels;

  // Backwards compatibility
  schemaVersion?: string;
  recordedAt?: string | Date;
  version?: number;
}

export type CanonicalEntity = BaseCanonicalEntity;

export interface CanonicalEntityMetadata {
    confidence?: number;
    source?: string | { sourceType: string; sourceId?: string; reliability?: string };
    classification?: string | any;
}

export interface TemporalQuery {
    validAt?: Date;
    transactionAt?: Date;
}

export interface BitemporalFields {
    validFrom?: Date | string;
    validTo?: Date | string;
    transactionFrom?: Date | string;
    transactionTo?: Date | string;
    recordedAt?: Date | string;
}

export interface Person extends BaseCanonicalEntity {
  kind: 'Person';
  properties: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    role?: string;
  };
}

export interface Org extends BaseCanonicalEntity {
  kind: 'Org';
  properties: {
    name: string;
    industry?: string;
    domain?: string;
  };
}

export interface Account extends BaseCanonicalEntity {
  kind: 'Account';
  properties: {
    accountId: string;
    type?: string;
    status?: string;
  };
}

export interface Document extends BaseCanonicalEntity {
  kind: 'Document';
  properties: {
    title: string;
    text: string;
    mimeType?: string;
    metadata?: Record<string, unknown>;
  };
}

export interface Event extends BaseCanonicalEntity {
  kind: 'Event';
  properties: {
    name: string;
    date: string;
    location?: string;
    participants?: string[];
  };
}

export interface Case extends BaseCanonicalEntity {
    kind: 'Case';
    properties: {
        title: string;
        description?: string;
        status?: string;
    };
    relatedEntities?: {
        entityId: string;
        relationType: string;
    }[];
}

export function filterByTemporal<T extends BaseCanonicalEntity>(entities: T[], pointInTime: string): T[] {
  const pit = new Date(pointInTime).getTime();
  return entities.filter(e => {
    const from = e.validFrom ? new Date(e.validFrom).getTime() : 0;
    const to = e.validTo ? new Date(e.validTo).getTime() : Infinity;
    return pit >= from && pit <= to;
  });
}
