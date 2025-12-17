/**
 * Data Spine Access Control
 *
 * Role-based and attribute-based access control for data contracts.
 * Integrates with OPA for policy decisions and provides fine-grained
 * permission management for schema operations.
 */

const crypto = require('crypto');

const PERMISSIONS = {
  // Contract operations
  CONTRACT_CREATE: 'contract:create',
  CONTRACT_READ: 'contract:read',
  CONTRACT_UPDATE: 'contract:update',
  CONTRACT_DELETE: 'contract:delete',
  CONTRACT_VALIDATE: 'contract:validate',
  CONTRACT_BUMP: 'contract:bump',
  CONTRACT_DEPRECATE: 'contract:deprecate',

  // Schema operations
  SCHEMA_READ: 'schema:read',
  SCHEMA_MODIFY: 'schema:modify',

  // Policy operations
  POLICY_READ: 'policy:read',
  POLICY_MODIFY: 'policy:modify',
  POLICY_APPLY: 'policy:apply',
  POLICY_OVERRIDE: 'policy:override',

  // Data operations
  DATA_TOKENIZE: 'data:tokenize',
  DATA_DETOKENIZE: 'data:detokenize',
  DATA_REDACT: 'data:redact',
  DATA_EXPORT: 'data:export',

  // Audit operations
  AUDIT_READ: 'audit:read',
  AUDIT_EXPORT: 'audit:export',
  AUDIT_VERIFY: 'audit:verify',

  // Governance operations
  GOVERNANCE_ADMIN: 'governance:admin',
  GOVERNANCE_AUDIT: 'governance:audit',

  // Classification operations
  CLASSIFICATION_READ: 'classification:read',
  CLASSIFICATION_MODIFY: 'classification:modify',
  CLASSIFICATION_OVERRIDE: 'classification:override',
};

const BUILT_IN_ROLES = {
  'data-steward': {
    description: 'Full governance control over data contracts',
    permissions: [
      PERMISSIONS.CONTRACT_CREATE,
      PERMISSIONS.CONTRACT_READ,
      PERMISSIONS.CONTRACT_UPDATE,
      PERMISSIONS.CONTRACT_DELETE,
      PERMISSIONS.CONTRACT_VALIDATE,
      PERMISSIONS.CONTRACT_BUMP,
      PERMISSIONS.CONTRACT_DEPRECATE,
      PERMISSIONS.SCHEMA_READ,
      PERMISSIONS.SCHEMA_MODIFY,
      PERMISSIONS.POLICY_READ,
      PERMISSIONS.POLICY_MODIFY,
      PERMISSIONS.POLICY_APPLY,
      PERMISSIONS.DATA_TOKENIZE,
      PERMISSIONS.DATA_DETOKENIZE,
      PERMISSIONS.DATA_REDACT,
      PERMISSIONS.DATA_EXPORT,
      PERMISSIONS.AUDIT_READ,
      PERMISSIONS.CLASSIFICATION_READ,
      PERMISSIONS.CLASSIFICATION_MODIFY,
    ],
  },
  'data-engineer': {
    description: 'Create and manage contracts, apply policies',
    permissions: [
      PERMISSIONS.CONTRACT_CREATE,
      PERMISSIONS.CONTRACT_READ,
      PERMISSIONS.CONTRACT_UPDATE,
      PERMISSIONS.CONTRACT_VALIDATE,
      PERMISSIONS.CONTRACT_BUMP,
      PERMISSIONS.SCHEMA_READ,
      PERMISSIONS.SCHEMA_MODIFY,
      PERMISSIONS.POLICY_READ,
      PERMISSIONS.POLICY_APPLY,
      PERMISSIONS.DATA_TOKENIZE,
      PERMISSIONS.DATA_REDACT,
      PERMISSIONS.CLASSIFICATION_READ,
    ],
  },
  'data-analyst': {
    description: 'Read contracts and schemas, limited data operations',
    permissions: [
      PERMISSIONS.CONTRACT_READ,
      PERMISSIONS.CONTRACT_VALIDATE,
      PERMISSIONS.SCHEMA_READ,
      PERMISSIONS.POLICY_READ,
      PERMISSIONS.DATA_TOKENIZE,
      PERMISSIONS.CLASSIFICATION_READ,
    ],
  },
  'compliance-officer': {
    description: 'Full audit access, compliance reporting',
    permissions: [
      PERMISSIONS.CONTRACT_READ,
      PERMISSIONS.CONTRACT_VALIDATE,
      PERMISSIONS.SCHEMA_READ,
      PERMISSIONS.POLICY_READ,
      PERMISSIONS.AUDIT_READ,
      PERMISSIONS.AUDIT_EXPORT,
      PERMISSIONS.AUDIT_VERIFY,
      PERMISSIONS.GOVERNANCE_AUDIT,
      PERMISSIONS.CLASSIFICATION_READ,
    ],
  },
  'governance-admin': {
    description: 'Full administrative access',
    permissions: Object.values(PERMISSIONS),
  },
  'service-account': {
    description: 'Automated service operations',
    permissions: [
      PERMISSIONS.CONTRACT_READ,
      PERMISSIONS.CONTRACT_VALIDATE,
      PERMISSIONS.SCHEMA_READ,
      PERMISSIONS.POLICY_READ,
      PERMISSIONS.POLICY_APPLY,
      PERMISSIONS.DATA_TOKENIZE,
      PERMISSIONS.DATA_REDACT,
      PERMISSIONS.CLASSIFICATION_READ,
    ],
  },
  viewer: {
    description: 'Read-only access to contracts and schemas',
    permissions: [
      PERMISSIONS.CONTRACT_READ,
      PERMISSIONS.SCHEMA_READ,
      PERMISSIONS.POLICY_READ,
      PERMISSIONS.CLASSIFICATION_READ,
    ],
  },
};

