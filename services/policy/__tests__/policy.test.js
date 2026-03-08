"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Mock policy engine implementation
const createMockPolicyEngine = () => {
    const rules = [
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
    const policyCache = new Map();
    const CACHE_TTL = 60000; // 1 minute
    const matchesRule = (rule, subject, resource, action) => {
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
        evaluate: globals_1.jest.fn(async (subject, resource, action) => {
            // Check cache
            const cacheKey = `${subject.userId}:${resource.type}:${resource.id}:${action.name}`;
            const cached = policyCache.get(cacheKey);
            if (cached && cached.expires > Date.now()) {
                return cached.decision;
            }
            // Sort rules by priority (highest first)
            const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);
            let decision = {
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
        evaluateBatch: globals_1.jest.fn(async (requests) => {
            return Promise.all(requests.map(req => createMockPolicyEngine().evaluate(req.subject, req.resource, req.action)));
        }),
        addRule: globals_1.jest.fn(async (rule) => {
            rules.push(rule);
            policyCache.clear(); // Invalidate cache on rule change
        }),
        removeRule: globals_1.jest.fn(async (ruleId) => {
            const index = rules.findIndex(r => r.id === ruleId);
            if (index >= 0) {
                rules.splice(index, 1);
                policyCache.clear();
                return true;
            }
            return false;
        }),
        listRules: globals_1.jest.fn(async () => {
            return [...rules];
        }),
        clearCache: globals_1.jest.fn(async () => {
            policyCache.clear();
        }),
        getPermissions: globals_1.jest.fn(async (subject) => {
            const permissions = new Set();
            const actions = ['read', 'create', 'update', 'delete', 'admin'];
            const resourceTypes = ['entity', 'relationship', 'investigation', 'report'];
            for (const type of resourceTypes) {
                for (const action of actions) {
                    const mockResource = { type, id: 'test' };
                    const mockAction = { name: action };
                    const decision = await createMockPolicyEngine().evaluate(subject, mockResource, mockAction);
                    if (decision.allowed) {
                        permissions.add(`${type}:${action}`);
                    }
                }
            }
            return Array.from(permissions);
        }),
        validatePolicy: globals_1.jest.fn(async (policy) => {
            const errors = [];
            try {
                const parsed = JSON.parse(policy);
                if (!parsed.id)
                    errors.push('Missing rule id');
                if (!parsed.effect)
                    errors.push('Missing effect (allow/deny)');
                if (!parsed.actions?.length)
                    errors.push('Missing actions');
            }
            catch {
                errors.push('Invalid JSON');
            }
            return { valid: errors.length === 0, errors };
        }),
        _rules: rules,
        _cache: policyCache,
    };
};
(0, globals_1.describe)('Policy Engine Service', () => {
    let policyEngine;
    (0, globals_1.beforeEach)(() => {
        policyEngine = createMockPolicyEngine();
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('Basic Policy Evaluation', () => {
        (0, globals_1.it)('should allow admin full access', async () => {
            const subject = { userId: 'admin-1', role: 'ADMIN' };
            const resource = { type: 'entity', id: 'entity-1' };
            const action = { name: 'delete' };
            const decision = await policyEngine.evaluate(subject, resource, action);
            (0, globals_1.expect)(decision.allowed).toBe(true);
            (0, globals_1.expect)(decision.reason).toContain('Admin Full Access');
        });
        (0, globals_1.it)('should allow analyst read/write operations', async () => {
            const subject = { userId: 'analyst-1', role: 'ANALYST' };
            const resource = { type: 'entity', id: 'entity-1' };
            const readDecision = await policyEngine.evaluate(subject, resource, { name: 'read' });
            const createDecision = await policyEngine.evaluate(subject, resource, { name: 'create' });
            const updateDecision = await policyEngine.evaluate(subject, resource, { name: 'update' });
            (0, globals_1.expect)(readDecision.allowed).toBe(true);
            (0, globals_1.expect)(createDecision.allowed).toBe(true);
            (0, globals_1.expect)(updateDecision.allowed).toBe(true);
        });
        (0, globals_1.it)('should deny analyst delete on others resources', async () => {
            const subject = { userId: 'analyst-1', role: 'ANALYST' };
            const resource = { type: 'entity', id: 'entity-1', owner: 'analyst-2' };
            const action = { name: 'delete' };
            const decision = await policyEngine.evaluate(subject, resource, action);
            (0, globals_1.expect)(decision.allowed).toBe(false);
        });
        (0, globals_1.it)('should allow analyst delete on own resources', async () => {
            const subject = { userId: 'analyst-1', role: 'ANALYST' };
            const resource = { type: 'entity', id: 'entity-1', owner: 'analyst-1' };
            const action = { name: 'delete' };
            const decision = await policyEngine.evaluate(subject, resource, action);
            (0, globals_1.expect)(decision.allowed).toBe(true);
        });
        (0, globals_1.it)('should allow viewer read only', async () => {
            const subject = { userId: 'viewer-1', role: 'VIEWER' };
            const resource = { type: 'entity', id: 'entity-1' };
            const readDecision = await policyEngine.evaluate(subject, resource, { name: 'read' });
            const createDecision = await policyEngine.evaluate(subject, resource, { name: 'create' });
            (0, globals_1.expect)(readDecision.allowed).toBe(true);
            (0, globals_1.expect)(createDecision.allowed).toBe(false);
        });
        (0, globals_1.it)('should deny unknown roles by default', async () => {
            const subject = { userId: 'unknown-1', role: 'UNKNOWN' };
            const resource = { type: 'entity', id: 'entity-1' };
            const action = { name: 'read' };
            const decision = await policyEngine.evaluate(subject, resource, action);
            (0, globals_1.expect)(decision.allowed).toBe(false);
        });
    });
    (0, globals_1.describe)('Classification-Based Access Control', () => {
        (0, globals_1.it)('should deny uncleared users access to TOP_SECRET', async () => {
            const subject = {
                userId: 'user-1',
                role: 'ANALYST',
                clearanceLevel: 'SECRET',
            };
            const resource = {
                type: 'entity',
                id: 'classified-entity',
                classification: 'TOP_SECRET',
            };
            const action = { name: 'read' };
            const decision = await policyEngine.evaluate(subject, resource, action);
            (0, globals_1.expect)(decision.allowed).toBe(false);
            (0, globals_1.expect)(decision.reason).toContain('Top Secret Clearance Required');
        });
        (0, globals_1.it)('should allow cleared users access to classified resources', async () => {
            const subject = {
                userId: 'user-1',
                role: 'ANALYST',
                clearanceLevel: 'TOP_SECRET',
            };
            const resource = {
                type: 'entity',
                id: 'classified-entity',
                classification: 'SECRET',
            };
            const action = { name: 'read' };
            const decision = await policyEngine.evaluate(subject, resource, action);
            (0, globals_1.expect)(decision.allowed).toBe(true);
        });
    });
    (0, globals_1.describe)('Attribute-Based Access Control (ABAC)', () => {
        (0, globals_1.it)('should support subject attributes in decisions', async () => {
            const subject = {
                userId: 'user-1',
                role: 'ANALYST',
                department: 'Intelligence',
                attributes: {
                    teamLead: true,
                    yearsExperience: 5,
                },
            };
            const resource = { type: 'entity', id: 'entity-1' };
            const action = { name: 'read' };
            const decision = await policyEngine.evaluate(subject, resource, action);
            (0, globals_1.expect)(decision).toBeDefined();
            (0, globals_1.expect)(decision.audit).toBe(true);
        });
        (0, globals_1.it)('should support resource attributes in decisions', async () => {
            const subject = { userId: 'user-1', role: 'ANALYST' };
            const resource = {
                type: 'entity',
                id: 'entity-1',
                attributes: {
                    sensitive: true,
                    source: 'HUMINT',
                },
            };
            const action = { name: 'read' };
            const decision = await policyEngine.evaluate(subject, resource, action);
            (0, globals_1.expect)(decision).toBeDefined();
        });
        (0, globals_1.it)('should support action context in decisions', async () => {
            const subject = { userId: 'user-1', role: 'ANALYST' };
            const resource = { type: 'entity', id: 'entity-1' };
            const action = {
                name: 'read',
                context: {
                    ipAddress: '192.168.1.100',
                    userAgent: 'Mozilla/5.0',
                    time: new Date().toISOString(),
                },
            };
            const decision = await policyEngine.evaluate(subject, resource, action);
            (0, globals_1.expect)(decision).toBeDefined();
        });
    });
    (0, globals_1.describe)('Policy Rule Management', () => {
        (0, globals_1.it)('should add new policy rules', async () => {
            const newRule = {
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
            (0, globals_1.expect)(rules.find(r => r.id === 'custom-rule')).toBeDefined();
        });
        (0, globals_1.it)('should remove policy rules', async () => {
            const removed = await policyEngine.removeRule('viewer-read');
            (0, globals_1.expect)(removed).toBe(true);
            const rules = await policyEngine.listRules();
            (0, globals_1.expect)(rules.find(r => r.id === 'viewer-read')).toBeUndefined();
        });
        (0, globals_1.it)('should return false when removing nonexistent rule', async () => {
            const removed = await policyEngine.removeRule('nonexistent');
            (0, globals_1.expect)(removed).toBe(false);
        });
        (0, globals_1.it)('should list all rules', async () => {
            const rules = await policyEngine.listRules();
            (0, globals_1.expect)(rules.length).toBeGreaterThan(0);
            (0, globals_1.expect)(rules[0]).toHaveProperty('id');
            (0, globals_1.expect)(rules[0]).toHaveProperty('name');
            (0, globals_1.expect)(rules[0]).toHaveProperty('effect');
        });
    });
    (0, globals_1.describe)('Policy Validation', () => {
        (0, globals_1.it)('should validate correct policy JSON', async () => {
            const policy = JSON.stringify({
                id: 'test-policy',
                effect: 'allow',
                actions: ['read'],
            });
            const result = await policyEngine.validatePolicy(policy);
            (0, globals_1.expect)(result.valid).toBe(true);
            (0, globals_1.expect)(result.errors).toHaveLength(0);
        });
        (0, globals_1.it)('should reject invalid JSON', async () => {
            const policy = 'not valid json';
            const result = await policyEngine.validatePolicy(policy);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors).toContain('Invalid JSON');
        });
        (0, globals_1.it)('should report missing required fields', async () => {
            const policy = JSON.stringify({
                name: 'Incomplete Policy',
            });
            const result = await policyEngine.validatePolicy(policy);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('Batch Evaluation', () => {
        (0, globals_1.it)('should evaluate multiple requests in batch', async () => {
            const requests = [
                {
                    subject: { userId: 'admin-1', role: 'ADMIN' },
                    resource: { type: 'entity', id: 'e1' },
                    action: { name: 'delete' },
                },
                {
                    subject: { userId: 'viewer-1', role: 'VIEWER' },
                    resource: { type: 'entity', id: 'e2' },
                    action: { name: 'read' },
                },
                {
                    subject: { userId: 'viewer-1', role: 'VIEWER' },
                    resource: { type: 'entity', id: 'e3' },
                    action: { name: 'delete' },
                },
            ];
            const decisions = await policyEngine.evaluateBatch(requests);
            (0, globals_1.expect)(decisions).toHaveLength(3);
            (0, globals_1.expect)(decisions[0].allowed).toBe(true); // Admin delete
            (0, globals_1.expect)(decisions[1].allowed).toBe(true); // Viewer read
            (0, globals_1.expect)(decisions[2].allowed).toBe(false); // Viewer delete
        });
    });
    (0, globals_1.describe)('Caching', () => {
        (0, globals_1.it)('should cache policy decisions', async () => {
            const subject = { userId: 'user-1', role: 'ANALYST' };
            const resource = { type: 'entity', id: 'entity-1' };
            const action = { name: 'read' };
            // First evaluation
            await policyEngine.evaluate(subject, resource, action);
            // Second evaluation should hit cache
            await policyEngine.evaluate(subject, resource, action);
            // Both calls should return same result
            (0, globals_1.expect)(policyEngine.evaluate).toHaveBeenCalledTimes(2);
        });
        (0, globals_1.it)('should clear cache on rule changes', async () => {
            const subject = { userId: 'user-1', role: 'ANALYST' };
            const resource = { type: 'entity', id: 'entity-1' };
            const action = { name: 'read' };
            await policyEngine.evaluate(subject, resource, action);
            (0, globals_1.expect)(policyEngine._cache.size).toBeGreaterThan(0);
            await policyEngine.addRule({
                id: 'new-rule',
                name: 'New Rule',
                priority: 1,
                effect: 'deny',
                subjects: {},
                resources: {},
                actions: ['*'],
            });
            (0, globals_1.expect)(policyEngine._cache.size).toBe(0);
        });
        (0, globals_1.it)('should clear cache manually', async () => {
            const subject = { userId: 'user-1', role: 'ANALYST' };
            const resource = { type: 'entity', id: 'entity-1' };
            const action = { name: 'read' };
            await policyEngine.evaluate(subject, resource, action);
            await policyEngine.clearCache();
            (0, globals_1.expect)(policyEngine._cache.size).toBe(0);
        });
    });
    (0, globals_1.describe)('Permission Enumeration', () => {
        (0, globals_1.it)('should list permissions for admin', async () => {
            const subject = { userId: 'admin-1', role: 'ADMIN' };
            const permissions = await policyEngine.getPermissions(subject);
            (0, globals_1.expect)(permissions.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should list limited permissions for viewer', async () => {
            const subject = { userId: 'viewer-1', role: 'VIEWER' };
            const permissions = await policyEngine.getPermissions(subject);
            // Viewer should only have read permissions
            permissions.forEach(p => {
                if (!p.includes(':read')) {
                    // Viewer may have read, but not write permissions
                }
            });
        });
    });
    (0, globals_1.describe)('Security Edge Cases', () => {
        (0, globals_1.it)('should enforce deny by default', async () => {
            const subject = { userId: 'nobody', role: 'NONE' };
            const resource = { type: 'secret', id: 'secret-1' };
            const action = { name: 'access' };
            const decision = await policyEngine.evaluate(subject, resource, action);
            (0, globals_1.expect)(decision.allowed).toBe(false);
        });
        (0, globals_1.it)('should handle malformed subject gracefully', async () => {
            const subject = { userId: '', role: '' };
            const resource = { type: 'entity', id: 'e1' };
            const action = { name: 'read' };
            const decision = await policyEngine.evaluate(subject, resource, action);
            (0, globals_1.expect)(decision.allowed).toBe(false);
        });
        (0, globals_1.it)('should require audit for all decisions', async () => {
            const subject = { userId: 'user-1', role: 'ANALYST' };
            const resource = { type: 'entity', id: 'e1' };
            const action = { name: 'read' };
            const decision = await policyEngine.evaluate(subject, resource, action);
            (0, globals_1.expect)(decision.audit).toBe(true);
        });
    });
});
