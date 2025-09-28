import idpDirectory from './data/idp-directory.json';
import orgDirectory from './data/org-directory.json';
import resourceTags from './data/resource-tags.json';
import protectedActions from './data/protected-actions.json';
import idpSchema from './data/idp-schema.json';
import type {
  ResourceAttributes,
  SubjectAttributes,
  DecisionContext,
} from './types';

interface IdpRecord {
  id: string;
  email: string;
  tenantId: string;
  residency: string;
  clearance: string;
  loa: string;
  groups?: string[];
  lastSynced?: string;
}

interface OrgRecord {
  roles?: string[];
  entitlements?: string[];
  manager?: string;
  riskScore?: number;
  lastReviewed?: string;
}

interface ResourceRecord {
  id: string;
  tenantId: string;
  residency: string;
  classification: string;
  tags?: string[];
}

const idpRecords = idpDirectory as Record<string, IdpRecord>;
const orgRecords = orgDirectory as Record<string, OrgRecord>;
const resourceRecords = resourceTags as Record<string, ResourceRecord>;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface AttributeServiceOptions {
  ttlMs?: number;
  now?: () => number;
}

const DEFAULT_TTL = 60_000;

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

export class AttributeService {
  private subjectCache = new Map<string, CacheEntry<SubjectAttributes>>();
  private resourceCache = new Map<string, CacheEntry<ResourceAttributes>>();
  private ttlMs: number;
  private now: () => number;

  constructor(options: AttributeServiceOptions = {}) {
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL;
    this.now = options.now ?? Date.now;
  }

  invalidateSubject(subjectId: string) {
    this.subjectCache.delete(subjectId);
  }

  invalidateResource(resourceId: string) {
    this.resourceCache.delete(resourceId);
  }

  listProtectedActions(): string[] {
    return [...protectedActions];
  }

  getIdpSchema(): Record<string, string> {
    return { ...idpSchema };
  }

  getDecisionContext(currentAcr: string): DecisionContext {
    return {
      protectedActions: this.listProtectedActions(),
      requestTime: new Date(this.now()).toISOString(),
      currentAcr,
    };
  }

  async getSubjectAttributes(subjectId: string): Promise<SubjectAttributes> {
    const cached = this.subjectCache.get(subjectId);
    if (cached && cached.expiresAt > this.now()) {
      return cached.value;
    }

    const idpRecord = idpRecords[subjectId];
    const orgRecord = orgRecords[subjectId];

    if (!idpRecord) {
      throw new Error('subject_not_found');
    }

    const subject: SubjectAttributes = {
      id: idpRecord.id,
      tenantId: idpRecord.tenantId,
      residency: idpRecord.residency,
      clearance: idpRecord.clearance,
      loa: idpRecord.loa,
      roles: unique([...(orgRecord?.roles ?? []), ...(idpRecord.groups ?? [])]),
      entitlements: unique([...(orgRecord?.entitlements ?? [])]),
      riskScore: orgRecord?.riskScore ?? 0,
      groups: [...(idpRecord.groups ?? [])],
      metadata: {
        email: idpRecord.email,
        manager: orgRecord?.manager ?? 'unknown',
      },
      lastSyncedAt: idpRecord.lastSynced,
      lastReviewedAt: orgRecord?.lastReviewed,
    };

    this.subjectCache.set(subjectId, {
      value: subject,
      expiresAt: this.now() + this.ttlMs,
    });

    return subject;
  }

  async getResourceAttributes(resourceId: string): Promise<ResourceAttributes> {
    const cached = this.resourceCache.get(resourceId);
    if (cached && cached.expiresAt > this.now()) {
      return cached.value;
    }
    const tagRecord = resourceRecords[resourceId];
    if (!tagRecord) {
      throw new Error('resource_not_found');
    }
    const resource: ResourceAttributes = {
      id: tagRecord.id,
      tenantId: tagRecord.tenantId,
      residency: tagRecord.residency,
      classification: tagRecord.classification,
      tags: [...(tagRecord.tags ?? [])],
    };
    this.resourceCache.set(resourceId, {
      value: resource,
      expiresAt: this.now() + this.ttlMs,
    });
    return resource;
  }
}
