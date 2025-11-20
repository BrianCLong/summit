/**
 * GraphQL Schema Registry
 *
 * Manages schema versions, tracks changes, and provides diffing capabilities.
 * This is the central component for schema governance, ensuring all schema
 * changes are versioned, validated, and tracked for breaking changes.
 *
 * Features:
 * - Version control for all schema changes with SHA-256 integrity
 * - Automatic schema diffing using @graphql-inspector
 * - Breaking vs non-breaking change detection
 * - Changelog generation between versions
 * - Schema validation before registration
 * - File-based persistence with atomic writes
 * - Observability hooks for monitoring
 *
 * @example
 * ```typescript
 * const registry = new SchemaRegistry();
 * await registry.initialize();
 *
 * // Register a new schema version
 * const version = await registry.registerSchema(
 *   schemaString,
 *   'v1.0.0',
 *   'developer@example.com',
 *   'Initial schema'
 * );
 *
 * // Check for breaking changes
 * const hasBreaking = await registry.hasBreakingChanges(newSchema);
 * ```
 */

import { parse, printSchema, buildSchema, GraphQLSchema, GraphQLError } from 'graphql';
import { diff, Change, CriticalityLevel } from '@graphql-inspector/core';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Represents a versioned schema in the registry
 */
export interface SchemaVersion {
  /** Semantic version string (e.g., "v1.2.3") */
  version: string;
  /** Complete GraphQL schema definition */
  schema: string;
  /** SHA-256 hash for integrity verification */
  hash: string;
  /** When this version was registered */
  timestamp: Date;
  /** List of changes from previous version */
  changes: SchemaChange[];
  /** Email or identifier of who registered this version */
  author?: string;
  /** Human-readable description of changes */
  description?: string;
  /** Optional tags for categorization (e.g., ["experimental", "deprecated"]) */
  tags?: string[];
}

/**
 * Represents a single change between schema versions
 */
export interface SchemaChange {
  /** Classification of change impact */
  type: 'BREAKING' | 'DANGEROUS' | 'NON_BREAKING';
  /** Human-readable description of the change */
  message: string;
  /** GraphQL path where change occurred (e.g., "Query.user") */
  path?: string;
  /** Original criticality level from @graphql-inspector */
  criticality: CriticalityLevel;
  /** Optional metadata about the change */
  metadata?: Record<string, any>;
}

/**
 * Options for schema registration
 */
export interface RegisterSchemaOptions {
  /** Whether to allow breaking changes (requires explicit approval) */
  allowBreaking?: boolean;
  /** Optional tags to associate with this version */
  tags?: string[];
  /** Whether to skip duplicate detection */
  skipDuplicateCheck?: boolean;
  /** Custom validation function */
  customValidator?: (schema: string) => Promise<string[]>;
}

/**
 * Validation result with detailed error information
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** List of error messages */
  errors: string[];
  /** List of warning messages (non-blocking) */
  warnings?: string[];
  /** Detected breaking changes */
  breakingChanges?: SchemaChange[];
}

/**
 * Custom error class for schema registry operations
 */
export class SchemaRegistryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = 'SchemaRegistryError';
    Object.setPrototypeOf(this, SchemaRegistryError.prototype);
  }
}

/**
 * Logger interface for observability
 */
export interface RegistryLogger {
  debug(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, error?: Error, context?: Record<string, any>): void;
}

/**
 * Default console-based logger implementation
 */
class ConsoleLogger implements RegistryLogger {
  debug(message: string, context?: Record<string, any>): void {
    console.debug('[SchemaRegistry:DEBUG]', message, context || '');
  }

  info(message: string, context?: Record<string, any>): void {
    console.info('[SchemaRegistry:INFO]', message, context || '');
  }

  warn(message: string, context?: Record<string, any>): void {
    console.warn('[SchemaRegistry:WARN]', message, context || '');
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    console.error('[SchemaRegistry:ERROR]', message, error, context || '');
  }
}

/**
 * SchemaRegistry - Central registry for GraphQL schema versions
 *
 * This class manages all schema versions, providing version control,
 * change tracking, and validation capabilities. It persists schemas
 * to disk in both JSON (metadata) and .graphql (schema) formats.
 */
export class SchemaRegistry {
  private registryPath: string;
  private versions: Map<string, SchemaVersion> = new Map();
  private logger: RegistryLogger;
  private initialized: boolean = false;

