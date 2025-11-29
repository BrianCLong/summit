// Types
export * from './types/plugin.js';

// Core
export { PluginManager } from './core/PluginManager.js';
export { DefaultPluginLoader } from './core/PluginLoader.js';
export { PluginSandbox, type ResourceUsage } from './core/PluginSandbox.js';
export { DefaultDependencyResolver } from './core/DependencyResolver.js';

// Security
export {
  PluginSecurity,
  type ScanResult,
  type Vulnerability,
  type PermissionPolicy,
  type PermissionContext,
  type PermissionCheckResult,
  type ResourceQuota,
} from './security/PluginSecurity.js';

// Authorization
export {
  type AuthorizationProvider,
  type AuthorizationRequest,
  type AuthorizationContext,
  type AuthorizationResult,
  type Obligation,
  OPAAuthorizationProvider,
  DevelopmentAuthorizationProvider,
  InMemoryAuthorizationProvider,
} from './auth/AuthorizationProvider.js';

// Resource Management
export {
  QuotaEnforcer,
  CPUTimeTracker,
  type ResourceUsageTracker,
  type QuotaViolation,
} from './resources/QuotaEnforcer.js';

// Extensions
export { BaseExtension } from './extensions/BaseExtension.js';
export {
  AnalyticsExtension,
  type AnalyticsInput,
  type AnalyticsResult,
  type AnalyticsMetadata,
  type AnalyticsData,
  type Insight,
  type Visualization,
  type Entity,
  type Relationship,
} from './extensions/AnalyticsExtension.js';
export {
  VisualizationExtension,
  type VisualizationInput,
  type VisualizationOutput,
  type VisualizationMetadata,
  type VisualizationConfig,
  type ComponentConfig,
} from './extensions/VisualizationExtension.js';
export {
  ConnectorExtension,
  type ConnectionConfig,
  type ConnectionTestResult,
  type FetchRequest,
  type FetchResult,
  type ConnectorMetadata,
  type DataSchema,
} from './extensions/ConnectorExtension.js';

// Events
export { PluginEventBus } from './events/PluginEventBus.js';

// Registry
export { InMemoryPluginRegistry } from './registry/InMemoryPluginRegistry.js';
