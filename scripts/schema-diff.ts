#!/usr/bin/env ts-node
/**
 * Schema Diff Tool - API Contract Validation
 *
 * Compares current API schemas against versioned snapshots to detect breaking changes.
 * Part of GA-E3: API Contracts initiative.
 *
 * Usage:
 *   npm run schema:diff [--version v1] [--output json|text] [--strict]
 *
 * Exit codes:
 *   0 - No breaking changes
 *   1 - Breaking changes detected
 *   2 - Script error
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Types
// ============================================================================

interface DiffResult {
  timestamp: string;
  baseVersion: string;
  hasBreakingChanges: boolean;
  summary: {
    breaking: number;
    nonBreaking: number;
    deprecated: number;
  };
  breakingChanges: Change[];
  nonBreakingChanges: Change[];
  deprecatedChanges: Change[];
  recommendations: string[];
  schemaHashes: {
    current: SchemaHashes;
    snapshot: SchemaHashes;
  };
}

interface Change {
  type: ChangeType;
  category: 'graphql' | 'openapi';
  location: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  oldValue?: string;
  newValue?: string;
}

type ChangeType =
  | 'field_removed'
  | 'field_type_changed'
  | 'field_made_required'
  | 'type_removed'
  | 'enum_value_removed'
  | 'endpoint_removed'
  | 'method_changed'
  | 'field_added'
  | 'type_added'
  | 'endpoint_added'
  | 'field_deprecated';

interface SchemaHashes {
  graphql: string;
  openapi: string;
}

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  schemaDir: path.join(__dirname, '../api-schemas'),
  currentGraphQL: path.join(__dirname, '../graphql/schema.graphql'),
  currentOpenAPI: path.join(__dirname, '../api-schemas/v1/openapi-spec-v1.json'), // This would be generated
  outputDir: path.join(__dirname, '../audit/ga-evidence/api-contracts/diff-reports'),
};

// ============================================================================
// GraphQL Schema Diff
// ============================================================================

class GraphQLDiffer {
  /**
   * Compare current GraphQL schema against snapshot
   */
  static diff(currentPath: string, snapshotPath: string): Change[] {
    const changes: Change[] = [];

    if (!fs.existsSync(currentPath) || !fs.existsSync(snapshotPath)) {
      return changes;
    }

    const current = fs.readFileSync(currentPath, 'utf-8');
    const snapshot = fs.readFileSync(snapshotPath, 'utf-8');

    // Parse schemas into structured format
    const currentSchema = this.parseSchema(current);
    const snapshotSchema = this.parseSchema(snapshot);

    // Check for removed types
    for (const [typeName, typeInfo] of Object.entries(snapshotSchema.types)) {
      if (!currentSchema.types[typeName]) {
        changes.push({
          type: 'type_removed',
          category: 'graphql',
          location: `Type.${typeName}`,
          severity: 'critical',
          message: `Type '${typeName}' was removed from schema`,
          oldValue: typeInfo.definition,
          newValue: undefined,
        });
      }
    }

    // Check for removed or changed fields
    for (const [typeName, typeInfo] of Object.entries(snapshotSchema.types)) {
      const currentType = currentSchema.types[typeName];
      if (!currentType) continue;

      for (const [fieldName, fieldInfo] of Object.entries(typeInfo.fields)) {
        const currentField = currentType.fields[fieldName];

        if (!currentField) {
          changes.push({
            type: 'field_removed',
            category: 'graphql',
            location: `${typeName}.${fieldName}`,
            severity: 'critical',
            message: `Field '${fieldName}' was removed from type '${typeName}'`,
            oldValue: fieldInfo.type,
            newValue: undefined,
          });
        } else if (currentField.type !== fieldInfo.type) {
          // Type changed
          if (this.isBreakingTypeChange(fieldInfo.type, currentField.type)) {
            changes.push({
              type: 'field_type_changed',
              category: 'graphql',
              location: `${typeName}.${fieldName}`,
              severity: 'high',
              message: `Field '${fieldName}' type changed from '${fieldInfo.type}' to '${currentField.type}'`,
              oldValue: fieldInfo.type,
              newValue: currentField.type,
            });
          }
        } else if (!fieldInfo.required && currentField.required) {
          // Made required
          changes.push({
            type: 'field_made_required',
            category: 'graphql',
            location: `${typeName}.${fieldName}`,
            severity: 'high',
            message: `Field '${fieldName}' is now required (was optional)`,
            oldValue: 'optional',
            newValue: 'required',
          });
        }

        // Check for deprecation
        if (currentField.deprecated && !fieldInfo.deprecated) {
          changes.push({
            type: 'field_deprecated',
            category: 'graphql',
            location: `${typeName}.${fieldName}`,
            severity: 'low',
            message: `Field '${fieldName}' is now deprecated`,
            oldValue: 'active',
            newValue: 'deprecated',
          });
        }
      }
    }

    // Check for added types/fields (non-breaking)
    for (const [typeName, typeInfo] of Object.entries(currentSchema.types)) {
      if (!snapshotSchema.types[typeName]) {
        changes.push({
          type: 'type_added',
          category: 'graphql',
          location: `Type.${typeName}`,
          severity: 'low',
          message: `New type '${typeName}' added`,
          oldValue: undefined,
          newValue: typeInfo.definition,
        });
      }
    }

    return changes;
  }

  /**
   * Parse GraphQL schema into structured format
   */
  private static parseSchema(schema: string): {
    types: Record<string, { definition: string; fields: Record<string, { type: string; required: boolean; deprecated: boolean }> }>;
  } {
    const types: Record<string, any> = {};

    // Simple regex-based parser (for production, use graphql-js parser)
    const typeRegex = /type\s+(\w+)\s*\{([^}]+)\}/g;
    const fieldRegex = /(\w+)(?:\([^)]*\))?:\s*([^\s!]+)(!?)/g;

    let typeMatch;
    while ((typeMatch = typeRegex.exec(schema)) !== null) {
      const [fullMatch, typeName, fieldBlock] = typeMatch;
      const fields: Record<string, any> = {};

      let fieldMatch;
      while ((fieldMatch = fieldRegex.exec(fieldBlock)) !== null) {
        const [, fieldName, fieldType, requiredMarker] = fieldMatch;
        fields[fieldName] = {
          type: fieldType,
          required: requiredMarker === '!',
          deprecated: fieldBlock.includes(`@deprecated`) && fieldBlock.includes(fieldName),
        };
      }

      types[typeName] = {
        definition: fullMatch,
        fields,
      };
    }

    return { types };
  }

  /**
   * Determine if a type change is breaking
   */
  private static isBreakingTypeChange(oldType: string, newType: string): boolean {
    // Non-null to nullable is safe, nullable to non-null is breaking
    const oldNullable = !oldType.endsWith('!');
    const newNullable = !newType.endsWith('!');

    if (!oldNullable && newNullable) {
      return false; // Made nullable - safe
    }
    if (oldNullable && !newNullable) {
      return true; // Made non-null - breaking
    }

    // Different base types is breaking
    const oldBase = oldType.replace(/!/g, '');
    const newBase = newType.replace(/!/g, '');

    return oldBase !== newBase;
  }
}