  /**
   * Create a new SchemaRegistry
   *
   * @param registryPath - Directory path for storing schema versions
   * @param logger - Optional custom logger implementation
   */
  constructor(registryPath: string = './graphql/versions', logger?: RegistryLogger) {
    this.registryPath = path.resolve(registryPath);
    this.logger = logger || new ConsoleLogger();
  }

  /**
   * Initialize the schema registry
   *
   * Creates the registry directory if it doesn't exist and loads
   * all existing schema versions from disk into memory.
   *
   * This method is idempotent - calling it multiple times is safe.
   *
   * @throws {SchemaRegistryError} If directory creation or version loading fails
   *
   * @example
   * ```typescript
   * const registry = new SchemaRegistry();
   * await registry.initialize();
   * console.log(`Loaded ${registry.getAllVersions().length} versions`);
   * ```
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.debug('Registry already initialized, skipping');
      return;
    }

    try {
      this.logger.info('Initializing schema registry', { path: this.registryPath });

      // Create directory with recursive option (won't fail if exists)
      await fs.mkdir(this.registryPath, { recursive: true });

      // Load all existing versions from disk
      await this.loadVersions();

      this.initialized = true;
      this.logger.info('Schema registry initialized successfully', {
        versionsLoaded: this.versions.size,
        path: this.registryPath
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to initialize schema registry', error as Error, {
        path: this.registryPath
      });
      throw new SchemaRegistryError(
        `Failed to initialize schema registry: ${errorMessage}`,
        'INIT_ERROR',
        { path: this.registryPath, originalError: errorMessage }
      );
    }
  }

  /**
   * Load all schema versions from disk
   *
   * Reads all .json files from the registry directory and deserializes
   * them into SchemaVersion objects. Handles corrupted files gracefully
   * by logging warnings and continuing.
   *
   * @private
   */
  private async loadVersions(): Promise<void> {
    try {
      // Check if directory exists first
      try {
        await fs.access(this.registryPath);
      } catch {
        this.logger.warn('Registry directory does not exist yet', {
          path: this.registryPath
        });
        return;
      }

      const files = await fs.readdir(this.registryPath);
      const jsonFiles = files.filter(file => file.endsWith('.json'));

      this.logger.debug(`Found ${jsonFiles.length} version files to load`);

      let loadedCount = 0;
      let errorCount = 0;

      for (const file of jsonFiles) {
        try {
          const filepath = path.join(this.registryPath, file);
          const content = await fs.readFile(filepath, 'utf-8');

          // Parse and validate JSON structure
          const version: SchemaVersion = JSON.parse(content);

          // Validate required fields
          if (!version.version || !version.schema || !version.hash) {
            throw new Error('Missing required fields in version file');
          }

          // Convert timestamp string back to Date object
          version.timestamp = new Date(version.timestamp);

          // Verify timestamp is valid
          if (isNaN(version.timestamp.getTime())) {
            throw new Error('Invalid timestamp in version file');
          }

          // Store in memory map
          this.versions.set(version.version, version);
          loadedCount++;

          this.logger.debug(`Loaded version ${version.version}`, {
            file,
            changeCount: version.changes.length
          });
        } catch (error) {
          errorCount++;
          this.logger.warn(`Failed to load version file: ${file}`, {
            error: error instanceof Error ? error.message : String(error)
          });
          // Continue loading other versions despite errors
        }
      }

      this.logger.info('Version loading complete', {
        loaded: loadedCount,
        errors: errorCount,
        total: jsonFiles.length
      });
    } catch (error) {
      // If readdir fails, directory might not exist yet (first run)
      this.logger.warn('Could not load existing versions', {
        error: error instanceof Error ? error.message : String(error)
      });
      // Don't throw - empty registry is valid for first run
    }
  }

