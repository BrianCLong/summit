/**
 * @fileoverview Case Policy Engine - RBAC + ABAC Access Control
 *
 * Implements a comprehensive policy engine for Case Spaces that combines:
 * - RBAC: Role-based access using global roles and case membership roles
 * - ABAC: Attribute-based access using clearances, jurisdictions, purposes
 * - Authority validation: Checks for active warrants/authorities when required
 *
 * Design Principles:
 * - Deny by default: All operations require explicit authorization
 * - Explainable denies: Always return clear reason for denial
 * - Audit-ready: Every decision includes audit metadata
 * - Fail secure: Errors result in denial with logged exception
 *
 * @module cases/domain/CasePolicyEngine
 */

import {
  CasePolicyInput,
  CasePolicyDecision,
  CaseOperation,
  CaseRole,
  SensitivityLevel,
  UserContext,
  Case,
  CaseMember,
  ICasePolicyEngine,
} from './CaseTypes.js';

/**
 * Sensitivity level ordering for clearance comparison
 */
const SENSITIVITY_ORDER: Record<SensitivityLevel, number> = {
  PUBLIC: 0,
  INTERNAL: 1,
  CONFIDENTIAL: 2,
  SECRET: 3,
  TOP_SECRET: 4,
};

/**
 * Global roles that have special privileges
 */
const OVERSIGHT_GLOBAL_ROLES = ['OMBUDSMAN', 'COMPLIANCE_OFFICER', 'AUDITOR'];
const ADMIN_GLOBAL_ROLES = ['ADMIN', 'SUPER_ADMIN', 'SYSTEM'];

/**
 * Operations that require case membership (not just global roles)
 */
const MEMBERSHIP_REQUIRED_OPS: CaseOperation[] = [
  'VIEW_CASE',
  'UPDATE_CASE',
  'CLOSE_CASE',
  'ADD_MEMBER',
  'REMOVE_MEMBER',
  'CHANGE_MEMBER_ROLE',
  'LINK_ENTITY',
  'UNLINK_ENTITY',
  'LINK_EVIDENCE',
  'UNLINK_EVIDENCE',
  'CREATE_TASK',
  'UPDATE_TASK',
  'CREATE_WATCHLIST',
  'UPDATE_WATCHLIST',
  'BIND_AUTHORITY',
  'EXPORT_CASE',
];

/**
 * Operations restricted to specific case roles
 */
const ROLE_OPERATION_MATRIX: Record<CaseOperation, CaseRole[]> = {
  CREATE_CASE: [], // Uses global roles only
  VIEW_CASE: ['ANALYST', 'LEAD', 'OMBUDSMAN', 'ADMIN'],
  UPDATE_CASE: ['LEAD', 'ADMIN'],
  CLOSE_CASE: ['LEAD', 'ADMIN'],
  ARCHIVE_CASE: ['ADMIN'],
  ADD_MEMBER: ['LEAD', 'ADMIN'],
  REMOVE_MEMBER: ['LEAD', 'ADMIN'],
  CHANGE_MEMBER_ROLE: ['ADMIN'],
  LINK_ENTITY: ['ANALYST', 'LEAD', 'ADMIN'],
  UNLINK_ENTITY: ['LEAD', 'ADMIN'],
  LINK_EVIDENCE: ['ANALYST', 'LEAD', 'ADMIN'],
  UNLINK_EVIDENCE: ['LEAD', 'ADMIN'],
  CREATE_TASK: ['ANALYST', 'LEAD', 'ADMIN'],
  UPDATE_TASK: ['ANALYST', 'LEAD', 'ADMIN'],
  CREATE_WATCHLIST: ['ANALYST', 'LEAD', 'ADMIN'],
  UPDATE_WATCHLIST: ['ANALYST', 'LEAD', 'ADMIN'],
  BIND_AUTHORITY: ['LEAD', 'ADMIN'],
  VIEW_AUDIT_LOG: ['OMBUDSMAN', 'ADMIN'],
  VERIFY_AUDIT_INTEGRITY: ['OMBUDSMAN', 'ADMIN'],
  EXPORT_CASE: ['LEAD', 'ADMIN'],
};

/**
 * Global roles allowed to create cases
 */
const CREATE_CASE_GLOBAL_ROLES = ['ANALYST', 'LEAD', 'ADMIN', 'SUPER_ADMIN'];

/**
 * Operations that require active authority when case has requiresAuthority=true
 */
