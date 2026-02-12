import { describe, expect, it } from '@jest/globals';

type Role = 'analyst' | 'manager' | 'admin' | 'legal' | 'global-admin';

type PolicySubject = {
  id: string;
  tenant: string;
  roles: Role[];
  attributes: {
    clearance: 'public' | 'internal' | 'confidential' | 'restricted' | 'secret';
    mfaEnrolled: boolean;
    purposeTags: string[];
  };
};

type ResourceField = {
  name: string;
  sensitive: boolean;
  encrypted?: boolean;
  algorithm?: string;
  kmsKeyId?: string;
  tags?: string[];
};

type PolicyResource = {
  id: string;
  tenant: string;
  classification?: PolicySubject['attributes']['clearance'];
  purposeTags?: string[];
  pii?: boolean;
  retentionDays?: number;
  legalHold?: boolean;
  fields?: ResourceField[];
};

type PolicyEnvironment = {
  requireMfa: boolean;
  mfaSatisfied: boolean;
  audit: {
    eventId: string;
    immutable: boolean;
  };
};

type PolicyInput = {
  subject: PolicySubject;
  resource: PolicyResource;
  action: 'read' | 'write' | 'delete' | 'tag';
  environment: PolicyEnvironment;
};

const ACTION_ROLES: Record<PolicyInput['action'], Set<Role>> = {
  read: new Set(['analyst', 'manager', 'admin', 'legal', 'global-admin']),
  write: new Set(['manager', 'admin', 'global-admin']),
  delete: new Set(['admin', 'global-admin']),
  tag: new Set(['manager', 'admin', 'legal', 'global-admin'])
};

const CLASSIFICATION_RANK: Record<string, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3,
  secret: 4
};

function evaluatePolicy(input: PolicyInput): boolean {
  const { subject, resource, action, environment } = input;
  const allowedRoles = ACTION_ROLES[action];
  if (!allowedRoles) {
    return false;
  }

  if (!subject.roles.includes('global-admin') && subject.tenant !== resource.tenant) {
    return false;
  }

  if (!subject.roles.some((role) => allowedRoles.has(role))) {
    return false;
  }

  const subjectClearance = CLASSIFICATION_RANK[subject.attributes.clearance] ?? 0;
  const resourceClearance = resource.classification ? CLASSIFICATION_RANK[resource.classification] ?? 0 : 0;
  if (resource.classification && subjectClearance < resourceClearance) {
    return false;
  }

  const subjectPurpose = new Set(subject.attributes.purposeTags ?? []);
  const resourcePurpose = new Set((resource.purposeTags ?? []).filter(Boolean));
  if (resourcePurpose.size > 0) {
    const hasIntersection = Array.from(resourcePurpose).some((tag) => subjectPurpose.has(tag));
    if (!hasIntersection && !subject.roles.includes('global-admin')) {
      return false;
    }
  }

  if (environment.requireMfa && (!subject.attributes.mfaEnrolled || !environment.mfaSatisfied)) {
    return false;
  }

  const hasUnprotectedSensitiveField = (resource.fields ?? []).some((field) => {
    if (!field.sensitive) {
      return false;
    }
    return !field.encrypted || !field.algorithm || !field.kmsKeyId;
  });
  if (hasUnprotectedSensitiveField) {
    return false;
  }

  if (resource.pii && !resource.legalHold && (resource.retentionDays ?? 0) > 30) {
    return false;
  }

  if (resource.legalHold && !subject.roles.some((role) => role === 'legal' || role === 'global-admin')) {
    return false;
  }

  if (!environment.audit?.eventId || !environment.audit.immutable) {
    return false;
  }

  return true;
}

type EnumerationAttempt = {
  timestamp: number;
  principalId: string;
  targetId: string;
};

