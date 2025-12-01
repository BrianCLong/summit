/**
 * GraphQL Schema Versioning
 * Manages version-specific GraphQL schemas
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { DocumentNode, parse, print } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { versionRegistry } from './version-registry.js';
import { logger } from '../utils/logger.js';

export interface VersionedSchema {
  version: string;
  typeDefs: DocumentNode;
  resolvers: any;
  directives?: any;
}

class SchemaVersionManager {
  private schemas: Map<string, VersionedSchema> = new Map();

  /**
   * Register a versioned schema
   */
  registerSchema(schema: VersionedSchema): void {
    this.schemas.set(schema.version, schema);
    logger.info({
      message: 'Registered schema version',
      version: schema.version,
    });
  }

  /**
   * Get schema for a specific version
   */
  getSchema(version: string): VersionedSchema | undefined {
    return this.schemas.get(version);
  }

  /**
   * Get executable schema for a version
   */
  getExecutableSchema(version: string) {
    const versionedSchema = this.getSchema(version);
    if (!versionedSchema) {
      throw new Error(`Schema for version ${version} not found`);
    }

    return makeExecutableSchema({
      typeDefs: versionedSchema.typeDefs,
      resolvers: versionedSchema.resolvers,
    });
  }

  /**
   * Get all registered schema versions
   */
  getAllVersions(): string[] {
    return Array.from(this.schemas.keys());
  }

  /**
   * Check if a schema version exists
   */
  hasSchema(version: string): boolean {
    return this.schemas.has(version);
  }

  /**
   * Get schema differences between versions
   */
  getSchemaDiff(fromVersion: string, toVersion: string): SchemaDiff {
    const fromSchema = this.getSchema(fromVersion);
    const toSchema = this.getSchema(toVersion);

    if (!fromSchema || !toSchema) {
      throw new Error('One or both schema versions not found');
    }

    // This is a simplified diff - in production, use a proper schema diff tool
    return {
      fromVersion,
      toVersion,
      addedTypes: [],
      removedTypes: [],
      modifiedTypes: [],
      addedFields: [],
      removedFields: [],
      modifiedFields: [],
      breakingChanges: [],
    };
  }
}

export interface SchemaDiff {
  fromVersion: string;
  toVersion: string;
  addedTypes: string[];
  removedTypes: string[];
  modifiedTypes: string[];
  addedFields: FieldChange[];
  removedFields: FieldChange[];
  modifiedFields: FieldChange[];
  breakingChanges: BreakingChange[];
}

export interface FieldChange {
  type: string;
  field: string;
  oldDefinition?: string;
  newDefinition?: string;
}

export interface BreakingChange {
  type: 'field_removed' | 'type_changed' | 'argument_removed' | 'argument_type_changed';
  description: string;
  migration?: string;
}

// Singleton instance
export const schemaVersionManager = new SchemaVersionManager();

/**
 * Create a versioned GraphQL directive for deprecation
 */
export const versionDirectives = `
  directive @deprecated(
    reason: String = "No longer supported"
    sunset: String
    replacement: String
  ) on FIELD_DEFINITION | ENUM_VALUE | ARGUMENT_DEFINITION | INPUT_FIELD_DEFINITION

  directive @versionAdded(version: String!) on FIELD_DEFINITION | OBJECT | ENUM | INTERFACE | UNION

  directive @versionRemoved(version: String!) on FIELD_DEFINITION | OBJECT | ENUM | INTERFACE | UNION
`;