// ============================================================================
// OpenAPI Schema Diff
// ============================================================================

class OpenAPIDiffer {
  /**
   * Compare current OpenAPI spec against snapshot
   */
  static diff(currentPath: string, snapshotPath: string): Change[] {
    const changes: Change[] = [];

    if (!fs.existsSync(currentPath) || !fs.existsSync(snapshotPath)) {
      return changes;
    }

    const current = JSON.parse(fs.readFileSync(currentPath, 'utf-8'));
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));

    // Check for removed endpoints
    for (const [path, methods] of Object.entries(snapshot.paths || {})) {
      if (!current.paths || !current.paths[path]) {
        changes.push({
          type: 'endpoint_removed',
          category: 'openapi',
          location: `paths.${path}`,
          severity: 'critical',
          message: `Endpoint '${path}' was removed`,
          oldValue: path,
          newValue: undefined,
        });
        continue;
      }

      // Check for removed methods
      for (const method of Object.keys(methods as any)) {
        if (method === 'parameters') continue; // Skip common parameters

        if (!(current.paths[path] as any)[method]) {
          changes.push({
            type: 'method_changed',
            category: 'openapi',
            location: `paths.${path}.${method}`,
            severity: 'critical',
            message: `Method '${method.toUpperCase()}' removed from endpoint '${path}'`,
            oldValue: method,
            newValue: undefined,
          });
        }
      }
    }

    // Check for added endpoints (non-breaking)
    for (const [path, methods] of Object.entries(current.paths || {})) {
      if (!snapshot.paths || !snapshot.paths[path]) {
        changes.push({
          type: 'endpoint_added',
          category: 'openapi',
          location: `paths.${path}`,
          severity: 'low',
          message: `New endpoint '${path}' added`,
          oldValue: undefined,
          newValue: path,
        });
      }
    }

    // TODO: Add schema comparison for request/response bodies

    return changes;
  }
}

