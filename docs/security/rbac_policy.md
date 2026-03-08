# Investigation Management and Export RBAC Policy

**Version:** 1.0
**Last Updated:** 2026-01-30
**Related Issue:** #11565 (Investigation Export Permissions)

## Overview

This document defines Role-Based Access Control (RBAC) policies for investigation management and data export operations in the Summit platform. These policies ensure appropriate separation of duties, least privilege access, and compliance with security governance requirements.

## Scope

This RBAC policy governs:
- Investigation lifecycle management (create, update, close, archive)
- Investigation data access and viewing
- Investigation export operations
- Export configuration management
- Evidence and finding management within investigations

## Role Definitions

### 1. **VIEWER** (`viewer`)
- **Purpose:** Read-only access for stakeholders and observers
- **Clearance Level:** Public to Confidential
- **Description:** Can view investigations within their scope but cannot modify or export data

### 2. **ANALYST** (`analyst`)
- **Purpose:** Operational investigation work
- **Clearance Level:** Public to Secret
- **Description:** Can create, update, and collaborate on investigations with limited export capabilities

### 3. **LEAD** (`lead`)
- **Purpose:** Investigation leadership and management
- **Clearance Level:** Public to Secret
- **Description:** Full investigation management with enhanced export capabilities

### 4. **ADMIN** (`admin`)
- **Purpose:** Platform administration and oversight
- **Clearance Level:** All levels
- **Description:** Full administrative access including export configuration and cross-tenant operations

### 5. **SUPERADMIN** (`superadmin`)
- **Purpose:** System-level administration
- **Clearance Level:** All levels including TS/SCI
- **Description:** Unrestricted access for platform operators and security team

## Investigation Management Permissions Matrix

| Action | VIEWER | ANALYST | LEAD | ADMIN | SUPERADMIN |
|--------|--------|---------|------|-------|------------|
| **investigation:view** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **investigation:create** | ✗ | ✓ | ✓ | ✓ | ✓ |
| **investigation:update** | ✗ | ✓¹ | ✓ | ✓ | ✓ |
| **investigation:close** | ✗ | ✗ | ✓ | ✓ | ✓ |
| **investigation:archive** | ✗ | ✗ | ✓ | ✓ | ✓ |
| **investigation:delete** | ✗ | ✗ | ✗ | ✗ | ✓² |

**Notes:**
1. Analysts can only update investigations they created or are assigned to
2. Deletion requires additional MFA and audit trail justification

## Evidence and Findings Permissions

| Action | VIEWER | ANALYST | LEAD | ADMIN | SUPERADMIN |
|--------|--------|---------|------|-------|------------|
| **evidence:view** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **evidence:add** | ✗ | ✓ | ✓ | ✓ | ✓ |
| **evidence:update** | ✗ | ✓³ | ✓ | ✓ | ✓ |
| **evidence:delete** | ✗ | ✗ | ✗ | ✗ | ✓ |
| **finding:view** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **finding:create** | ✗ | ✓ | ✓ | ✓ | ✓ |
| **finding:update** | ✗ | ✓⁴ | ✓ | ✓ | ✓ |
| **finding:verify** | ✗ | ✗ | ✓ | ✓ | ✓ |

**Notes:**
3. Analysts can only update evidence they added
4. Analysts can only update findings they created; verification requires LEAD+

## Export Permissions Matrix

| Export Action | VIEWER | ANALYST | LEAD | ADMIN | SUPERADMIN |
|---------------|--------|---------|------|-------|------------|
| **export:investigation:json** | ✗ | ✓⁵ | ✓ | ✓ | ✓ |
| **export:investigation:csv** | ✗ | ✓⁵ | ✓ | ✓ | ✓ |
| **export:investigation:pdf** | ✗ | ✓⁵ | ✓ | ✓ | ✓ |
| **export:investigation:full** | ✗ | ✗ | ✓⁶ | ✓ | ✓ |
| **export:config:view** | ✗ | ✓ | ✓ | ✓ | ✓ |
| **export:config:create** | ✗ | ✗ | ✗ | ✓ | ✓ |
| **export:config:update** | ✗ | ✗ | ✗ | ✓ | ✓ |
| **export:config:delete** | ✗ | ✗ | ✗ | ✓ | ✓ |
| **export:audit:view** | ✗ | ✗ | ✓ | ✓ | ✓ |

