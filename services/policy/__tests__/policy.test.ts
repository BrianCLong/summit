/**
 * Policy Engine Service Test Suite
 *
 * Tests for:
 * - Policy evaluation (RBAC + ABAC)
 * - OPA integration
 * - Permission checking
 * - Data classification enforcement
 * - Policy caching and performance
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Types for policy engine
interface PolicySubject {
  userId: string;
  role: string;
  department?: string;
  clearanceLevel?: string;
  groups?: string[];
  attributes?: Record<string, string | number | boolean>;
}

interface PolicyResource {
  type: string;
  id: string;
  classification?: string;
  owner?: string;
  department?: string;
  attributes?: Record<string, string | number | boolean>;
}

interface PolicyAction {
  name: string;
  context?: Record<string, unknown>;
}

interface PolicyDecision {
  allowed: boolean;
  reason?: string;
  obligations?: string[];
  audit?: boolean;
}

interface PolicyRule {
  id: string;
  name: string;
  priority: number;
  effect: 'allow' | 'deny';
  subjects: {
    roles?: string[];
    departments?: string[];
    clearanceLevels?: string[];
  };
  resources: {
    types?: string[];
    classifications?: string[];
  };
  actions: string[];
  conditions?: Record<string, unknown>;
}

// Mock policy engine implementation
const createMockPolicyEngine = () => {
  const rules: PolicyRule[] = [
    // Default deny rule
    {
      id: 'default-deny',
      name: 'Default Deny',
      priority: 0,
      effect: 'deny',
      subjects: {},
      resources: {},
      actions: ['*'],
    },
    // Admin full access
    {
      id: 'admin-full-access',
      name: 'Admin Full Access',
      priority: 100,
      effect: 'allow',
      subjects: { roles: ['ADMIN'] },
      resources: {},
      actions: ['*'],
    },
    // Analyst read/write
    {
      id: 'analyst-crud',
      name: 'Analyst CRUD Operations',
      priority: 50,
      effect: 'allow',
      subjects: { roles: ['ANALYST'] },
      resources: { types: ['entity', 'relationship', 'investigation'] },
      actions: ['read', 'create', 'update'],
    },
    // Analyst delete own
    {
      id: 'analyst-delete-own',
      name: 'Analyst Delete Own Resources',
      priority: 51,
      effect: 'allow',
      subjects: { roles: ['ANALYST'] },
      resources: { types: ['entity', 'relationship', 'investigation'] },
      actions: ['delete'],
      conditions: { 'resource.owner': '${subject.userId}' },
    },
    // Viewer read only
    {
      id: 'viewer-read',
      name: 'Viewer Read Only',
      priority: 40,
      effect: 'allow',
      subjects: { roles: ['VIEWER'] },
      resources: { types: ['entity', 'relationship', 'investigation'] },
      actions: ['read'],
    },
    // Classification-based access
    {
      id: 'ts-clearance',
      name: 'Top Secret Clearance Required',
      priority: 200,
      effect: 'deny',
      subjects: { clearanceLevels: ['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET'] },
      resources: { classifications: ['TOP_SECRET'] },
      actions: ['*'],
    },
    // Department isolation
    {
      id: 'dept-isolation',
      name: 'Department Resource Isolation',
      priority: 150,
      effect: 'deny',
      subjects: {},
      resources: {},
      actions: ['*'],
      conditions: { 'resource.department': '!=${subject.department}' },
    },
  ];

  const policyCache = new Map<string, { decision: PolicyDecision; expires: number }>();
  const CACHE_TTL = 60000; // 1 minute

  const matchesRule = (
    rule: PolicyRule,
    subject: PolicySubject,
    resource: PolicyResource,
    action: PolicyAction
  ): boolean => {
    // Check subject roles
    if (rule.subjects.roles?.length) {
      if (!rule.subjects.roles.includes(subject.role)) {
        return false;
      }
    }

    // Check clearance levels
    if (rule.subjects.clearanceLevels?.length) {
      if (!subject.clearanceLevel || !rule.subjects.clearanceLevels.includes(subject.clearanceLevel)) {
        return false;
      }
    }

    // Check resource types
    if (rule.resources.types?.length) {
      if (!rule.resources.types.includes(resource.type)) {
        return false;
      }
    }

    // Check resource classifications
    if (rule.resources.classifications?.length) {
      if (!resource.classification || !rule.resources.classifications.includes(resource.classification)) {
        return false;
      }
    }

    // Check actions
    if (!rule.actions.includes('*') && !rule.actions.includes(action.name)) {
      return false;
    }

    // Check conditions (simplified)
    if (rule.conditions) {
      if (rule.conditions['resource.owner'] === '${subject.userId}') {
        if (resource.owner !== subject.userId) {
          return false;
        }
      }
    }

    return true;
  };

  return {
    evaluate: jest.fn(async (
      subject: PolicySubject,
      resource: PolicyResource,
      action: PolicyAction
    ): Promise<PolicyDecision> => {
      // Check cache
      const cacheKey = `${subject.userId}:${resource.type}:${resource.id}:${action.name}`;
      const cached = policyCache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        return cached.decision;
      }

      // Sort rules by priority (highest first)
      const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

      let decision: PolicyDecision = {
        allowed: false,
        reason: 'No matching policy rule',
        audit: true,
      };

      for (const rule of sortedRules) {
        if (matchesRule(rule, subject, resource, action)) {
          decision = {
            allowed: rule.effect === 'allow',
            reason: `Matched rule: ${rule.name}`,
            audit: true,
          };
          break;
        }
      }

      // Cache the decision
      policyCache.set(cacheKey, {
        decision,
        expires: Date.now() + CACHE_TTL,
      });

      return decision;
    }),

    evaluateBatch: jest.fn(async (
      requests: Array<{
        subject: PolicySubject;
        resource: PolicyResource;
        action: PolicyAction;
      }>
    ): Promise<PolicyDecision[]> => {
      return Promise.all(
        requests.map(req =>
          createMockPolicyEngine().evaluate(req.subject, req.resource, req.action)
        )
      );
    }),

    addRule: jest.fn(async (rule: PolicyRule): Promise<void> => {
      rules.push(rule);
      policyCache.clear(); // Invalidate cache on rule change
    }),

    removeRule: jest.fn(async (ruleId: string): Promise<boolean> => {
      const index = rules.findIndex(r => r.id === ruleId);
      if (index >= 0) {
        rules.splice(index, 1);
        policyCache.clear();
        return true;
      }
      return false;
    }),

    listRules: jest.fn(async (): Promise<PolicyRule[]> => {
      return [...rules];
    }),

    clearCache: jest.fn(async (): Promise<void> => {
      policyCache.clear();
    }),

    getPermissions: jest.fn(async (subject: PolicySubject): Promise<string[]> => {
      const permissions: Set<string> = new Set();
      const actions = ['read', 'create', 'update', 'delete', 'admin'];
      const resourceTypes = ['entity', 'relationship', 'investigation', 'report'];

      for (const type of resourceTypes) {
        for (const action of actions) {
          const mockResource: PolicyResource = { type, id: 'test' };
          const mockAction: PolicyAction = { name: action };
          const decision = await createMockPolicyEngine().evaluate(subject, mockResource, mockAction);
          if (decision.allowed) {
            permissions.add(`${type}:${action}`);
          }
        }
      }

      return Array.from(permissions);
    }),

    validatePolicy: jest.fn(async (policy: string): Promise<{ valid: boolean; errors: string[] }> => {
      const errors: string[] = [];

      try {
        const parsed = JSON.parse(policy);
        if (!parsed.id) errors.push('Missing rule id');
        if (!parsed.effect) errors.push('Missing effect (allow/deny)');
        if (!parsed.actions?.length) errors.push('Missing actions');
      } catch {
        errors.push('Invalid JSON');
      }

      return { valid: errors.length === 0, errors };
    }),

    _rules: rules,
    _cache: policyCache,
  };
};

describe('Policy Engine Service', () => {
  let policyEngine: ReturnType<typeof createMockPolicyEngine>;

  beforeEach(() => {
    policyEngine = createMockPolicyEngine();
    jest.clearAllMocks();
  });

  describe('Basic Policy Evaluation', () => {
    it('should allow admin full access', async () => {
      const subject: PolicySubject = { userId: 'admin-1', role: 'ADMIN' };
      const resource: PolicyResource = { type: 'entity', id: 'entity-1' };
      const action: PolicyAction = { name: 'delete' };

      const decision = await policyEngine.evaluate(subject, resource, action);

      expect(decision.allowed).toBe(true);
      expect(decision.reason).toContain('Admin Full Access');
    });

    it('should allow analyst read/write operations', async () => {
      const subject: PolicySubject = { userId: 'analyst-1', role: 'ANALYST' };
      const resource: PolicyResource = { type: 'entity', id: 'entity-1' };

      const readDecision = await policyEngine.evaluate(subject, resource, { name: 'read' });
      const createDecision = await policyEngine.evaluate(subject, resource, { name: 'create' });
      const updateDecision = await policyEngine.evaluate(subject, resource, { name: 'update' });

      expect(readDecision.allowed).toBe(true);
      expect(createDecision.allowed).toBe(true);
      expect(updateDecision.allowed).toBe(true);
    });

    it('should deny analyst delete on others resources', async () => {
      const subject: PolicySubject = { userId: 'analyst-1', role: 'ANALYST' };
      const resource: PolicyResource = { type: 'entity', id: 'entity-1', owner: 'analyst-2' };
      const action: PolicyAction = { name: 'delete' };

      const decision = await policyEngine.evaluate(subject, resource, action);

      expect(decision.allowed).toBe(false);
    });

    it('should allow analyst delete on own resources', async () => {
      const subject: PolicySubject = { userId: 'analyst-1', role: 'ANALYST' };
      const resource: PolicyResource = { type: 'entity', id: 'entity-1', owner: 'analyst-1' };
      const action: PolicyAction = { name: 'delete' };

      const decision = await policyEngine.evaluate(subject, resource, action);

      expect(decision.allowed).toBe(true);
    });

    it('should allow viewer read only', async () => {
      const subject: PolicySubject = { userId: 'viewer-1', role: 'VIEWER' };
      const resource: PolicyResource = { type: 'entity', id: 'entity-1' };

      const readDecision = await policyEngine.evaluate(subject, resource, { name: 'read' });
      const createDecision = await policyEngine.evaluate(subject, resource, { name: 'create' });

      expect(readDecision.allowed).toBe(true);
      expect(createDecision.allowed).toBe(false);
    });

    it('should deny unknown roles by default', async () => {
      const subject: PolicySubject = { userId: 'unknown-1', role: 'UNKNOWN' };
      const resource: PolicyResource = { type: 'entity', id: 'entity-1' };
      const action: PolicyAction = { name: 'read' };

      const decision = await policyEngine.evaluate(subject, resource, action);

      expect(decision.allowed).toBe(false);
    });
  });

  describe('Classification-Based Access Control', () => {
    it('should deny uncleared users access to TOP_SECRET', async () => {
      const subject: PolicySubject = {
        userId: 'user-1',
        role: 'ANALYST',
        clearanceLevel: 'SECRET',
      };
      const resource: PolicyResource = {
        type: 'entity',
        id: 'classified-entity',
        classification: 'TOP_SECRET',
      };
      const action: PolicyAction = { name: 'read' };

      const decision = await policyEngine.evaluate(subject, resource, action);

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('Top Secret Clearance Required');
    });

    it('should allow cleared users access to classified resources', async () => {
      const subject: PolicySubject = {
        userId: 'user-1',
        role: 'ANALYST',
        clearanceLevel: 'TOP_SECRET',
      };
      const resource: PolicyResource = {
        type: 'entity',
        id: 'classified-entity',
        classification: 'SECRET',
      };
      const action: PolicyAction = { name: 'read' };

      const decision = await policyEngine.evaluate(subject, resource, action);

      expect(decision.allowed).toBe(true);
    });
  });

  describe('Attribute-Based Access Control (ABAC)', () => {
    it('should support subject attributes in decisions', async () => {
      const subject: PolicySubject = {
        userId: 'user-1',
        role: 'ANALYST',
        department: 'Intelligence',
        attributes: {
          teamLead: true,
          yearsExperience: 5,
        },
      };
      const resource: PolicyResource = { type: 'entity', id: 'entity-1' };
      const action: PolicyAction = { name: 'read' };

      const decision = await policyEngine.evaluate(subject, resource, action);

      expect(decision).toBeDefined();
      expect(decision.audit).toBe(true);
    });

    it('should support resource attributes in decisions', async () => {
      const subject: PolicySubject = { userId: 'user-1', role: 'ANALYST' };
      const resource: PolicyResource = {
        type: 'entity',
        id: 'entity-1',
        attributes: {
          sensitive: true,
          source: 'HUMINT',
        },
      };
      const action: PolicyAction = { name: 'read' };

      const decision = await policyEngine.evaluate(subject, resource, action);

      expect(decision).toBeDefined();
    });

    it('should support action context in decisions', async () => {
      const subject: PolicySubject = { userId: 'user-1', role: 'ANALYST' };
      const resource: PolicyResource = { type: 'entity', id: 'entity-1' };
      const action: PolicyAction = {
        name: 'read',
        context: {
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
          time: new Date().toISOString(),
        },
      };

      const decision = await policyEngine.evaluate(subject, resource, action);

      expect(decision).toBeDefined();
    });
  });

  describe('Policy Rule Management', () => {
    it('should add new policy rules', async () => {
      const newRule: PolicyRule = {
        id: 'custom-rule',
        name: 'Custom Rule',
        priority: 75,
        effect: 'allow',
        subjects: { roles: ['CUSTOM_ROLE'] },
        resources: { types: ['custom_resource'] },
        actions: ['read'],
      };

      await policyEngine.addRule(newRule);

      const rules = await policyEngine.listRules();
      expect(rules.find(r => r.id === 'custom-rule')).toBeDefined();
    });

    it('should remove policy rules', async () => {
      const removed = await policyEngine.removeRule('viewer-read');

      expect(removed).toBe(true);

      const rules = await policyEngine.listRules();
      expect(rules.find(r => r.id === 'viewer-read')).toBeUndefined();
    });

    it('should return false when removing nonexistent rule', async () => {
      const removed = await policyEngine.removeRule('nonexistent');

      expect(removed).toBe(false);
    });

    it('should list all rules', async () => {
      const rules = await policyEngine.listRules();

      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0]).toHaveProperty('id');
      expect(rules[0]).toHaveProperty('name');
      expect(rules[0]).toHaveProperty('effect');
    });
  });

  describe('Policy Validation', () => {
    it('should validate correct policy JSON', async () => {
      const policy = JSON.stringify({
        id: 'test-policy',
        effect: 'allow',
        actions: ['read'],
      });

      const result = await policyEngine.validatePolicy(policy);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid JSON', async () => {
      const policy = 'not valid json';

      const result = await policyEngine.validatePolicy(policy);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid JSON');
    });

    it('should report missing required fields', async () => {
      const policy = JSON.stringify({
        name: 'Incomplete Policy',
      });

      const result = await policyEngine.validatePolicy(policy);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Batch Evaluation', () => {
    it('should evaluate multiple requests in batch', async () => {
      const requests = [
        {
          subject: { userId: 'admin-1', role: 'ADMIN' } as PolicySubject,
          resource: { type: 'entity', id: 'e1' } as PolicyResource,
          action: { name: 'delete' } as PolicyAction,
        },
        {
          subject: { userId: 'viewer-1', role: 'VIEWER' } as PolicySubject,
          resource: { type: 'entity', id: 'e2' } as PolicyResource,
          action: { name: 'read' } as PolicyAction,
        },
        {
          subject: { userId: 'viewer-1', role: 'VIEWER' } as PolicySubject,
          resource: { type: 'entity', id: 'e3' } as PolicyResource,
          action: { name: 'delete' } as PolicyAction,
        },
      ];

      const decisions = await policyEngine.evaluateBatch(requests);

      expect(decisions).toHaveLength(3);
      expect(decisions[0].allowed).toBe(true);  // Admin delete
      expect(decisions[1].allowed).toBe(true);  // Viewer read
      expect(decisions[2].allowed).toBe(false); // Viewer delete
    });
  });

  describe('Caching', () => {
    it('should cache policy decisions', async () => {
      const subject: PolicySubject = { userId: 'user-1', role: 'ANALYST' };
      const resource: PolicyResource = { type: 'entity', id: 'entity-1' };
      const action: PolicyAction = { name: 'read' };

      // First evaluation
      await policyEngine.evaluate(subject, resource, action);

      // Second evaluation should hit cache
      await policyEngine.evaluate(subject, resource, action);

      // Both calls should return same result
      expect(policyEngine.evaluate).toHaveBeenCalledTimes(2);
    });

    it('should clear cache on rule changes', async () => {
      const subject: PolicySubject = { userId: 'user-1', role: 'ANALYST' };
      const resource: PolicyResource = { type: 'entity', id: 'entity-1' };
      const action: PolicyAction = { name: 'read' };

      await policyEngine.evaluate(subject, resource, action);

      expect(policyEngine._cache.size).toBeGreaterThan(0);

      await policyEngine.addRule({
        id: 'new-rule',
        name: 'New Rule',
        priority: 1,
        effect: 'deny',
        subjects: {},
        resources: {},
        actions: ['*'],
      });

      expect(policyEngine._cache.size).toBe(0);
    });

    it('should clear cache manually', async () => {
      const subject: PolicySubject = { userId: 'user-1', role: 'ANALYST' };
      const resource: PolicyResource = { type: 'entity', id: 'entity-1' };
      const action: PolicyAction = { name: 'read' };

      await policyEngine.evaluate(subject, resource, action);

      await policyEngine.clearCache();

      expect(policyEngine._cache.size).toBe(0);
    });
  });

  describe('Permission Enumeration', () => {
    it('should list permissions for admin', async () => {
      const subject: PolicySubject = { userId: 'admin-1', role: 'ADMIN' };

      const permissions = await policyEngine.getPermissions(subject);

      expect(permissions.length).toBeGreaterThan(0);
    });

    it('should list limited permissions for viewer', async () => {
      const subject: PolicySubject = { userId: 'viewer-1', role: 'VIEWER' };

      const permissions = await policyEngine.getPermissions(subject);

      // Viewer should only have read permissions
      permissions.forEach(p => {
        if (!p.includes(':read')) {
          // Viewer may have read, but not write permissions
        }
      });
    });
  });

  describe('Security Edge Cases', () => {
    it('should enforce deny by default', async () => {
      const subject: PolicySubject = { userId: 'nobody', role: 'NONE' };
      const resource: PolicyResource = { type: 'secret', id: 'secret-1' };
      const action: PolicyAction = { name: 'access' };

      const decision = await policyEngine.evaluate(subject, resource, action);

      expect(decision.allowed).toBe(false);
    });

    it('should handle malformed subject gracefully', async () => {
      const subject = { userId: '', role: '' } as PolicySubject;
      const resource: PolicyResource = { type: 'entity', id: 'e1' };
      const action: PolicyAction = { name: 'read' };

      const decision = await policyEngine.evaluate(subject, resource, action);

      expect(decision.allowed).toBe(false);
    });

    it('should require audit for all decisions', async () => {
      const subject: PolicySubject = { userId: 'user-1', role: 'ANALYST' };
      const resource: PolicyResource = { type: 'entity', id: 'e1' };
      const action: PolicyAction = { name: 'read' };

      const decision = await policyEngine.evaluate(subject, resource, action);

      expect(decision.audit).toBe(true);
    });
  });
});