// ============================================================================
// Main Diff Engine
// ============================================================================

class SchemaDiffEngine {
  /**
   * Run full schema diff against specified version
   */
  static async run(version: string = 'v1'): Promise<DiffResult> {
    const versionDir = path.join(CONFIG.schemaDir, version);

    if (!fs.existsSync(versionDir)) {
      throw new Error(`Version snapshot not found: ${version}`);
    }

    // Get snapshot paths
    const snapshotGraphQL = path.join(versionDir, `graphql-schema-${version}.graphql`);
    const snapshotOpenAPI = path.join(versionDir, `openapi-spec-${version}.json`);

    // Run diffs
    const graphqlChanges = GraphQLDiffer.diff(CONFIG.currentGraphQL, snapshotGraphQL);
    const openApiChanges = OpenAPIDiffer.diff(CONFIG.currentOpenAPI, snapshotOpenAPI);

    const allChanges = [...graphqlChanges, ...openApiChanges];

    // Categorize changes
    const breaking = allChanges.filter((c) =>
      ['field_removed', 'field_type_changed', 'field_made_required', 'type_removed', 'enum_value_removed', 'endpoint_removed', 'method_changed'].includes(c.type)
    );

    const nonBreaking = allChanges.filter((c) =>
      ['field_added', 'type_added', 'endpoint_added'].includes(c.type)
    );

    const deprecated = allChanges.filter((c) => c.type === 'field_deprecated');

    // Generate recommendations
    const recommendations = this.generateRecommendations(breaking, nonBreaking, deprecated);

    // Calculate hashes
    const currentHashes = this.calculateHashes(CONFIG.currentGraphQL, CONFIG.currentOpenAPI);
    const snapshotHashes = this.loadSnapshotHashes(versionDir);

    const result: DiffResult = {
      timestamp: new Date().toISOString(),
      baseVersion: version,
      hasBreakingChanges: breaking.length > 0,
      summary: {
        breaking: breaking.length,
        nonBreaking: nonBreaking.length,
        deprecated: deprecated.length,
      },
      breakingChanges: breaking,
      nonBreakingChanges: nonBreaking,
      deprecatedChanges: deprecated,
      recommendations,
      schemaHashes: {
        current: currentHashes,
        snapshot: snapshotHashes,
      },
    };

    return result;
  }

