#!/usr/bin/env node
/**
 * CLI tool to show detailed information about a dataset
 * Usage: node scripts/catalog-show.ts <dataset-id> [options]
 */

import { Pool } from 'pg';
import { CatalogService } from '../server/src/catalog/CatalogService.js';

const DEFAULT_DB_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/maestro';

interface CliOptions {
  datasetId: string;
  showLineage?: boolean;
  showSchema?: boolean;
  showAccess?: boolean;
  format?: 'text' | 'json';
}

function parseArgs(): CliOptions | null {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    return null;
  }

  const options: CliOptions = {
    datasetId: args[0],
    showLineage: true,
    showSchema: true,
    showAccess: false,
    format: 'text',
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--lineage':
      case '-l':
        options.showLineage = true;
        break;
      case '--schema':
      case '-s':
        options.showSchema = true;
        break;
      case '--access':
      case '-a':
        options.showAccess = true;
        break;
      case '--format':
      case '-f':
        options.format = args[++i] as 'text' | 'json';
        break;
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Data Catalog Show Tool

Usage: make catalog:show DATASET_ID=<dataset-id> [options]

Arguments:
  <dataset-id>              Dataset ID to show details for

Options:
  -l, --lineage             Show lineage graph (default: true)
  -s, --schema              Show schema details (default: true)
  -a, --access              Show access logs
  -f, --format <format>     Output format: text, json (default: text)
  -h, --help                Show this help message

Examples:
  make catalog:show DATASET_ID=users                     # Show users dataset details
  make catalog:show DATASET_ID=transactions --access     # Show with access logs
  make catalog:show DATASET_ID=events --format=json      # Output as JSON
  `);
}

function formatText(dataset: any, lineage?: any, accessLogs?: any[]) {
  console.log('');
  console.log('='.repeat(80));
  console.log(`Dataset: ${dataset.name}`);
  console.log('='.repeat(80));
  console.log('');

  // Basic info
  console.log('Basic Information:');
  console.log(`  ID:                 ${dataset.datasetId}`);
  console.log(`  Name:               ${dataset.name}`);
  if (dataset.description) {
    console.log(`  Description:        ${dataset.description}`);
  }
  console.log(`  Type:               ${dataset.dataType}`);
  console.log(`  Classification:     ${dataset.classificationLevel}`);
  console.log(`  Owner Team:         ${dataset.ownerTeam}`);
  console.log(`  Owner Email:        ${dataset.ownerEmail}`);
  console.log('');

  // Sensitivity
  console.log('Sensitivity:');
  console.log(`  Contains PII:       ${dataset.containsPersonalData ? 'Yes' : 'No'}`);
  console.log(`  Contains Financial: ${dataset.containsFinancialData ? 'Yes' : 'No'}`);
  console.log(`  Contains Health:    ${dataset.containsHealthData ? 'Yes' : 'No'}`);
  console.log(`  Jurisdiction:       ${dataset.jurisdiction.join(', ')}`);
  console.log('');

  // Storage
  console.log('Storage:');
  console.log(`  System:             ${dataset.storageSystem}`);
  console.log(`  Location:           ${dataset.storageLocation}`);
  if (dataset.recordCount) {
    console.log(`  Record Count:       ${dataset.recordCount.toLocaleString()}`);
  }
  if (dataset.lastUpdatedAt) {
    console.log(`  Last Updated:       ${dataset.lastUpdatedAt}`);
  }
  console.log('');

  // Schema
  if (dataset.schemaDefinition && dataset.schemaDefinition.length > 0) {
    console.log('Schema:');
    console.log(`  Version:            ${dataset.schemaVersion}`);
    console.log(`  Columns (${dataset.schemaDefinition.length}):`);
    console.log('');

    for (const col of dataset.schemaDefinition) {
      const flags = [];
      if (col.pii) flags.push('PII');
      if (col.encrypted) flags.push('ENCRYPTED');
      if (!col.nullable) flags.push('NOT NULL');

      console.log(`    • ${col.name.padEnd(25)} ${col.type.padEnd(15)} ${flags.length > 0 ? `[${flags.join(', ')}]` : ''}`);
      if (col.description) {
        console.log(`      ${col.description}`);
      }
    }
    console.log('');
  }

  // Governance
  console.log('Governance:');
  if (dataset.licenseId) {
    console.log(`  License:            ${dataset.licenseId}`);
  }
  if (dataset.contractReferences && dataset.contractReferences.length > 0) {
    console.log(`  Contracts:          ${dataset.contractReferences.join(', ')}`);
  }
  if (dataset.authorityRequirements && dataset.authorityRequirements.length > 0) {
    console.log(`  Authority Required: ${dataset.authorityRequirements.join(', ')}`);
  }
  if (dataset.retentionDays) {
    console.log(`  Retention:          ${dataset.retentionDays} days`);
  }
  if (dataset.retentionPolicyId) {
    console.log(`  Retention Policy:   ${dataset.retentionPolicyId}`);
  }
  console.log('');

  // Quality
  if (dataset.dataQualityScore) {
    console.log('Quality:');
    console.log(`  Quality Score:      ${(dataset.dataQualityScore * 100).toFixed(1)}%`);
    console.log('');
  }

  // Tags
  if (dataset.tags && dataset.tags.length > 0) {
    console.log('Tags:');
    console.log(`  ${dataset.tags.join(', ')}`);
    console.log('');
  }

  // Lineage
  if (lineage) {
    console.log('Lineage:');
    console.log(`  Upstream datasets:   ${lineage.upstream.length}`);
    if (lineage.upstream.length > 0) {
      for (const edge of lineage.upstream.slice(0, 5)) {
        console.log(`    ← ${edge.sourceDatasetId} (${edge.transformationType})`);
      }
      if (lineage.upstream.length > 5) {
        console.log(`    ... and ${lineage.upstream.length - 5} more`);
      }
    }

    console.log(`  Downstream datasets: ${lineage.downstream.length}`);
    if (lineage.downstream.length > 0) {
      for (const edge of lineage.downstream.slice(0, 5)) {
        console.log(`    → ${edge.targetDatasetId} (${edge.transformationType})`);
      }
      if (lineage.downstream.length > 5) {
        console.log(`    ... and ${lineage.downstream.length - 5} more`);
      }
    }
    console.log('');
  }

  // Access logs
  if (accessLogs && accessLogs.length > 0) {
    console.log('Recent Access:');
    for (const log of accessLogs.slice(0, 10)) {
      const status = log.accessGranted ? '✓' : '✗';
      console.log(`  ${status} ${log.accessedAt} | ${log.accessType} by ${log.userId}`);
      if (log.reasonForAccess) {
        console.log(`    Reason: ${log.reasonForAccess}`);
      }
      if (log.denialReason) {
        console.log(`    Denied: ${log.denialReason}`);
      }
    }
    console.log('');
  }

  // Metadata
  console.log('Metadata:');
  console.log(`  Created:            ${dataset.createdAt}`);
  if (dataset.createdBy) {
    console.log(`  Created By:         ${dataset.createdBy}`);
  }
  console.log(`  Updated:            ${dataset.updatedAt}`);
  if (dataset.updatedBy) {
    console.log(`  Updated By:         ${dataset.updatedBy}`);
  }
  if (dataset.deprecatedAt) {
    console.log(`  DEPRECATED:         ${dataset.deprecatedAt}`);
  }
  console.log('');
  console.log('='.repeat(80));
  console.log('');
}

function formatJson(dataset: any, lineage?: any, accessLogs?: any[]) {
  const output = {
    dataset,
    lineage,
    accessLogs,
  };
  console.log(JSON.stringify(output, null, 2));
}

async function main() {
  const options = parseArgs();

  if (!options) {
    process.exit(0);
  }

  const pool = new Pool({
    connectionString: DEFAULT_DB_URL,
  });

  try {
    const catalogService = new CatalogService(pool);

    // Fetch dataset
    const dataset = await catalogService.getDataset(options.datasetId);

    if (!dataset) {
      console.error(`Dataset '${options.datasetId}' not found in catalog.`);
      process.exit(1);
    }

    // Fetch lineage
    let lineage;
    if (options.showLineage) {
      try {
        lineage = await catalogService.getLineage(options.datasetId, {
          maxDepth: 3,
          direction: 'both',
        });
      } catch (error) {
        console.warn('Warning: Could not fetch lineage:', error.message);
      }
    }

    // Fetch access logs
    let accessLogs;
    if (options.showAccess) {
      try {
        const result = await pool.query(
          `
          SELECT dal.*, u.email as user_email
          FROM catalog.dataset_access_log dal
          JOIN catalog.datasets d ON dal.dataset_id = d.id
          JOIN maestro.users u ON dal.user_id = u.id::text
          WHERE d.dataset_id = $1
          ORDER BY dal.accessed_at DESC
          LIMIT 20
        `,
          [options.datasetId],
        );
        accessLogs = result.rows;
      } catch (error) {
        console.warn('Warning: Could not fetch access logs:', error.message);
      }
    }

    // Format output
    switch (options.format) {
      case 'json':
        formatJson(dataset, lineage, accessLogs);
        break;
      case 'text':
      default:
        formatText(dataset, lineage, accessLogs);
        break;
    }
  } catch (error) {
    console.error('Error showing dataset:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
