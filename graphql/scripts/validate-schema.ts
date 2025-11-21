#!/usr/bin/env tsx
/**
 * Schema Validation Script
 *
 * Validates the GraphQL schema against governance rules.
 * Run this script before commits to catch issues early.
 *
 * Usage:
 *   pnpm tsx graphql/scripts/validate-schema.ts
 *   pnpm tsx graphql/scripts/validate-schema.ts --schema path/to/schema.graphql
 *
 * Exit Codes:
 *   0 - Validation passed
 *   1 - Validation failed (has errors)
 *   2 - Schema file not found
 */

import { readFileSync, existsSync } from 'fs';
import { buildSchema } from 'graphql';
import { resolve, join } from 'path';

// Dynamic imports for ESM compatibility
async function main() {
  const args = process.argv.slice(2);
  let schemaPath = join(process.cwd(), 'graphql', 'schema.graphql');

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--schema' && args[i + 1]) {
      schemaPath = resolve(args[i + 1]);
      i++;
    }
    if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
GraphQL Schema Validator

Usage: pnpm tsx graphql/scripts/validate-schema.ts [options]

Options:
  --schema <path>   Path to schema file (default: graphql/schema.graphql)
  --help, -h        Show this help message

Exit Codes:
  0  Validation passed
  1  Validation failed
  2  Schema file not found
`);
      process.exit(0);
    }
  }

  console.log('\n🔍 GraphQL Schema Validation\n');
  console.log(`Schema file: ${schemaPath}\n`);

  // Check if schema file exists
  if (!existsSync(schemaPath)) {
    console.error(`❌ Schema file not found: ${schemaPath}`);
    console.error('\nTip: Create a schema.graphql file or specify path with --schema');
    process.exit(2);
  }

  // Read schema
  const schemaString = readFileSync(schemaPath, 'utf-8');

  // Step 1: Validate GraphQL syntax
  console.log('Step 1: Validating GraphQL syntax...');
  let schema;
  try {
    schema = buildSchema(schemaString);
    console.log('  ✅ Syntax is valid\n');
  } catch (error) {
    console.error('  ❌ Syntax error:', (error as Error).message);
    process.exit(1);
  }

  // Step 2: Run validation rules
  console.log('Step 2: Running validation rules...');
  try {
    const { validateSchema } = await import('../validation-rules.js');
    const result = validateSchema(schema);

    if (result.errors.length > 0) {
      console.log('\n❌ Validation Errors:');
      result.errors.forEach(err => {
        console.log(`  - [${err.rule}] ${err.message}`);
        if (err.path) console.log(`    Path: ${err.path}`);
        if (err.suggestion) console.log(`    💡 Suggestion: ${err.suggestion}`);
      });
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Validation Warnings:');
      result.warnings.forEach(warn => {
        console.log(`  - [${warn.rule}] ${warn.message}`);
        if (warn.path) console.log(`    Path: ${warn.path}`);
        if (warn.suggestion) console.log(`    💡 Suggestion: ${warn.suggestion}`);
      });
    }

    if (result.errors.length === 0 && result.warnings.length === 0) {
      console.log('  ✅ All validation rules passed\n');
    }

    // Summary
    console.log('\n📊 Summary');
    console.log('━'.repeat(40));
    console.log(`Errors:   ${result.errors.length}`);
    console.log(`Warnings: ${result.warnings.length}`);
    console.log(`Status:   ${result.valid ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('');

    if (!result.valid) {
      console.log('Fix the errors above before committing.\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('  ❌ Validation error:', (error as Error).message);
    process.exit(1);
  }

  // Step 3: Check for breaking changes (if registry is initialized)
  console.log('Step 3: Checking for breaking changes...');
  try {
    const { schemaRegistry } = await import('../schema-registry.js');

    // Try to initialize (may fail if directory doesn't exist)
    await schemaRegistry.initialize();

    const latestVersion = schemaRegistry.getLatestVersion();
    if (latestVersion) {
      const hasBreaking = await schemaRegistry.hasBreakingChanges(schemaString);
      if (hasBreaking) {
        console.log('  ⚠️  Breaking changes detected!');
        console.log('  This schema has breaking changes from the latest registered version.');
        console.log('  Review carefully before proceeding.');
      } else {
        console.log('  ✅ No breaking changes detected');
      }
    } else {
      console.log('  ℹ️  No previous versions to compare (registry empty)');
    }
  } catch (error) {
    console.log('  ℹ️  Could not check breaking changes (registry not initialized)');
  }

  console.log('\n✨ Validation complete!\n');
  process.exit(0);
}

main().catch(error => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});