const CLASSIFICATION_CLEARANCES = {
  Public: 0,
  Internal: 1,
  Confidential: 2,
  Secret: 3,
  'Export-Controlled': 3,
  PII: 2,
};

class AccessControl {
  constructor(options = {}) {
    this.roles = new Map(Object.entries(BUILT_IN_ROLES));
    this.principals = new Map();
    this.policies = [];
    this.auditTrail = options.auditTrail;
    this.opaEndpoint = options.opaEndpoint;
    this.cacheEnabled = options.cacheEnabled !== false;
    this.cache = new Map();
    this.cacheTTL = options.cacheTTL || 60000; // 1 minute default

    // Load custom roles if provided
    if (options.customRoles) {
      Object.entries(options.customRoles).forEach(([name, role]) => {
        this.roles.set(name, role);
      });
    }
  }

  // ============================================================================
  // Role Management
  // ============================================================================

  registerRole(name, role) {
    if (this.roles.has(name)) {
      throw new Error(`Role ${name} already exists`);
    }
    this.roles.set(name, {
      description: role.description,
      permissions: [...role.permissions],
      conditions: role.conditions || {},
    });
  }

  getRole(name) {
    return this.roles.get(name);
  }

  listRoles() {
    return Array.from(this.roles.entries()).map(([name, role]) => ({
      name,
      ...role,
    }));
  }

  // ============================================================================
  // Principal Management
  // ============================================================================