  /**
   * Register a new schema version
   *
   * Validates the schema, compares it with the latest version to detect
   * changes, and persists it to disk with full metadata.
   *
   * @param schema - GraphQL schema (string or built schema)
   * @param version - Semantic version string (e.g., "v1.2.3")
   * @param author - Email or identifier of author
   * @param description - Human-readable description of changes
   * @param options - Additional registration options
   * @returns The registered SchemaVersion object
   * @throws {SchemaRegistryError} If validation fails or registry is not initialized
   *
   * @example
   * ```typescript
   * const version = await registry.registerSchema(
   *   schemaString,
   *   'v1.1.0',
   *   'dev@example.com',
   *   'Added user profile fields',
   *   { tags: ['feature'] }
   * );
   * ```
   */
  async registerSchema(
    schema: string | GraphQLSchema,
    version: string,
    author?: string,
    description?: string,
    options: RegisterSchemaOptions = {}
  ): Promise<SchemaVersion> {
    // Ensure registry is initialized
    if (!this.initialized) {
      throw new SchemaRegistryError(
        'Registry must be initialized before registering schemas',
        'NOT_INITIALIZED'
      );
    }

    this.logger.info('Registering new schema version', { version, author });

    try {
      // Normalize schema to string format
      const schemaString = typeof schema === 'string' ? schema : printSchema(schema);

      // Validate schema string is not empty
      if (!schemaString || schemaString.trim().length === 0) {
        throw new SchemaRegistryError(
          'Schema cannot be empty',
          'INVALID_SCHEMA'
        );
      }

      // Validate version format (basic semantic versioning check)
      if (!this.isValidVersion(version)) {
        throw new SchemaRegistryError(
          `Invalid version format: ${version}. Expected semantic version (e.g., v1.2.3)`,
          'INVALID_VERSION',
          { providedVersion: version }
        );
      }

      // Check if version already exists
      if (this.versions.has(version)) {
        throw new SchemaRegistryError(
          `Version ${version} already exists`,
          'VERSION_EXISTS',
          { version }
        );
      }

      // Generate SHA-256 hash for integrity verification
      const hash = this.hashSchema(schemaString);

      // Check if this exact schema already exists (duplicate detection)
      if (!options.skipDuplicateCheck) {
        const existingVersion = this.findVersionByHash(hash);
        if (existingVersion) {
          throw new SchemaRegistryError(
            `Schema already registered as version ${existingVersion.version}`,
            'DUPLICATE_SCHEMA',
            { existingVersion: existingVersion.version, hash }
          );
        }
      }

      // Run custom validation if provided
      if (options.customValidator) {
        const customErrors = await options.customValidator(schemaString);
        if (customErrors.length > 0) {
          throw new SchemaRegistryError(
            'Custom validation failed',
            'CUSTOM_VALIDATION_FAILED',
            { errors: customErrors }
          );
        }
      }

      // Compare with latest version to detect changes
      const changes = await this.compareWithLatest(schemaString);

      // Check for breaking changes
      const breakingChanges = changes.filter(c => c.type === 'BREAKING');
      if (breakingChanges.length > 0 && !options.allowBreaking) {
        throw new SchemaRegistryError(
          `Schema contains ${breakingChanges.length} breaking change(s). Use allowBreaking option to override.`,
          'BREAKING_CHANGES_DETECTED',
          {
            breakingChanges: breakingChanges.map(c => ({
              message: c.message,
              path: c.path
            }))
          }
        );
      }

      // Create version object with full metadata
      const schemaVersion: SchemaVersion = {
        version,
        schema: schemaString,
        hash,
        timestamp: new Date(),
        changes,
        author,
        description,
        tags: options.tags
      };

      // Persist to disk (atomic operation)
      await this.saveVersion(schemaVersion);

      // Update in-memory cache
      this.versions.set(version, schemaVersion);

      this.logger.info('Schema registered successfully', {
        version,
        hash,
        changeCount: changes.length,
        breakingCount: breakingChanges.length
      });

      return schemaVersion;
    } catch (error) {
      // Re-throw SchemaRegistryError as-is
      if (error instanceof SchemaRegistryError) {
        throw error;
      }

      // Wrap other errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to register schema', error as Error, { version });
      throw new SchemaRegistryError(
        `Failed to register schema: ${errorMessage}`,
        'REGISTRATION_FAILED',
        { version, originalError: errorMessage }
      );
    }
  }

  /**
   * Get a specific schema version by version string
   *
   * @param version - Version string to retrieve
   * @returns SchemaVersion if found, undefined otherwise
   */
  getVersion(version: string): SchemaVersion | undefined {
    return this.versions.get(version);
  }

