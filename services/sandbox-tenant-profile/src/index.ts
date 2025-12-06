/**
 * Sandbox Tenant Profile Service
 *
 * Provides secure sandbox tenant management for research and data lab environments.
 * Ensures strict isolation from production with comprehensive policy enforcement.
 *
 * @packageDocumentation
 */

// Types
export * from './types/index.js';

// Config
export {
  SandboxConfigManager,
  getSandboxConfigManager,
  SANDBOX_PRESETS,
  type SandboxPreset,
  type ConfigValidationResult,
} from './config/SandboxConfigManager.js';

// Enforcement
export {
  SandboxEnforcer,
  getSandboxEnforcer,
  OperationType,
  type EnforcementDecision,
  type EnforcementContext,
  type DataFilter,
} from './enforcement/SandboxEnforcer.js';

// Validation
export {
  SandboxValidator,
  getSandboxValidator,
  ValidationSeverity,
  type ValidationFinding,
  type ValidationReport,
} from './validation/SandboxValidator.js';

// Utilities
export { createLogger, logger } from './utils/logger.js';