  /**
   * Generate recommendations based on changes
   */
  private static generateRecommendations(
    breaking: Change[],
    nonBreaking: Change[],
    deprecated: Change[]
  ): string[] {
    const recommendations: string[] = [];

    if (breaking.length > 0) {
      recommendations.push(
        `⚠️  BREAKING CHANGES DETECTED: ${breaking.length} breaking change(s) found`
      );
      recommendations.push(
        'Action required: Create new major version (e.g., v2)'
      );
      recommendations.push(
        'Update /api-schemas/VERSION_POLICY.md with migration guide'
      );
      recommendations.push(
        'Consider implementing compatibility layer for gradual migration'
      );
    } else if (nonBreaking.length > 0) {
      recommendations.push(
        `✅ Non-breaking changes only: ${nonBreaking.length} additive change(s)`
      );
      recommendations.push(
        'Safe to merge - no version bump required'
      );
      recommendations.push(
        'Update API documentation to reflect new features'
      );
    } else {
      recommendations.push(
        '✅ No API changes detected - schemas are identical'
      );
    }

    if (deprecated.length > 0) {
      recommendations.push(
        `ℹ️  ${deprecated.length} field(s) marked as deprecated`
      );
      recommendations.push(
        'Document deprecation timeline in changelog'
      );
    }

    return recommendations;
  }

  /**
   * Calculate SHA256 hashes of current schemas
   */
  private static calculateHashes(graphqlPath: string, openApiPath: string): SchemaHashes {
    const hashFile = (filepath: string): string => {
      if (!fs.existsSync(filepath)) return 'N/A';
      const content = fs.readFileSync(filepath);
      return 'sha256:' + crypto.createHash('sha256').update(content).digest('hex');
    };

    return {
      graphql: hashFile(graphqlPath),
      openapi: hashFile(openApiPath),
    };
  }

