/**
 * Safe Analytics Workbench
 *
 * Governed environments for exploration and analysis within CompanyOS.
 * Provides analysts and data scientists with safe, reproducible, and
 * policy-compliant data access.
 *
 * @packageDocumentation
 */

// Models
export * from './models/types';
export * from './models/governance';

// Services
export { WorkspaceService } from './services/WorkspaceService';
export type {
  WorkspaceServiceConfig,
  WorkspaceContext,
  WorkspaceRepository,
  ApprovalService,
  AuditService,
} from './services/WorkspaceService';

// Sandbox
export {
  SandboxManager,
  generateNetworkPolicy,
  generateResourceQuota,
} from './sandbox/SandboxManager';
export type {
  SandboxConfig,
  SandboxInstance,
  SandboxStatus,
  SandboxMetrics,
  SandboxEvent,
  OrchestratorClient,
  PolicyEnforcer,
} from './sandbox/SandboxManager';

// Utilities
export { logger, LogLevel } from './utils/logger';

// Version
export const VERSION = '0.1.0';
