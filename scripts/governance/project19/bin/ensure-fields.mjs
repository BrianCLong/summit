#!/usr/bin/env node

/**
 * Ensure Fields Script
 * Ensures all required fields exist in the Project according to the schema
 */

import fs from 'fs';
import path from 'path';
import FieldOperations from '../lib/field-ops.mjs';
import { validateSchema, normalizeSchema } from '../lib/schema.mjs';

// Load environment variables
const PROJECT19_SCHEMA = process.env.PROJECT19_SCHEMA || 'scripts/config/project19-field-schema.json';
const DRY_RUN = process.env.DRY_RUN === 'true';
const MAX_FIX_SCOPE = parseInt(process.env.MAX_FIX_SCOPE) || 50;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Validate inputs
if (!GITHUB_TOKEN) {
  console.error('GITHUB_TOKEN environment variable is required');
  process.exit(1);
}

if (!fs.existsSync(PROJECT19_SCHEMA)) {
  console.error(`Schema file not found: ${PROJECT19_SCHEMA}`);
  process.exit(1);
}

// Get command line arguments
const args = process.argv.slice(2);
const projectId = args.find(arg => arg.startsWith('--project-id='))?.split('=')[1];

if (!projectId) {
  console.error('Project ID is required. Use --project-id=<project-id>');
  process.exit(1);
}

// Create output directory
const outputDir = path.join(process.cwd(), 'artifacts', 'project19', 'fields-ensure');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function main() {
  console.log(`Starting field verification process...`);
  console.log(`  Schema: ${PROJECT19_SCHEMA}`);
  console.log(`  Project ID: ${projectId}`);
  console.log(`  Dry Run: ${DRY_RUN}`);
  console.log(`  Max Fix Scope: ${MAX_FIX_SCOPE}`);

  try {
    // Load and validate the schema
    const rawSchema = JSON.parse(fs.readFileSync(PROJECT19_SCHEMA, 'utf8'));
    const schema = normalizeSchema(rawSchema);

    const validation = validateSchema(schema);
    if (!validation.valid) {
      console.error('Schema validation failed:');
      validation.errors.forEach(err => console.error(`  - ${err}`));
      process.exit(1);
    }

    // Initialize field operations
    const fieldOps = new FieldOperations(GITHUB_TOKEN);

    // Execute field verification
    const result = await fieldOps.ensureFieldsExist(projectId, schema, {
      dryRun: DRY_RUN,
      maxFixScope: MAX_FIX_SCOPE,
      allowDestructive: false
    });

    // Generate report
    const report = {
      timestamp: new Date().toISOString(),
      schemaFile: PROJECT19_SCHEMA,
      projectId: projectId,
      dryRun: DRY_RUN,
      maxFixScope: MAX_FIX_SCOPE,
      summary: {
        plannedOperations: result.totalOperations,
        operationsExecuted: DRY_RUN ? 0 : result.totalOperations,
        errors: (result.errors || []).length
      },
      details: {
        plan: result.plan,
        created: result.created || [],
        updated: result.updated || [],
        deleted: result.deleted || [],
        errors: result.errors || []
      }
    };

    // Write detailed report as JSON
    const reportPath = path.join(outputDir, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Write summary as markdown
    const summaryPath = path.join(outputDir, 'summary.md');
    const summaryMarkdown = generateSummaryMarkdown(report);
    fs.writeFileSync(summaryPath, summaryMarkdown);

    console.log('\nDetailed report saved to:', reportPath);
    console.log('Summary saved to:', summaryPath);

    // Print summary to console
    console.log('\n' + '='.repeat(60));
    console.log('EXECUTION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Status: ${report.summary.errors > 0 ? 'FAILED' : 'SUCCESS'}`);
    console.log(`Planned Operations: ${report.summary.plannedOperations}`);
    console.log(`Operations Executed: ${report.summary.operationsExecuted}`);
    console.log(`Errors: ${report.summary.errors}`);

    if (report.summary.errors > 0) {
      console.log('\nErrors:');
      report.details.errors.forEach(error => console.log(`  - ${error}`));
      process.exit(2); // Error exit code
    } else if (DRY_RUN && report.summary.plannedOperations > 0) {
      console.log(`\nNote: This was a dry run. No actual changes were made.`);
      console.log(`To apply these changes, run with DRY_RUN=false`);
    } else if (report.summary.plannedOperations === 0) {
      console.log(`\nNo changes needed. All fields are already in the desired state.`);
    } else {
      console.log(`\nField verification completed successfully.`);
    }

    // Exit with appropriate code
    process.exit(0);
  } catch (error) {
    console.error('\nUnexpected error occurred:', error.message);
    console.error(error.stack);

    // Write error to file
    const errorPath = path.join(outputDir, 'error.log');
    fs.writeFileSync(errorPath, `Error: ${error.message}\nStack: ${error.stack}\n\nTimestamp: ${new Date().toISOString()}`);

    process.exit(1);
  }
}

function generateSummaryMarkdown(report) {
  const { summary, details } = report;
  
  return `# Project 19 Field Verification Summary

**Date:** ${report.timestamp}

## Execution Details
- **Schema File:** \`${report.schemaFile}\`
- **Project ID:** \`${report.projectId}\`
- **Dry Run:** \`${report.dryRun}\`
- **Max Fix Scope:** \`${report.maxFixScope}\`

## Summary
| Metric | Value |
|--------|-------|
| Planned Operations | ${summary.plannedOperations} |
| Operations Executed | ${summary.operationsExecuted} |
| Errors | ${summary.errors} |

## Operations Breakdown
- **Fields to Create:** ${(details.plan?.create.length || 0)}
- **Fields to Update:** ${(details.plan?.update.length || 0)}
- **Fields to Delete:** ${(details.plan?.delete.length || 0)}

${details.errors.length > 0 ? '## Errors\n' + details.errors.map(e => `- ${e}`).join('\n') : ''}

## Status
${summary.errors > 0 ? ':x: FAILED' : summary.plannedOperations === 0 ? ':white_check_mark: NO CHANGES NEEDED' : ':white_check_mark: SUCCESS'}
`;
}

// Run the main function
main();