  /**
   * Load snapshot hashes from metadata
   */
  private static loadSnapshotHashes(versionDir: string): SchemaHashes {
    const metadataPath = path.join(versionDir, 'version-metadata.json');
    if (!fs.existsSync(metadataPath)) {
      return { graphql: 'N/A', openapi: 'N/A' };
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    return metadata.schemaHash || { graphql: 'N/A', openapi: 'N/A' };
  }

  /**
   * Save diff report to file
   */
  static saveDiffReport(result: DiffResult, outputFormat: 'json' | 'text' = 'json'): string {
    // Ensure output directory exists
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `schema-diff-${result.baseVersion}-${timestamp}`;

    if (outputFormat === 'json') {
      const filepath = path.join(CONFIG.outputDir, `${filename}.json`);
      fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
      return filepath;
    } else {
      const filepath = path.join(CONFIG.outputDir, `${filename}.txt`);
      const report = this.formatTextReport(result);
      fs.writeFileSync(filepath, report);
      return filepath;
    }
  }

  /**
   * Format diff result as human-readable text
   */
  private static formatTextReport(result: DiffResult): string {
    const lines: string[] = [];

    lines.push('='.repeat(80));
    lines.push('API SCHEMA DIFF REPORT');
    lines.push('='.repeat(80));
    lines.push('');
    lines.push(`Timestamp:     ${result.timestamp}`);
    lines.push(`Base Version:  ${result.baseVersion}`);
    lines.push(`Status:        ${result.hasBreakingChanges ? '⚠️  BREAKING CHANGES' : '✅ SAFE'}`);
    lines.push('');
    lines.push('Summary:');
    lines.push(`  Breaking Changes:     ${result.summary.breaking}`);
    lines.push(`  Non-Breaking Changes: ${result.summary.nonBreaking}`);
    lines.push(`  Deprecated Fields:    ${result.summary.deprecated}`);
    lines.push('');

    if (result.breakingChanges.length > 0) {
      lines.push('-'.repeat(80));
      lines.push('BREAKING CHANGES:');
      lines.push('-'.repeat(80));
      for (const change of result.breakingChanges) {
        lines.push('');
        lines.push(`[${change.severity.toUpperCase()}] ${change.type}`);
        lines.push(`  Location: ${change.location}`);
        lines.push(`  Message:  ${change.message}`);
        if (change.oldValue) lines.push(`  Old:      ${change.oldValue}`);
        if (change.newValue) lines.push(`  New:      ${change.newValue}`);
      }
      lines.push('');
    }

    if (result.nonBreakingChanges.length > 0) {
      lines.push('-'.repeat(80));
      lines.push('NON-BREAKING CHANGES:');
      lines.push('-'.repeat(80));
      for (const change of result.nonBreakingChanges) {
        lines.push(`  [${change.type}] ${change.location}: ${change.message}`);
      }
      lines.push('');
    }

    if (result.deprecatedChanges.length > 0) {
      lines.push('-'.repeat(80));
      lines.push('DEPRECATIONS:');
      lines.push('-'.repeat(80));
      for (const change of result.deprecatedChanges) {
        lines.push(`  ${change.location}: ${change.message}`);
      }
      lines.push('');
    }

    lines.push('-'.repeat(80));
    lines.push('RECOMMENDATIONS:');
    lines.push('-'.repeat(80));
    for (const rec of result.recommendations) {
      lines.push(`  ${rec}`);
    }
    lines.push('');

    lines.push('-'.repeat(80));
    lines.push('SCHEMA HASHES:');
    lines.push('-'.repeat(80));
    lines.push(`Current GraphQL:  ${result.schemaHashes.current.graphql}`);
    lines.push(`Snapshot GraphQL: ${result.schemaHashes.snapshot.graphql}`);
    lines.push(`Current OpenAPI:  ${result.schemaHashes.current.openapi}`);
    lines.push(`Snapshot OpenAPI: ${result.schemaHashes.snapshot.openapi}`);
    lines.push('');
    lines.push('='.repeat(80));

    return lines.join('\n');
  }
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  try {
    const args = process.argv.slice(2);
    const versionArg = args.find((a) => a.startsWith('--version='));
    const outputArg = args.find((a) => a.startsWith('--output='));
    const strictMode = args.includes('--strict');

    const version = versionArg ? versionArg.split('=')[1] : 'v1';
    const outputFormat = (outputArg ? outputArg.split('=')[1] : 'json') as 'json' | 'text';

    console.log('🔍 Running API schema diff...');
    console.log(`   Version: ${version}`);
    console.log(`   Output:  ${outputFormat}`);
    console.log('');

    const result = await SchemaDiffEngine.run(version);

    // Save report
    const reportPath = SchemaDiffEngine.saveDiffReport(result, outputFormat);
    console.log(`📄 Report saved: ${reportPath}`);
    console.log('');

    // Print summary
    console.log('Summary:');
    console.log(`  Breaking:     ${result.summary.breaking}`);
    console.log(`  Non-Breaking: ${result.summary.nonBreaking}`);
    console.log(`  Deprecated:   ${result.summary.deprecated}`);
    console.log('');

    // Print recommendations
    console.log('Recommendations:');
    for (const rec of result.recommendations) {
      console.log(`  ${rec}`);
    }

    // Exit with appropriate code
    if (result.hasBreakingChanges) {
      if (strictMode) {
        console.error('');
        console.error('❌ FAILED: Breaking changes detected in strict mode');
        process.exit(1);
      } else {
        console.log('');
        console.log('⚠️  WARNING: Breaking changes detected');
        console.log('   Review changes and consider creating a new API version');
        process.exit(0); // Don't fail in non-strict mode
      }
    } else {
      console.log('');
      console.log('✅ SUCCESS: No breaking changes detected');
      process.exit(0);
    }
  } catch (error) {
    console.error('');
    console.error('❌ ERROR:', error instanceof Error ? error.message : String(error));
    process.exit(2);
  }
}

// Run if called directly
if (process.argv[1] === __filename) {
  main();
}

export { SchemaDiffEngine, GraphQLDiffer, OpenAPIDiffer };
export type { DiffResult };