const AUTHORITY_GATED_OPS: CaseOperation[] = [
  'LINK_EVIDENCE',
  'EXPORT_CASE',
];

/**
 * Case Policy Engine Implementation
 *
 * Evaluates access requests using a layered approach:
 * 1. Basic validation (user, tenant)
 * 2. Global role check (ADMIN bypass, oversight roles)
 * 3. RBAC: Case membership role check
 * 4. ABAC: Attribute checks (clearance, jurisdiction, purpose)
 * 5. Authority check (warrant validation if required)
 */
export class CasePolicyEngine implements ICasePolicyEngine {
  /**
   * Evaluate a case operation against RBAC + ABAC rules
   *
   * @param input - Policy evaluation input
   * @returns Policy decision with allow/deny and reason
   */
  async evaluate(input: CasePolicyInput): Promise<CasePolicyDecision> {
    const { user, caseData, memberRecord, operation, operationContext } = input;
    const denialReasons: string[] = [];

    try {
      // === Layer 1: Basic Validation ===
      if (!user || !user.userId) {
        return this.deny('User context is required', { auditRequired: true });
      }

      if (!user.tenantId) {
        return this.deny('Tenant context is required', { auditRequired: true });
      }

      // === Layer 2: Global Admin Bypass ===
      if (this.hasAnyGlobalRole(user, ADMIN_GLOBAL_ROLES)) {
        // Admin can do everything, but still check tenant isolation for non-system ops
        if (caseData && caseData.tenantId !== user.tenantId) {
          return this.deny('Cross-tenant access denied', {
            auditRequired: true,
          });
        }
        return this.allow('Admin role grants full access', { auditRequired: true });
      }

      // === Layer 3: Operation-Specific Logic ===
      switch (operation) {
        case 'CREATE_CASE':
          return this.evaluateCreateCase(user);

        case 'VIEW_AUDIT_LOG':
        case 'VERIFY_AUDIT_INTEGRITY':
          return this.evaluateAuditAccess(user, caseData, memberRecord);

        default:
          // Operations requiring case context
          if (!caseData) {
            return this.deny(`Case context required for operation: ${operation}`, {
              auditRequired: true,
            });
          }

          // Tenant isolation check
          if (caseData.tenantId !== user.tenantId) {
            return this.deny('Cross-tenant access denied', {
              auditRequired: true,
            });
          }

          // Continue with layered evaluation
          break;
      }

      // === Layer 4: RBAC - Case Membership Check ===
      if (MEMBERSHIP_REQUIRED_OPS.includes(operation)) {
        // Check if user has oversight global role (bypass membership)
        if (this.hasAnyGlobalRole(user, OVERSIGHT_GLOBAL_ROLES)) {
          // Oversight can VIEW but not MODIFY
          if (this.isReadOnlyOperation(operation)) {
            // Still need ABAC checks
          } else {
            return this.deny(
              `Oversight role can only view, not ${operation}`,
              { auditRequired: true }
            );
          }
        } else {
          // Regular users need membership
          if (!memberRecord) {
            return this.deny(
              `Case membership required for operation: ${operation}`,
              { auditRequired: true, denialReasons: ['NO_MEMBERSHIP'] }
            );
          }

          // Check if member's role allows this operation
          const allowedRoles = ROLE_OPERATION_MATRIX[operation] || [];
          if (!allowedRoles.includes(memberRecord.role)) {
            denialReasons.push(`ROLE_INSUFFICIENT:${memberRecord.role}`);
            return this.deny(
              `Role '${memberRecord.role}' cannot perform '${operation}'. Required: ${allowedRoles.join(', ')}`,
              { auditRequired: true, denialReasons, requiredRoles: allowedRoles as CaseRole[] }
            );
          }
        }
      }

      // === Layer 5: ABAC - Attribute Checks ===
      // 5a. Sensitivity/Clearance check
      if (caseData?.sensitivity) {
        if (!this.checkClearance(user, caseData.sensitivity)) {
          const requiredClearance = caseData.sensitivity;
          denialReasons.push(`CLEARANCE_INSUFFICIENT:${requiredClearance}`);
          return this.deny(
            `Clearance '${user.clearances.join(', ')}' insufficient for sensitivity '${requiredClearance}'`,
            { auditRequired: true, denialReasons, requiredClearances: [requiredClearance] }
          );
        }
      }

      // Check operation context sensitivity (e.g., linking high-sensitivity evidence)
      if (operationContext?.sensitivity) {
        if (!this.checkClearance(user, operationContext.sensitivity)) {
          denialReasons.push(`CLEARANCE_INSUFFICIENT:${operationContext.sensitivity}`);
          return this.deny(
            `Clearance insufficient for resource sensitivity '${operationContext.sensitivity}'`,
            { auditRequired: true, denialReasons, requiredClearances: [operationContext.sensitivity] }
          );
        }
      }

      // 5b. Jurisdiction check (for non-oversight roles)
      if (!this.hasAnyGlobalRole(user, OVERSIGHT_GLOBAL_ROLES)) {
        if (caseData?.jurisdictions && caseData.jurisdictions.length > 0) {
          if (!this.checkJurisdiction(user.jurisdictions, caseData.jurisdictions)) {
            denialReasons.push('JURISDICTION_MISMATCH');
            return this.deny(
              `User jurisdictions [${user.jurisdictions.join(', ')}] do not overlap with case jurisdictions [${caseData.jurisdictions.join(', ')}]`,
              { auditRequired: true, denialReasons }
            );
          }
        }
      }

      // 5c. Purpose limitation check (for write operations)
      if (this.isWriteOperation(operation) && caseData?.legalBasis?.length) {
        // User must have at least one matching purpose
        const hasMatchingPurpose = this.checkPurposeAlignment(
          user.purposes,
          caseData.legalBasis.map(lb => lb.toString())
        );
        if (!hasMatchingPurpose) {
          denialReasons.push('PURPOSE_MISMATCH');
          return this.deny(
            `User purposes [${user.purposes.join(', ')}] do not align with case legal basis [${caseData.legalBasis.join(', ')}]`,
            { auditRequired: true, denialReasons }
          );
        }
      }

      // 5d. Compartment/Need-to-know check
      if (caseData?.compartment) {
        if (!user.needToKnowTags.includes(caseData.compartment)) {
          // Check if any policy labels grant access
          const hasAccessViaLabel = caseData.policyLabels.some(
            label => user.needToKnowTags.includes(label)
          );
          if (!hasAccessViaLabel) {
            denialReasons.push(`COMPARTMENT_ACCESS_DENIED:${caseData.compartment}`);
            return this.deny(
              `Compartment '${caseData.compartment}' requires need-to-know access`,
              { auditRequired: true, denialReasons }
            );
          }
        }
      }

      // === Layer 6: Authority/Warrant Check ===
      if (caseData?.requiresAuthority && AUTHORITY_GATED_OPS.includes(operation)) {
        // This would normally call the authority repository
        // For now, we indicate authority is required
        if (!operationContext?.authorityId) {
          return this.deny(
            `Operation '${operation}' requires active authority for this case`,
            { auditRequired: true, authorityRequired: true }
          );
        }
        // Authority validation would happen in the service layer
      }

      // === All Checks Passed ===
      return this.allow(
        `Access granted: ${operation} on case ${caseData?.caseId || 'N/A'}`,
        { auditRequired: this.shouldAudit(operation) }
      );

    } catch (error) {
      // Fail secure: deny on error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.deny(
        `Policy evaluation error: ${errorMessage}`,
        { auditRequired: true, denialReasons: ['POLICY_ERROR'] }
      );
    }
  }

  /**
   * Evaluate CREATE_CASE operation (uses global roles only)
   */
  private evaluateCreateCase(user: UserContext): CasePolicyDecision {
    // Check if user has any global role that allows case creation
    const hasCreateRole = user.roles.some(role =>
      CREATE_CASE_GLOBAL_ROLES.map(r => r.toUpperCase()).includes(role.toUpperCase())
    );

    if (hasCreateRole) {
      return this.allow('User has role to create cases', { auditRequired: true });
    }

    return this.deny(
      `Creating cases requires one of these roles: ${CREATE_CASE_GLOBAL_ROLES.join(', ')}`,
      { auditRequired: true, requiredRoles: ['ANALYST'] as CaseRole[] }
    );
  }

  /**
   * Evaluate audit log access (restricted to OMBUDSMAN and ADMIN)
   */
  private evaluateAuditAccess(
    user: UserContext,
    caseData: Case | undefined,
    memberRecord: CaseMember | null | undefined
  ): CasePolicyDecision {
    // Global oversight roles can access audit logs
    if (this.hasAnyGlobalRole(user, [...OVERSIGHT_GLOBAL_ROLES, ...ADMIN_GLOBAL_ROLES])) {
      // Still need tenant check
      if (caseData && caseData.tenantId !== user.tenantId) {
        return this.deny('Cross-tenant audit access denied', { auditRequired: true });
      }
      return this.allow('Oversight/Admin role grants audit access', { auditRequired: true });
    }

    // Case-level OMBUDSMAN or ADMIN role
    if (memberRecord && ['OMBUDSMAN', 'ADMIN'].includes(memberRecord.role)) {
      return this.allow('Case role grants audit access', { auditRequired: true });
    }

    return this.deny(
      'Audit log access restricted to OMBUDSMAN and ADMIN roles',
      { auditRequired: true, requiredRoles: ['OMBUDSMAN', 'ADMIN'] as CaseRole[] }
    );
  }

  /**
   * Check if user has sufficient clearance for a sensitivity level
   */
  checkClearance(user: UserContext, requiredSensitivity: SensitivityLevel): boolean {
    if (!user.clearances || user.clearances.length === 0) {
      // No clearances = PUBLIC only
      return requiredSensitivity === 'PUBLIC';
    }

    const requiredLevel = SENSITIVITY_ORDER[requiredSensitivity];

    // User needs at least one clearance >= required level
    return user.clearances.some(clearance => {
      const userLevel = SENSITIVITY_ORDER[clearance];
      return userLevel !== undefined && userLevel >= requiredLevel;
    });
  }

  /**
   * Check jurisdiction alignment
   */
  checkJurisdiction(userJurisdictions: string[], resourceJurisdictions: string[]): boolean {
    if (!userJurisdictions || userJurisdictions.length === 0) {
      return false;
    }
    if (!resourceJurisdictions || resourceJurisdictions.length === 0) {
      // No restrictions on resource = allow
      return true;
    }

    // User must have at least one overlapping jurisdiction
    return userJurisdictions.some(uj =>
      resourceJurisdictions.some(rj => rj.toUpperCase() === uj.toUpperCase())
    );
  }

  /**
   * Check purpose alignment
   */
  private checkPurposeAlignment(userPurposes: string[], requiredPurposes: string[]): boolean {
    if (!requiredPurposes || requiredPurposes.length === 0) {
      return true;
    }
    if (!userPurposes || userPurposes.length === 0) {
      return false;
    }

    // User must have at least one matching purpose
    const normalizedUser = userPurposes.map(p => p.toUpperCase());
    const normalizedRequired = requiredPurposes.map(p => p.toUpperCase());

    return normalizedUser.some(up => normalizedRequired.includes(up));
  }

  /**
   * Check if user has any of the specified global roles
   */
  private hasAnyGlobalRole(user: UserContext, roles: string[]): boolean {
    if (!user.roles || user.roles.length === 0) {
      return false;
    }
    const normalizedRoles = roles.map(r => r.toUpperCase());
    return user.roles.some(ur => normalizedRoles.includes(ur.toUpperCase()));
  }

  /**
   * Check if operation is read-only
   */
  private isReadOnlyOperation(operation: CaseOperation): boolean {
    const readOps: CaseOperation[] = [
      'VIEW_CASE',
      'VIEW_AUDIT_LOG',
      'VERIFY_AUDIT_INTEGRITY',
    ];
    return readOps.includes(operation);
  }

  /**
   * Check if operation is a write/modify operation
   */
  private isWriteOperation(operation: CaseOperation): boolean {
    return !this.isReadOnlyOperation(operation);
  }

  /**
   * Determine if operation should be audited
   */
  private shouldAudit(operation: CaseOperation): boolean {
    // All operations should be audited in a governance context
    return true;
  }

  /**
   * Create an allow decision
   */
  private allow(
    reason: string,
    options: { auditRequired?: boolean } = {}
  ): CasePolicyDecision {
    return {
      allow: true,
      reason,
      auditRequired: options.auditRequired ?? true,
    };
  }

  /**
   * Create a deny decision
   */
  private deny(
    reason: string,
    options: {
      auditRequired?: boolean;
      denialReasons?: string[];
      requiredClearances?: SensitivityLevel[];
      requiredRoles?: CaseRole[];
      authorityRequired?: boolean;
    } = {}
  ): CasePolicyDecision {
    return {
      allow: false,
      reason,
      denialReasons: options.denialReasons,
      requiredClearances: options.requiredClearances,
      requiredRoles: options.requiredRoles,
      authorityRequired: options.authorityRequired,
      auditRequired: options.auditRequired ?? true,
    };
  }
}

/**
 * Singleton instance of the policy engine
 */
export const casePolicyEngine = new CasePolicyEngine();

export default CasePolicyEngine;