function detectEnumeration(attempts: EnumerationAttempt[], windowMs: number, uniqueThreshold: number) {
  const activity = new Map<string, { firstSeen: number; targets: Set<string> }>();

  for (const attempt of attempts) {
    const entry = activity.get(attempt.principalId);
    if (!entry) {
      activity.set(attempt.principalId, { firstSeen: attempt.timestamp, targets: new Set([attempt.targetId]) });
      continue;
    }

    if (attempt.timestamp - entry.firstSeen > windowMs) {
      entry.firstSeen = attempt.timestamp;
      entry.targets = new Set([attempt.targetId]);
    } else {
      entry.targets.add(attempt.targetId);
    }

    if (entry.targets.size > uniqueThreshold) {
      return {
        flagged: true,
        principalId: attempt.principalId,
        uniqueCount: entry.targets.size
      };
    }
  }

  return { flagged: false };
}

function simulateTokenBucket(ratePerSecond: number, capacity: number, events: number[]) {
  let tokens = capacity;
  let lastRefill = events.length > 0 ? events[0] : Date.now();
  let blocked = 0;

  for (const eventTime of events) {
    const elapsedSeconds = (eventTime - lastRefill) / 1000;
    tokens = Math.min(capacity, tokens + elapsedSeconds * ratePerSecond);
    lastRefill = eventTime;

    if (tokens >= 1) {
      tokens -= 1;
    } else {
      blocked += 1;
    }
  }

  return {
    allowed: events.length - blocked,
    blocked
  };
}

function detectInjection(payload: string) {
  const patterns = [
    /'\s*or\s*1=1/i,
    /union\s+select/i,
    /<script/i,
    /;\s*drop\s+table/i,
    /\$\{.*\}/
  ];
  const matched = patterns.find((pattern) => pattern.test(payload));
  if (matched) {
    return {
      blocked: true,
      pattern: matched.source
    };
  }
  return { blocked: false };
}

describe('security misuse and abuse resilience', () => {
  const baseInput: PolicyInput = {
    subject: {
      id: 'user-1',
      tenant: 'tenant-a',
      roles: ['manager'],
      attributes: {
        clearance: 'restricted',
        mfaEnrolled: true,
        purposeTags: ['intel-analysis', 'legal-review']
      }
    },
    resource: {
      id: 'report-7',
      tenant: 'tenant-a',
      classification: 'confidential',
      purposeTags: ['intel-analysis'],
      pii: true,
      retentionDays: 14,
      legalHold: false,
      fields: [
        {
          name: 'ssn',
          sensitive: true,
          encrypted: true,
          algorithm: 'aes-256-gcm',
          kmsKeyId: 'kms/tenant-a/pii',
          tags: ['pii']
        }
      ]
    },
    action: 'read',
    environment: {
      requireMfa: true,
      mfaSatisfied: true,
      audit: {
        eventId: 'evt-123',
        immutable: true
      }
    }
  };

  it('allows legitimate tenant manager access while enforcing safeguards', () => {
    expect(evaluatePolicy(baseInput)).toBe(true);
  });

  it('blocks cross-tenant privilege escalation attempts', () => {
    const crossTenant = {
      ...baseInput,
      resource: { ...baseInput.resource, tenant: 'tenant-b' }
    };
    expect(evaluatePolicy(crossTenant)).toBe(false);
  });

  it('flags enumeration bursts above the tenant threshold', () => {
    const now = Date.now();
    const attempts: EnumerationAttempt[] = [
      { timestamp: now, principalId: 'user-1', targetId: 'record-1' },
      { timestamp: now + 5, principalId: 'user-1', targetId: 'record-2' },
      { timestamp: now + 10, principalId: 'user-1', targetId: 'record-3' },
      { timestamp: now + 15, principalId: 'user-1', targetId: 'record-4' }
    ];
    const result = detectEnumeration(attempts, 60_000, 3);
    expect(result.flagged).toBe(true);
    expect(result.uniqueCount).toBe(4);
  });

  it('enforces rate limiting for high-volume requests', () => {
    const start = Date.now();
    const events = Array.from({ length: 10 }, (_, index) => start + index * 50);
    const outcome = simulateTokenBucket(1, 5, events);
    expect(outcome.allowed).toBeLessThan(events.length);
    expect(outcome.blocked).toBeGreaterThan(0);
  });

  it('detects and blocks injection payloads', () => {
    const result = detectInjection("admin' OR 1=1 --");
    expect(result.blocked).toBe(true);
    expect(result.pattern).toContain('1=1');
  });
});
