/**
 * @package authz-core
 *
 * Comprehensive multi-tenant authorization library for IntelGraph
 *
 * Provides:
 * - Central authorization service with isAllowed() API
 * - Warrant lifecycle management
 * - License registry and enforcement
 * - RBAC + ABAC policy evaluation
 * - TOS acceptance tracking
 * - Comprehensive audit logging
 */

// Core services
export { AuthorizationService } from './AuthorizationService';
export { WarrantService } from './WarrantService';
export { LicenseService } from './LicenseService';

// Types and interfaces
export type {
  // Authorization
  AuthorizationInput,
  AuthorizationDecision,
  AuthorizationConfig,
  AuthorizationContext,
  AuthorizationAuditEvent,

  // Subject and Resource
  Subject,
  Resource,
  Action,

  // Warrants
  Warrant,
  WarrantType,
  WarrantStatus,
  WarrantValidationResult,

  // Licenses
  License,
  LicenseType,
  LicenseStatus,
  LicenseValidationResult,
  LicenseCondition,

  // Decision components
  Obligation,
  Condition,
  DecisionTrace,
} from './types';

// Errors
export {
  AuthorizationError,
  WarrantError,
  LicenseError,
} from './types';

// Warrant service types
export type {
  CreateWarrantInput,
  BindWarrantInput,
  ApproveWarrantInput,
  WarrantUsageInput,
} from './WarrantService';

// License service types
export type {
  CreateLicenseInput,
  AssignLicenseInput,
  AcceptTOSInput,
  LicenseEnforcementInput,
} from './LicenseService';
