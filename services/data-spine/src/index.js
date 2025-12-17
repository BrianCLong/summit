const { SchemaRegistry } = require('./schemaRegistry');
const { LineageSink } = require('./lineageSink');
const {
  applyPolicies,
  reversePolicies,
  enforceResidency,
  getMetadata,
} = require('./policyHooks');
const {
  AuditTrail,
  AUDIT_EVENT_TYPES,
  ACTOR_TYPES,
  SEVERITY_LEVELS,
} = require('./auditTrail');
const {
  AccessControl,
  PERMISSIONS,
  BUILT_IN_ROLES,
  CLASSIFICATION_CLEARANCES,
} = require('./accessControl');
const {
  ComplianceEngine,
  COMPLIANCE_STANDARDS,
} = require('./complianceEngine');
const {
  GovernanceEventEmitter,
  EVENT_TYPES,
} = require('./governanceEvents');
const {
  RetentionManager,
  RETENTION_POLICIES,
  DELETION_METHODS,
  ARCHIVE_TIERS,
} = require('./retentionManager');

module.exports = {
  // Core functionality
  SchemaRegistry,
  LineageSink,

  // Policy hooks
  policy: {
    applyPolicies,
    reversePolicies,
    enforceResidency,
    getMetadata,
  },

  // Governance modules
  governance: {
    AuditTrail,
    AccessControl,
    ComplianceEngine,
    GovernanceEventEmitter,
    RetentionManager,
  },

  // Constants
  constants: {
    AUDIT_EVENT_TYPES,
    ACTOR_TYPES,
    SEVERITY_LEVELS,
    PERMISSIONS,
    BUILT_IN_ROLES,
    CLASSIFICATION_CLEARANCES,
    COMPLIANCE_STANDARDS,
    EVENT_TYPES,
    RETENTION_POLICIES,
    DELETION_METHODS,
    ARCHIVE_TIERS,
  },
};
