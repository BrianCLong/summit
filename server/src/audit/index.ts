/**
 * Audit Module - Comprehensive Audit System
 *
 * This module provides immutable, tamper-proof audit logging with:
 * - HMAC-SHA256 signatures for tamper detection
 * - Hash chain integrity (blockchain-style)
 * - SOC2, GDPR, HIPAA, ISO27001 compliance support
 * - TimescaleDB hypertable partitioning
 * - Before/after mutation tracking
 * - Multi-tenant isolation
 * - Forensic analysis capabilities
 *
 * @module audit
 * @see /docs/audit/audit-system-design.md
 */

// Core types and interfaces
export {
  // Event types
  type AuditEventType,
  type AuditLevel,
  type ComplianceFramework,
  type DataClassification,
  type ResourceType,

  // Core interfaces
  type AuditEvent,
  type AuditQuery,
  type ComplianceReport,
  type ForensicAnalysis,
  type IntegrityVerification,
  type AuditServiceConfig,
  type WriteOnceEntry,

  // Validation schemas
  AuditEventSchema,
} from './audit-types';

// Signing utilities
export {
  calculateEventHash,
  signEvent,
  verifyEventSignature,
  createHashChain,
  verifyHashChain,
  generateSigningKey,
  type SigningConfig,
  type HashChainResult,
} from './audit-signing';

// Re-export existing AdvancedAuditSystem for backwards compatibility
export { AdvancedAuditSystem } from './advanced-audit-system';