**Notes:**
5. Analysts can export investigations they created or are assigned to; exports are k-anonymized (k≥5)
6. Full exports include all PII, evidence metadata, and audit trails; requires reason and legal basis

## Export Configuration Management

Export configurations define templates, formats, and data retention policies for investigation exports.

### Configuration Permissions

- **View Configurations:** ANALYST, LEAD, ADMIN, SUPERADMIN
- **Create/Modify Configurations:** ADMIN, SUPERADMIN only
- **Delete Configurations:** SUPERADMIN only (requires justification)

### Export Controls

All exports must comply with:
1. **K-Anonymity Enforcement:** Minimum k=5 for aggregate data (configurable)
2. **Reason Required:** Exports require `reasonForAccess` and `legalBasis`
3. **Audit Logging:** All exports logged to immutable audit trail
4. **Data Classification:** Exports filtered by user clearance level
5. **Tenant Isolation:** Cross-tenant exports prohibited except for global admins

## Attribute-Based Access Control (ABAC) Extensions

In addition to role-based permissions, the following attributes modify access:

### Clearance Level
- **Public:** All roles
- **Internal:** All roles (default tenant data)
- **Confidential:** ANALYST+
- **Secret:** LEAD+ or ANALYST with explicit grant
- **Top Secret/SCI:** SUPERADMIN only

### Investigation Attributes
- **Classification:** User clearance must meet or exceed investigation classification
- **Compartment:** User must have explicit compartment access
- **Assigned Users:** Analysts restricted to assigned investigations unless global role

### Temporal Restrictions
- **Export Windows:** Exports of CONFIDENTIAL+ data restricted to business hours (configurable)
- **MFA Requirement:** Exports of SECRET+ require fresh MFA (< 15 min)

## Policy Enforcement

### Implementation
- RBAC checks enforced at GraphQL resolver and REST API middleware layers
- Permission validation using `EnhancedGovernanceRBACService`
- OPA (Open Policy Agent) integration for complex policy evaluation
- JWT tokens include role and permission claims

### Audit Requirements
- All denied access attempts logged with reason
- Successful exports logged with user, timestamp, investigation ID, format
- Monthly access reviews required for LEAD+ roles
- Quarterly certification of SUPERADMIN access

### Violations
- Unauthorized access attempts trigger security alerts
- Repeated violations result in automatic account suspension
- All violations reviewed by security team within 24 hours

## Testing Requirements

All RBAC policies must be validated with automated tests tagged `@rbac_critical`:

1. **Role-Action Matrix Tests:** Verify each role can/cannot perform each action
2. **Tenant Isolation Tests:** Verify cross-tenant access controls
3. **Clearance Level Tests:** Verify classification-based filtering
4. **Export Audit Tests:** Verify all exports are logged
5. **MFA Step-Up Tests:** Verify MFA requirements for sensitive operations

See `/server/__tests__/rbac/investigation-export-rbac.test.ts` for reference implementation.

## Compliance Mapping

| Requirement | Control | Evidence |
|-------------|---------|----------|
| SOC 2 CC6.1 | Logical access controls | RBAC policy + audit logs |
| SOC 2 CC6.2 | Prior to access authorization | Pre-authorization checks in middleware |
| SOC 2 CC6.3 | Provisioning/deprovisioning | Role assignment audit trail |
| NIST 800-53 AC-3 | Access Enforcement | Permission checks at resolver layer |
| NIST 800-53 AC-6 | Least Privilege | Role-based permission sets |
| GDPR Art 32 | Data Protection | Export k-anonymity + classification controls |
| FedRAMP AC-2 | Account Management | Multi-tenant RBAC + clearance levels |

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-30 | Auth Agent | Initial policy creation for issue #11565 |

## Related Documentation

- `/server/src/authz/permissions.ts` - Core permission definitions
- `/server/src/services/EnhancedGovernanceRBACService.ts` - RBAC service implementation
- `/server/src/cases/README.md` - Case management and audit workflow
- `/docs/security/THREAT_MODEL.md` - Platform threat model
- `/server/__tests__/rbac/` - RBAC verification tests

## Approval

This policy requires approval from:
- [ ] Security Team Lead
- [ ] Compliance Officer
- [ ] Engineering Manager
- [ ] Product Owner

**Review Cycle:** Quarterly or upon material changes to investigation workflow
