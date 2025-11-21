/**
 * API Versioning Module
 * Comprehensive API versioning system for IntelGraph
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

export {
  versionRegistry,
  type APIVersion,
  type ChangelogEntry,
  type VersionCompatibility,
} from './version-registry.js';

export {
  versionMiddleware,
  requireVersion,
  blockDeprecatedVersions,
  getVersionContext,
  type VersionContext,
} from './version-middleware.js';

export {
  compatibilityLayer,
  type TransformContext,
  type Transformer,
  type TransformRule,
  type GraphQLTransformer,
} from './compatibility-layer.js';

export {
  schemaVersionManager,
  versionDirectives,
  type VersionedSchema,
  type SchemaDiff,
  type FieldChange,
  type BreakingChange,
} from './schema-versioning.js';

export {
  documentationGenerator,
  type APIDocumentation,
  type EndpointDoc,
  type MigrationGuide,
  type CodeExample,
} from './documentation-generator.js';

export {
  changelogAutomation,
  type ChangelogConfig,
  type GeneratedChangelog,
} from './changelog-automation.js';