  registerPrincipal(principal) {
    const id = principal.id;
    this.principals.set(id, {
      id,
      type: principal.type || 'user',
      roles: principal.roles || [],
      attributes: principal.attributes || {},
      clearanceLevel: principal.clearanceLevel || 0,
      allowedRegions: principal.allowedRegions || [],
      allowedEnvironments: principal.allowedEnvironments || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    this.invalidateCache(id);
    return this.principals.get(id);
  }

  getPrincipal(id) {
    return this.principals.get(id);
  }

  updatePrincipal(id, updates) {
    const principal = this.principals.get(id);
    if (!principal) {
      throw new Error(`Principal ${id} not found`);
    }
    Object.assign(principal, updates, { updatedAt: new Date().toISOString() });
    this.invalidateCache(id);
    return principal;
  }

  assignRole(principalId, roleName) {
    const principal = this.principals.get(principalId);
    if (!principal) {
      throw new Error(`Principal ${principalId} not found`);
    }
    if (!this.roles.has(roleName)) {
      throw new Error(`Role ${roleName} not found`);
    }
    if (!principal.roles.includes(roleName)) {
      principal.roles.push(roleName);
      principal.updatedAt = new Date().toISOString();
      this.invalidateCache(principalId);
    }
    return principal;
  }

  revokeRole(principalId, roleName) {
    const principal = this.principals.get(principalId);
    if (!principal) {
      throw new Error(`Principal ${principalId} not found`);
    }
    principal.roles = principal.roles.filter((r) => r !== roleName);
    principal.updatedAt = new Date().toISOString();
    this.invalidateCache(principalId);
    return principal;
  }

  // ============================================================================
  // Permission Checking
  // ============================================================================

  getEffectivePermissions(principalId) {
    const principal = this.principals.get(principalId);
    if (!principal) {
      return [];
    }

    const permissions = new Set();
    principal.roles.forEach((roleName) => {
      const role = this.roles.get(roleName);
      if (role) {
        role.permissions.forEach((p) => permissions.add(p));
      }
    });

    return Array.from(permissions);
  }

  hasPermission(principalId, permission) {
    const cacheKey = `perm:${principalId}:${permission}`;
    if (this.cacheEnabled && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.value;
      }
    }

    const permissions = this.getEffectivePermissions(principalId);
    const result = permissions.includes(permission);

    if (this.cacheEnabled) {
      this.cache.set(cacheKey, { value: result, timestamp: Date.now() });
    }

    return result;
  }

  // ============================================================================
  // Authorization Decisions
  // ============================================================================

  async authorize(request) {
    const { principal, resource, action, context = {} } = request;

    // Resolve principal
    const principalData =
      typeof principal === 'string'
        ? this.principals.get(principal)
        : principal;

    if (!principalData) {
      return this.denyAccess('Principal not found', request);
    }

    // Map action to permission
    const permission = this.actionToPermission(action, resource.type);

    // Check basic permission
    if (!this.hasPermission(principalData.id, permission)) {
      return this.denyAccess(`Missing permission: ${permission}`, request);
    }

    // Check classification clearance
    if (resource.classification) {
      const clearanceResult = this.checkClassificationClearance(
        principalData,
        resource.classification
      );
      if (!clearanceResult.allowed) {
        return this.denyAccess(clearanceResult.reason, request);
      }
    }

    // Check region restrictions
    if (context.region && principalData.allowedRegions.length > 0) {
      if (!principalData.allowedRegions.includes(context.region)) {
        return this.denyAccess(
          `Region ${context.region} not allowed for principal`,
          request
        );
      }
    }

    // Check environment restrictions
    if (context.environment && principalData.allowedEnvironments.length > 0) {
      if (!principalData.allowedEnvironments.includes(context.environment)) {
        return this.denyAccess(
          `Environment ${context.environment} not allowed for principal`,
          request
        );
      }
    }

    // Check custom policies
    for (const policy of this.policies) {
      const policyResult = await this.evaluatePolicy(
        policy,
        principalData,
        resource,
        action,
        context
      );
      if (!policyResult.allowed) {
        return this.denyAccess(policyResult.reason, request, policy.id);
      }
    }

    // Check OPA if configured
    if (this.opaEndpoint) {
      const opaResult = await this.checkOPA(
        principalData,
        resource,
        action,
        context
      );
      if (!opaResult.allowed) {
        return this.denyAccess(opaResult.reason, request, 'opa');
      }
    }

    return this.allowAccess(request);
  }

  checkClassificationClearance(principal, classifications) {
    const classificationList = Array.isArray(classifications)
      ? classifications
      : [classifications];

    const maxRequired = Math.max(
      ...classificationList.map((c) => CLASSIFICATION_CLEARANCES[c] || 0)
    );

    if (principal.clearanceLevel < maxRequired) {
      return {
        allowed: false,
        reason: `Insufficient clearance level. Required: ${maxRequired}, Have: ${principal.clearanceLevel}`,
      };
    }

    return { allowed: true };
  }

  actionToPermission(action, resourceType) {
    const mapping = {
      contract: {
        create: PERMISSIONS.CONTRACT_CREATE,
        read: PERMISSIONS.CONTRACT_READ,
        update: PERMISSIONS.CONTRACT_UPDATE,
        delete: PERMISSIONS.CONTRACT_DELETE,
        validate: PERMISSIONS.CONTRACT_VALIDATE,
        bump: PERMISSIONS.CONTRACT_BUMP,
        deprecate: PERMISSIONS.CONTRACT_DEPRECATE,
      },
      schema: {
        read: PERMISSIONS.SCHEMA_READ,
        modify: PERMISSIONS.SCHEMA_MODIFY,
      },
      policy: {
        read: PERMISSIONS.POLICY_READ,
        modify: PERMISSIONS.POLICY_MODIFY,
        apply: PERMISSIONS.POLICY_APPLY,
        override: PERMISSIONS.POLICY_OVERRIDE,
      },
      data: {
        tokenize: PERMISSIONS.DATA_TOKENIZE,
        detokenize: PERMISSIONS.DATA_DETOKENIZE,
        redact: PERMISSIONS.DATA_REDACT,
        export: PERMISSIONS.DATA_EXPORT,
      },
      audit: {
        read: PERMISSIONS.AUDIT_READ,
        export: PERMISSIONS.AUDIT_EXPORT,
        verify: PERMISSIONS.AUDIT_VERIFY,
      },
    };

    return mapping[resourceType]?.[action] || `${resourceType}:${action}`;
  }

  async evaluatePolicy(policy, principal, resource, action, context) {
    // Simple policy evaluation - can be extended
    if (policy.type === 'deny-all') {
      return { allowed: false, reason: policy.reason || 'Policy denies all' };
    }

    if (policy.type === 'time-based') {
      const now = new Date();
      const hour = now.getUTCHours();
      if (policy.allowedHours && !policy.allowedHours.includes(hour)) {
        return { allowed: false, reason: 'Outside allowed hours' };
      }
    }

    if (policy.type === 'attribute-based') {
      for (const [attr, expected] of Object.entries(policy.requiredAttributes || {})) {
        if (principal.attributes[attr] !== expected) {
          return {
            allowed: false,
            reason: `Missing required attribute: ${attr}`,
          };
        }
      }
    }

    return { allowed: true };
  }

  async checkOPA(principal, resource, action, context) {
    if (!this.opaEndpoint) {
      return { allowed: true };
    }

    try {
      const input = {
        actor: {
          id: principal.id,
          type: principal.type,
          roles: principal.roles,
          attributes: principal.attributes,
          clearanceLevel: principal.clearanceLevel,
        },
        resource: {
          type: resource.type,
          id: resource.id,
          classification: resource.classification,
          owner: resource.owner,
        },
        action,
        context,
      };

      // In a real implementation, this would make an HTTP call to OPA
      // For now, we'll return allowed and let implementations override
      return { allowed: true, opaInput: input };
    } catch (error) {
      // Fail closed - deny on OPA errors
      return { allowed: false, reason: `OPA check failed: ${error.message}` };
    }
  }

  allowAccess(request) {
    const decision = {
      decision: 'allow',
      request,
      timestamp: new Date().toISOString(),
      decisionId: crypto.randomUUID(),
    };

    if (this.auditTrail) {
      this.auditTrail.recordAccessDecision(
        request.resource,
        request.principal,
        'allow',
        'All checks passed'
      );
    }

    return decision;
  }

  denyAccess(reason, request, policyId = null) {
    const decision = {
      decision: 'deny',
      reason,
      policyId,
      request,
      timestamp: new Date().toISOString(),
      decisionId: crypto.randomUUID(),
    };

    if (this.auditTrail) {
      this.auditTrail.recordAccessDecision(
        request.resource,
        request.principal,
        'deny',
        reason
      );
    }

    return decision;
  }

  // ============================================================================
  // Policy Management
  // ============================================================================

  addPolicy(policy) {
    const id = policy.id || crypto.randomUUID();
    this.policies.push({ ...policy, id });
    this.invalidateAllCache();
    return id;
  }

  removePolicy(policyId) {
    const index = this.policies.findIndex((p) => p.id === policyId);
    if (index >= 0) {
      this.policies.splice(index, 1);
      this.invalidateAllCache();
      return true;
    }
    return false;
  }

  listPolicies() {
    return [...this.policies];
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  invalidateCache(principalId) {
    for (const key of this.cache.keys()) {
      if (key.includes(principalId)) {
        this.cache.delete(key);
      }
    }
  }

  invalidateAllCache() {
    this.cache.clear();
  }
}

module.exports = {
  AccessControl,
  PERMISSIONS,
  BUILT_IN_ROLES,
  CLASSIFICATION_CLEARANCES,
};