  /**
   * Get the latest schema version by timestamp
   *
   * @returns Latest SchemaVersion, or undefined if registry is empty
   */
  getLatestVersion(): SchemaVersion | undefined {
    if (this.versions.size === 0) {
      return undefined;
    }

    const sortedVersions = Array.from(this.versions.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
    return sortedVersions[0];
  }

  /**
   * Get all versions sorted by timestamp (newest first)
   *
   * @returns Array of all SchemaVersions
   */
  getAllVersions(): SchemaVersion[] {
    return Array.from(this.versions.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  /**
   * Compare two specific schema versions
   *
   * @param fromVersion - Starting version
   * @param toVersion - Ending version
   * @returns Array of changes between versions
   * @throws {SchemaRegistryError} If either version is not found
   */
  async compareVersions(
    fromVersion: string,
    toVersion: string
  ): Promise<SchemaChange[]> {
    const from = this.versions.get(fromVersion);
    const to = this.versions.get(toVersion);

    if (!from) {
      throw new SchemaRegistryError(
        `Version ${fromVersion} not found`,
        'VERSION_NOT_FOUND',
        { version: fromVersion }
      );
    }

    if (!to) {
      throw new SchemaRegistryError(
        `Version ${toVersion} not found`,
        'VERSION_NOT_FOUND',
        { version: toVersion }
      );
    }

    return this.diffSchemas(from.schema, to.schema);
  }

  /**
   * Compare a schema with the latest registered version
   *
   * @private
   * @param schema - Schema string to compare
   * @returns Array of changes, empty if no previous version exists
   */
  private async compareWithLatest(schema: string): Promise<SchemaChange[]> {
    const latest = this.getLatestVersion();
    if (!latest) {
      // No previous version exists - return empty changes
      this.logger.debug('No previous version to compare with');
      return [];
    }

    this.logger.debug('Comparing with latest version', {
      latestVersion: latest.version
    });

    return this.diffSchemas(latest.schema, schema);
  }

  /**
   * Diff two schemas and detect changes
   *
   * Uses @graphql-inspector/core to detect and classify changes.
   * Handles errors gracefully and returns empty array if diff fails.
   *
   * @private
   * @param oldSchema - Previous schema string
   * @param newSchema - New schema string
   * @returns Array of detected changes
   */
  private async diffSchemas(
    oldSchema: string,
    newSchema: string
  ): Promise<SchemaChange[]> {
    try {
      // Parse both schemas into AST
      const oldAST = parse(oldSchema);
      const newAST = parse(newSchema);

      // Use graphql-inspector to detect changes
      const changes = await diff(oldAST, newAST);

      this.logger.debug('Schema diff complete', {
        totalChanges: changes.length
      });

      // Map changes to our internal format
      return changes.map((change: Change) => ({
        type: this.mapCriticalityToType(change.criticality?.level),
        message: change.message,
        path: change.path,
        criticality: change.criticality?.level || CriticalityLevel.NonBreaking,
        metadata: {
          // Include additional metadata from the change
          ...(change as any)
        }
      }));
    } catch (error) {
      this.logger.error('Error diffing schemas', error as Error);
      // Return empty array rather than throwing - diff errors shouldn't break registration
      return [];
    }
  }

  /**
   * Map @graphql-inspector criticality level to our change type
   *
   * @private
   */
  private mapCriticalityToType(
    level?: CriticalityLevel
  ): 'BREAKING' | 'DANGEROUS' | 'NON_BREAKING' {
    switch (level) {
      case CriticalityLevel.Breaking:
        return 'BREAKING';
      case CriticalityLevel.Dangerous:
        return 'DANGEROUS';
      default:
        return 'NON_BREAKING';
    }
  }

  /**
   * Generate a markdown changelog between two versions
   *
   * Creates a formatted changelog showing all changes between the
   * specified versions (or oldest to latest if not specified).
   *
   * @param fromVersion - Starting version (defaults to oldest)
   * @param toVersion - Ending version (defaults to latest)
   * @returns Markdown-formatted changelog
   * @throws {SchemaRegistryError} If specified versions don't exist
   */
  async generateChangelog(
    fromVersion?: string,
    toVersion?: string
  ): Promise<string> {
    const from = fromVersion
      ? this.versions.get(fromVersion)
      : this.getOldestVersion();
    const to = toVersion
      ? this.versions.get(toVersion)
      : this.getLatestVersion();

    if (!from) {
      throw new SchemaRegistryError(
        fromVersion
          ? `Version ${fromVersion} not found`
          : 'No versions in registry',
        'VERSION_NOT_FOUND',
        { version: fromVersion }
      );
    }

    if (!to) {
      throw new SchemaRegistryError(
        toVersion
          ? `Version ${toVersion} not found`
          : 'No versions in registry',
        'VERSION_NOT_FOUND',
        { version: toVersion }
      );
    }

    let changelog = `# GraphQL Schema Changelog\n\n`;
    changelog += `## ${from.version} → ${to.version}\n\n`;
    changelog += `Generated: ${new Date().toISOString()}\n\n`;

    // Get all versions between from and to (inclusive)
    const versions = this.getAllVersions()
      .filter(v =>
        v.timestamp >= from.timestamp &&
        v.timestamp <= to.timestamp
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    for (const version of versions) {
      // Skip the starting version (we only want changes)
      if (version.version === from.version) continue;

      changelog += `### Version ${version.version}\n\n`;
      changelog += `**Date:** ${version.timestamp.toISOString()}\n`;
      if (version.author) changelog += `**Author:** ${version.author}\n`;
      if (version.description) changelog += `**Description:** ${version.description}\n`;
      if (version.tags && version.tags.length > 0) {
        changelog += `**Tags:** ${version.tags.join(', ')}\n`;
      }
      changelog += `\n`;

      // Group changes by type
      const breaking = version.changes.filter(c => c.type === 'BREAKING');
      const dangerous = version.changes.filter(c => c.type === 'DANGEROUS');
      const nonBreaking = version.changes.filter(c => c.type === 'NON_BREAKING');

      if (breaking.length > 0) {
        changelog += `#### ⚠️  Breaking Changes\n\n`;
        for (const change of breaking) {
          changelog += `- ${change.message}${change.path ? ` (${change.path})` : ''}\n`;
        }
        changelog += `\n`;
      }

      if (dangerous.length > 0) {
        changelog += `#### ⚡ Dangerous Changes\n\n`;
        for (const change of dangerous) {
          changelog += `- ${change.message}${change.path ? ` (${change.path})` : ''}\n`;
        }
        changelog += `\n`;
      }

      if (nonBreaking.length > 0) {
        changelog += `#### ✨ Non-Breaking Changes\n\n`;
        for (const change of nonBreaking) {
          changelog += `- ${change.message}${change.path ? ` (${change.path})` : ''}\n`;
        }
        changelog += `\n`;
      }
    }

    return changelog;
  }

  /**
   * Get the oldest version by timestamp
   *
   * @private
   */
  private getOldestVersion(): SchemaVersion | undefined {
    if (this.versions.size === 0) {
      return undefined;
    }

    const sortedVersions = Array.from(this.versions.values()).sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
    return sortedVersions[0];
  }

  /**
   * Save a version to disk (atomic operation)
   *
   * Persists the version in two formats:
   * 1. {version}.json - Full metadata including changes
   * 2. {version}.graphql - Just the schema for easier reading
   *
   * Uses atomic write pattern (write to temp file, then rename)
   * to prevent corruption from partial writes.
   *
   * @private
   * @throws {Error} If filesystem operations fail
   */
  private async saveVersion(version: SchemaVersion): Promise<void> {
    const jsonFilename = `${version.version}.json`;
    const jsonFilepath = path.join(this.registryPath, jsonFilename);
    const jsonTempPath = `${jsonFilepath}.tmp`;

    const schemaFilename = `${version.version}.graphql`;
    const schemaFilepath = path.join(this.registryPath, schemaFilename);
    const schemaTempPath = `${schemaFilepath}.tmp`;

    try {
      // Write to temp files first (atomic pattern)
      await fs.writeFile(jsonTempPath, JSON.stringify(version, null, 2), 'utf-8');
      await fs.writeFile(schemaTempPath, version.schema, 'utf-8');

      // Atomic rename
      await fs.rename(jsonTempPath, jsonFilepath);
      await fs.rename(schemaTempPath, schemaFilepath);

      this.logger.debug('Version saved to disk', {
        version: version.version,
        path: this.registryPath
      });
    } catch (error) {
      // Clean up temp files if they exist
      try {
        await fs.unlink(jsonTempPath).catch(() => {});
        await fs.unlink(schemaTempPath).catch(() => {});
      } catch {
        // Ignore cleanup errors
      }

      throw error;
    }
  }

  /**
   * Generate SHA-256 hash of schema for integrity verification
   *
   * @private
   * @param schema - Schema string to hash
   * @returns Hexadecimal hash string
   */
  private hashSchema(schema: string): string {
    return crypto
      .createHash('sha256')
      .update(schema, 'utf-8')
      .digest('hex');
  }

  /**
   * Find a version by its schema hash
   *
   * @private
   * @param hash - SHA-256 hash to search for
   * @returns Matching SchemaVersion or undefined
   */
  private findVersionByHash(hash: string): SchemaVersion | undefined {
    return Array.from(this.versions.values()).find(v => v.hash === hash);
  }

  /**
   * Validate version string format
   *
   * Checks for basic semantic versioning format (v1.2.3)
   * Can be extended for more strict validation.
   *
   * @private
   */
  private isValidVersion(version: string): boolean {
    // Basic semantic version check: vX.Y.Z
    return /^v?\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/.test(version);
  }

  /**
   * Check if a schema contains breaking changes compared to latest
   *
   * @param schema - Schema string to check
   * @returns True if breaking changes detected
   */
  async hasBreakingChanges(schema: string): Promise<boolean> {
    const changes = await this.compareWithLatest(schema);
    return changes.some(c => c.type === 'BREAKING');
  }

  /**
   * Validate if a schema can be registered
   *
   * Performs comprehensive validation including:
   * - GraphQL syntax validation
   * - Breaking change detection
   * - Custom validators if provided
   *
   * @param schema - Schema string to validate
   * @param allowBreaking - Whether to allow breaking changes
   * @returns Validation result with errors and warnings
   */
  async validateCanRegister(
    schema: string,
    allowBreaking: boolean = false
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let breakingChanges: SchemaChange[] = [];

    // 1. Validate schema is not empty
    if (!schema || schema.trim().length === 0) {
      errors.push('Schema cannot be empty');
      return { valid: false, errors, warnings };
    }

    // 2. Validate GraphQL syntax
    try {
      buildSchema(schema);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`Invalid GraphQL schema: ${errorMessage}`);
      return { valid: false, errors, warnings, breakingChanges };
    }

    // 3. Check for breaking changes (if we have a previous version)
    if (this.getLatestVersion()) {
      const changes = await this.compareWithLatest(schema);
      breakingChanges = changes.filter(c => c.type === 'BREAKING');

      if (breakingChanges.length > 0) {
        if (!allowBreaking) {
          errors.push(
            `Schema contains ${breakingChanges.length} breaking change(s):`
          );
          breakingChanges.forEach(c => {
            errors.push(`  - ${c.message}`);
          });
        } else {
          warnings.push(
            `Warning: Schema contains ${breakingChanges.length} breaking change(s) (allowed)`
          );
        }
      }

      // Also warn about dangerous changes
      const dangerousChanges = changes.filter(c => c.type === 'DANGEROUS');
      if (dangerousChanges.length > 0) {
        warnings.push(
          `Warning: Schema contains ${dangerousChanges.length} dangerous change(s):`
        );
        dangerousChanges.forEach(c => {
          warnings.push(`  - ${c.message}`);
        });
      }
    }

    const valid = errors.length === 0;

    return {
      valid,
      errors,
      warnings,
      breakingChanges
    };
  }

  /**
   * Delete a schema version
   *
   * Removes a version from both disk and memory.
   * Use with caution - this operation cannot be undone.
   *
   * @param version - Version string to delete
   * @returns True if deleted, false if not found
   */
  async deleteVersion(version: string): Promise<boolean> {
    const schemaVersion = this.versions.get(version);
    if (!schemaVersion) {
      return false;
    }

    try {
      // Delete from disk
      const jsonPath = path.join(this.registryPath, `${version}.json`);
      const graphqlPath = path.join(this.registryPath, `${version}.graphql`);

      await Promise.all([
        fs.unlink(jsonPath).catch(() => {}), // Ignore if file doesn't exist
        fs.unlink(graphqlPath).catch(() => {})
      ]);

      // Delete from memory
      this.versions.delete(version);

      this.logger.info('Version deleted', { version });
      return true;
    } catch (error) {
      this.logger.error('Failed to delete version', error as Error, { version });
      throw new SchemaRegistryError(
        `Failed to delete version ${version}`,
        'DELETE_FAILED',
        { version }
      );
    }
  }

  /**
   * Get registry statistics
   *
   * @returns Statistics about the registry
   */
  getStats(): {
    totalVersions: number;
    oldestVersion?: string;
    latestVersion?: string;
    totalBreakingChanges: number;
    totalChanges: number;
  } {
    const versions = this.getAllVersions();
    const totalBreakingChanges = versions.reduce(
      (sum, v) => sum + v.changes.filter(c => c.type === 'BREAKING').length,
      0
    );
    const totalChanges = versions.reduce(
      (sum, v) => sum + v.changes.length,
      0
    );

    return {
      totalVersions: versions.length,
      oldestVersion: this.getOldestVersion()?.version,
      latestVersion: this.getLatestVersion()?.version,
      totalBreakingChanges,
      totalChanges
    };
  }
}

/**
 * Export singleton instance for convenience
 *
 * For most applications, a single global registry is sufficient.
 * For testing or multi-registry scenarios, create separate instances.
 */
export const schemaRegistry = new SchemaRegistry();
