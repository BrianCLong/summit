#!/usr/bin/env tsx
/**
 * Schema Registration Script
 *
 * Registers a new schema version in the registry.
 *
 * Usage:
 *   pnpm tsx graphql/scripts/register-schema.ts --version v1.0.0
 *   pnpm tsx graphql/scripts/register-schema.ts --version v2.0.0 --allow-breaking
 *
 * Options:
 *   --version <ver>     Version string (required, e.g., v1.0.0)
 *   --schema <path>     Path to schema file (default: graphql/schema.graphql)
 *   --author <email>    Author email (default: from git config)
 *   --description <msg> Description of changes
 *   --allow-breaking    Allow breaking changes
 *   --tags <tags>       Comma-separated tags
 *   --dry-run           Validate without registering
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, join } from 'path';

interface Options {
  version: string;
  schemaPath: string;
  author: string;
  description: string;
  allowBreaking: boolean;
  tags: string[];
  dryRun: boolean;
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const options: Options = {
    version: '',
    schemaPath: join(process.cwd(), 'graphql', 'schema.graphql'),
    author: '',
    description: '',
    allowBreaking: false,
    tags: [],
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--version':
      case '-v':
        options.version = args[++i];
        break;
      case '--schema':
      case '-s':
        options.schemaPath = resolve(args[++i]);
        break;
      case '--author':
      case '-a':
        options.author = args[++i];
        break;
      case '--description':
      case '-d':
        options.description = args[++i];
        break;
      case '--allow-breaking':
        options.allowBreaking = true;
        break;
      case '--tags':
      case '-t':
        options.tags = args[++i].split(',').map(t => t.trim());
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Schema Registration Script

Usage: pnpm tsx graphql/scripts/register-schema.ts --version <ver> [options]

Required:
  --version, -v <ver>     Version string (e.g., v1.0.0)

Options:
  --schema, -s <path>     Path to schema file (default: graphql/schema.graphql)
  --author, -a <email>    Author email (default: from git config)
  --description, -d <msg> Description of changes
  --allow-breaking        Allow breaking changes
  --tags, -t <tags>       Comma-separated tags
  --dry-run               Validate without registering
  --help, -h              Show this help

Examples:
  # Register initial version
  pnpm tsx graphql/scripts/register-schema.ts --version v1.0.0 --description "Initial schema"

  # Register with breaking changes
  pnpm tsx graphql/scripts/register-schema.ts --version v2.0.0 --allow-breaking --description "Major refactor"
`);
        process.exit(0);
    }
  }

  // Try to get author from git config
  if (!options.author) {
    try {
      options.author = execSync('git config user.email', { encoding: 'utf-8' }).trim();
    } catch {
      options.author = process.env.USER || 'unknown';
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();

  console.log('\n📝 Schema Registration\n');

  // Validate required options
  if (!options.version) {
    console.error('❌ Error: --version is required');
    console.error('Run with --help for usage information');
    process.exit(1);
  }

  // Check version format
  if (!/^v?\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/.test(options.version)) {
    console.error('❌ Error: Invalid version format');
    console.error('Expected semantic version (e.g., v1.0.0, 1.2.3, v2.0.0-beta.1)');
    process.exit(1);
  }

  // Check schema file exists
  if (!existsSync(options.schemaPath)) {
    console.error(`❌ Error: Schema file not found: ${options.schemaPath}`);
    process.exit(2);
  }

  console.log(`Version:     ${options.version}`);
  console.log(`Schema:      ${options.schemaPath}`);
  console.log(`Author:      ${options.author}`);
  console.log(`Description: ${options.description || '(none)'}`);
  console.log(`Tags:        ${options.tags.length > 0 ? options.tags.join(', ') : '(none)'}`);
  console.log(`Dry run:     ${options.dryRun ? 'Yes' : 'No'}`);
  console.log('');

  // Read schema
  const schemaString = readFileSync(options.schemaPath, 'utf-8');

  // Import registry
  const { schemaRegistry, SchemaRegistryError } = await import('../schema-registry.js');

  // Initialize registry
  console.log('Initializing registry...');
  await schemaRegistry.initialize();
  console.log('  ✅ Registry initialized\n');

  // Show current state
  const stats = schemaRegistry.getStats();
  console.log(`Current registry: ${stats.totalVersions} version(s)`);
  if (stats.latestVersion) {
    console.log(`Latest version:   ${stats.latestVersion}`);
  }
  console.log('');

  // Validate schema
  console.log('Validating schema...');
  const validation = await schemaRegistry.validateCanRegister(
    schemaString,
    options.allowBreaking
  );

  if (validation.warnings && validation.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    validation.warnings.forEach(w => console.log(`  - ${w}`));
  }

  if (!validation.valid) {
    console.log('\n❌ Validation failed:');
    validation.errors.forEach(e => console.log(`  - ${e}`));
    process.exit(1);
  }

  console.log('  ✅ Validation passed\n');

  // Dry run ends here
  if (options.dryRun) {
    console.log('🔵 Dry run complete - no changes made\n');
    process.exit(0);
  }

  // Register schema
  console.log('Registering schema...');
  try {
    const version = await schemaRegistry.registerSchema(
      schemaString,
      options.version,
      options.author,
      options.description,
      {
        allowBreaking: options.allowBreaking,
        tags: options.tags.length > 0 ? options.tags : undefined,
      }
    );

    console.log('  ✅ Schema registered successfully!\n');
    console.log('📊 Registration Details:');
    console.log('━'.repeat(40));
    console.log(`Version:    ${version.version}`);
    console.log(`Hash:       ${version.hash.substring(0, 16)}...`);
    console.log(`Timestamp:  ${version.timestamp.toISOString()}`);
    console.log(`Changes:    ${version.changes.length}`);

    if (version.changes.length > 0) {
      const breaking = version.changes.filter(c => c.type === 'BREAKING').length;
      const dangerous = version.changes.filter(c => c.type === 'DANGEROUS').length;
      const nonBreaking = version.changes.filter(c => c.type === 'NON_BREAKING').length;

      console.log(`  Breaking:     ${breaking}`);
      console.log(`  Dangerous:    ${dangerous}`);
      console.log(`  Non-breaking: ${nonBreaking}`);
    }

    console.log('\n✨ Done!\n');
  } catch (error) {
    if (error instanceof SchemaRegistryError) {
      console.error(`\n❌ Registration failed: ${error.message}`);
      console.error(`   Code: ${error.code}`);
      if (error.details) {
        console.error('   Details:', JSON.stringify(error.details, null, 2));
      }
    } else {
      console.error('\n❌ Unexpected error:', error);
    }
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
