/**
 * GraphQL Schema Governance - Main Entry Point
 *
 * Exports all governance components for easy importing
 *
 * @example
 * ```typescript
 * import {
 *   schemaRegistry,
 *   validateSchema,
 *   authDirective,
 *   createComplexityLimitRule,
 *   globalPerformanceMonitor
 * } from '@intelgraph/graphql-governance';
 * ```
 */

// Schema Registry
export {
  SchemaRegistry,
  SchemaRegistryError,
  schemaRegistry,
  type SchemaVersion,
  type SchemaChange,
  type RegisterSchemaOptions,
  type ValidationResult,
  type RegistryLogger,
} from './schema-registry.js';

// Validation Rules
export {
  SchemaValidator,
  validateSchema,
  type ValidationError,
  type ValidationResult as SchemaValidationResult,
} from './validation-rules.js';

// Authorization Directives
export {
  authDirective,
  rateLimitDirective,
  deprecatedDirective,
  createAuthContext,
  RolePermissionMapper,
  defaultRolePermissions,
  AuthorizationError,
  type AuthContext,
} from './directives/auth.js';

// Query Complexity
export {
  QueryComplexityAnalyzer,
  createComplexityLimitRule,
  createDepthLimitRule,
  paginatedComplexity,
  searchComplexity,
  defaultComplexityConfig,
  type ComplexityConfig,
  type ComplexityAnalysis,
  type ComplexityBreakdown,
  type ComplexityCalculator,
} from './complexity-calculator.js';

// Performance Monitoring
export {
  PerformanceMonitor,
  createPerformanceMonitoringPlugin,
  addPerformanceMonitoring,
  DataLoaderFactory,
  createDataLoaderContext,
  formatPerformanceReport,
  globalPerformanceMonitor,
  type ResolverPerformanceMetric,
  type PerformanceReport,
} from './performance-monitor.js';

// Documentation Generator
export {
  DocumentationGenerator,
  generateDocumentation,
  type DocumentationOptions,
  type TypeDocumentation,
  type FieldDocumentation,
} from './documentation-generator.js';

// Federation (optional - may not be installed)
export * from './federation/gateway.js';
export * from './federation/subgraph.js';
