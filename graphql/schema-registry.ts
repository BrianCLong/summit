/**
 * GraphQL Schema Registry
 * Manages schema versions, tracks changes, and provides diffing capabilities
 */

import { parse, printSchema, buildSchema, GraphQLSchema } from 'graphql';
import { diff, Change, CriticalityLevel } from '@graphql-inspector/core';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

export interface SchemaVersion {
  version: string;
  schema: string;
  hash: string;
  timestamp: Date;
  changes: SchemaChange[];
  author?: string;
  description?: string;
}

export interface SchemaChange {
  type: 'BREAKING' | 'DANGEROUS' | 'NON_BREAKING';
  message: string;
  path?: string;
  criticality: CriticalityLevel;
}

export class SchemaRegistry {
  private registryPath: string;
  private versions: Map<string, SchemaVersion> = new Map();

  constructor(registryPath: string = './graphql/versions') {
    this.registryPath = registryPath;
  }

  /**
   * Initialize the schema registry
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.registryPath, { recursive: true });
      await this.loadVersions();
    } catch (error) {
      throw new Error(`Failed to initialize schema registry: ${error}`);
    }
  }

  /**
   * Load all schema versions from disk
   */
  private async loadVersions(): Promise<void> {
    try {
      const files = await fs.readdir(this.registryPath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(
            path.join(this.registryPath, file),
            'utf-8'
          );
          const version: SchemaVersion = JSON.parse(content);
          version.timestamp = new Date(version.timestamp);
          this.versions.set(version.version, version);
        }
      }
    } catch (error) {
      // Registry might be empty, that's okay
      console.warn('No existing schema versions found');
    }
  }

  /**
   * Register a new schema version
   */
  async registerSchema(
    schema: string | GraphQLSchema,
    version: string,
    author?: string,
    description?: string
  ): Promise<SchemaVersion> {
    const schemaString =
      typeof schema === 'string' ? schema : printSchema(schema);
    const hash = this.hashSchema(schemaString);

    // Check if this exact schema already exists
    const existingVersion = this.findVersionByHash(hash);
    if (existingVersion) {
      throw new Error(
        `Schema already registered as version ${existingVersion.version}`
      );
    }

    // Get changes from previous version
    const changes = await this.compareWithLatest(schemaString);

    const schemaVersion: SchemaVersion = {
      version,
      schema: schemaString,
      hash,
      timestamp: new Date(),
      changes,
      author,
      description,
    };

    // Save to disk
    await this.saveVersion(schemaVersion);
    this.versions.set(version, schemaVersion);

    return schemaVersion;
  }

  /**
   * Get a specific schema version
   */
  getVersion(version: string): SchemaVersion | undefined {
    return this.versions.get(version);
  }

  /**
   * Get the latest schema version
   */
  getLatestVersion(): SchemaVersion | undefined {
    const sortedVersions = Array.from(this.versions.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
    return sortedVersions[0];
  }

  /**
   * Get all versions
   */
  getAllVersions(): SchemaVersion[] {
    return Array.from(this.versions.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  /**
   * Compare two schema versions
   */
  async compareVersions(
    fromVersion: string,
    toVersion: string
  ): Promise<SchemaChange[]> {
    const from = this.versions.get(fromVersion);
    const to = this.versions.get(toVersion);

    if (!from || !to) {
      throw new Error('Version not found');
    }

    return this.diffSchemas(from.schema, to.schema);
  }

  /**
   * Compare a schema with the latest version
   */
  private async compareWithLatest(schema: string): Promise<SchemaChange[]> {
    const latest = this.getLatestVersion();
    if (!latest) {
      return [];
    }

    return this.diffSchemas(latest.schema, schema);
  }

  /**
   * Diff two schemas
   */
  private async diffSchemas(
    oldSchema: string,
    newSchema: string
  ): Promise<SchemaChange[]> {
    try {
      const oldAST = parse(oldSchema);
      const newAST = parse(newSchema);

      const changes = await diff(oldAST, newAST);

      return changes.map((change: Change) => ({
        type: this.mapCriticalityToType(change.criticality?.level),
        message: change.message,
        path: change.path,
        criticality: change.criticality?.level || CriticalityLevel.NonBreaking,
      }));
    } catch (error) {
      console.error('Error diffing schemas:', error);
      return [];
    }
  }

  /**
   * Map criticality level to change type
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
   * Generate a changelog between versions
   */
  async generateChangelog(
    fromVersion?: string,
    toVersion?: string
  ): Promise<string> {
    const from = fromVersion
      ? this.versions.get(fromVersion)
      : this.getOldestVersion();
    const to = toVersion ? this.versions.get(toVersion) : this.getLatestVersion();

    if (!from || !to) {
      throw new Error('Version not found');
    }

    let changelog = `# GraphQL Schema Changelog\n\n`;
    changelog += `## ${from.version} → ${to.version}\n\n`;
    changelog += `Generated: ${new Date().toISOString()}\n\n`;

    // Get all versions between from and to
    const versions = this.getAllVersions()
      .filter(
        (v) =>
          v.timestamp >= from.timestamp && v.timestamp <= to.timestamp
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    for (const version of versions) {
      if (version.version === from.version) continue;

      changelog += `### Version ${version.version}\n\n`;
      changelog += `**Date:** ${version.timestamp.toISOString()}\n`;
      if (version.author) changelog += `**Author:** ${version.author}\n`;
      if (version.description)
        changelog += `**Description:** ${version.description}\n`;
      changelog += `\n`;

      // Group changes by type
      const breaking = version.changes.filter((c) => c.type === 'BREAKING');
      const dangerous = version.changes.filter((c) => c.type === 'DANGEROUS');
      const nonBreaking = version.changes.filter(
        (c) => c.type === 'NON_BREAKING'
      );

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
   * Get the oldest version
   */
  private getOldestVersion(): SchemaVersion | undefined {
    const sortedVersions = Array.from(this.versions.values()).sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
    return sortedVersions[0];
  }

  /**
   * Save a version to disk
   */
  private async saveVersion(version: SchemaVersion): Promise<void> {
    const filename = `${version.version}.json`;
    const filepath = path.join(this.registryPath, filename);
    await fs.writeFile(filepath, JSON.stringify(version, null, 2));

    // Also save the schema as a .graphql file
    const schemaFilename = `${version.version}.graphql`;
    const schemaFilepath = path.join(this.registryPath, schemaFilename);
    await fs.writeFile(schemaFilepath, version.schema);
  }

  /**
   * Hash a schema string
   */
  private hashSchema(schema: string): string {
    return crypto.createHash('sha256').update(schema).digest('hex');
  }

  /**
   * Find a version by its hash
   */
  private findVersionByHash(hash: string): SchemaVersion | undefined {
    return Array.from(this.versions.values()).find((v) => v.hash === hash);
  }

  /**
   * Check if a schema has breaking changes
   */
  async hasBreakingChanges(schema: string): Promise<boolean> {
    const changes = await this.compareWithLatest(schema);
    return changes.some((c) => c.type === 'BREAKING');
  }

  /**
   * Validate schema can be registered (no breaking changes unless forced)
   */
  async validateCanRegister(
    schema: string,
    allowBreaking: boolean = false
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Validate the schema is valid GraphQL
      buildSchema(schema);
    } catch (error) {
      errors.push(`Invalid GraphQL schema: ${error}`);
      return { valid: false, errors };
    }

    // Check for breaking changes
    if (!allowBreaking) {
      const changes = await this.compareWithLatest(schema);
      const breaking = changes.filter((c) => c.type === 'BREAKING');
      if (breaking.length > 0) {
        errors.push('Schema contains breaking changes:');
        breaking.forEach((c) => errors.push(`  - ${c.message}`));
        return { valid: false, errors };
      }
    }

    return { valid: true, errors: [] };
  }
}

// Export singleton instance
export const schemaRegistry = new SchemaRegistry();
