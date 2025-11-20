#!/usr/bin/env node
/**
 * CLI tool to list datasets in the catalog
 * Usage: node scripts/catalog-list.ts [options]
 */

import { Pool } from 'pg';
import { CatalogService } from '../server/src/catalog/CatalogService.js';
import { DatasetQueryFilters } from '../server/src/catalog/types.js';

const DEFAULT_DB_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/maestro';

interface CliOptions {
  dataType?: string;
  classification?: string;
  owner?: string;
  storage?: string;
  tags?: string;
  pii?: boolean;
  search?: string;
  limit?: number;
  format?: 'table' | 'json' | 'csv';
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = { format: 'table', limit: 100 };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--type':
      case '-t':
        options.dataType = args[++i];
        break;
      case '--classification':
      case '-c':
        options.classification = args[++i];
        break;
      case '--owner':
      case '-o':
        options.owner = args[++i];
        break;
      case '--storage':
      case '-s':
        options.storage = args[++i];
        break;
      case '--tags':
        options.tags = args[++i];
        break;
      case '--pii':
        options.pii = true;
        break;
      case '--search':
        options.search = args[++i];
        break;
      case '--limit':
      case '-l':
        options.limit = parseInt(args[++i]);
        break;
      case '--format':
      case '-f':
        options.format = args[++i] as 'table' | 'json' | 'csv';
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Data Catalog List Tool

Usage: make catalog:list [options]

Options:
  -t, --type <type>             Filter by data type (audit, analytics, telemetry, etc.)
  -c, --classification <level>  Filter by classification level (public, internal, confidential, etc.)
  -o, --owner <team>            Filter by owner team
  -s, --storage <system>        Filter by storage system (postgres, neo4j, s3, etc.)
  --tags <tags>                 Filter by tags (comma-separated)
  --pii                         Show only datasets containing PII
  --search <term>               Search datasets by name or description
  -l, --limit <number>          Limit number of results (default: 100)
  -f, --format <format>         Output format: table, json, csv (default: table)
  -h, --help                    Show this help message

Examples:
  make catalog:list                        # List all datasets
  make catalog:list --type=audit           # List audit datasets
  make catalog:list --pii                  # List datasets with PII
  make catalog:list --owner=data-eng       # List datasets owned by data-eng
  make catalog:list --search=users         # Search for datasets containing "users"
  make catalog:list --format=json          # Output as JSON
  `);
}

function formatTable(datasets: any[]) {
  if (datasets.length === 0) {
    console.log('No datasets found.');
    return;
  }

  // Calculate column widths
  const maxIdLen = Math.max(10, ...datasets.map((d) => d.datasetId.length));
  const maxNameLen = Math.max(20, ...datasets.map((d) => d.name.length));
  const maxOwnerLen = Math.max(10, ...datasets.map((d) => d.ownerTeam.length));

  // Header
  console.log('');
  console.log(
    `${'ID'.padEnd(maxIdLen)} | ${'Name'.padEnd(maxNameLen)} | ${'Type'.padEnd(12)} | ${'Classification'.padEnd(15)} | ${'Owner'.padEnd(maxOwnerLen)} | ${'Storage'.padEnd(10)} | ${'PII'} | ${'Records'}`,
  );
  console.log('-'.repeat(maxIdLen + maxNameLen + maxOwnerLen + 80));

  // Rows
  for (const dataset of datasets) {
    const pii = dataset.containsPersonalData ? 'Yes' : 'No';
    const records = dataset.recordCount ? dataset.recordCount.toLocaleString() : 'N/A';
    const deprecated = dataset.isDeprecated ? ' [DEPRECATED]' : '';

    console.log(
      `${dataset.datasetId.padEnd(maxIdLen)} | ${(dataset.name + deprecated).padEnd(maxNameLen)} | ${dataset.dataType.padEnd(12)} | ${dataset.classificationLevel.padEnd(15)} | ${dataset.ownerTeam.padEnd(maxOwnerLen)} | ${dataset.storageSystem.padEnd(10)} | ${pii.padEnd(3)} | ${records}`,
    );
  }

  console.log('');
  console.log(`Total: ${datasets.length} dataset(s)`);
  console.log('');
}

function formatJson(datasets: any[]) {
  console.log(JSON.stringify(datasets, null, 2));
}

function formatCsv(datasets: any[]) {
  // Header
  console.log(
    'ID,Name,Type,Classification,Owner,Email,Storage,Location,PII,Financial,Health,Tags,Records,Quality Score,Upstream,Downstream,Created,Deprecated',
  );

  // Rows
  for (const dataset of datasets) {
    const tags = dataset.tags.join(';');
    console.log(
      [
        dataset.datasetId,
        dataset.name,
        dataset.dataType,
        dataset.classificationLevel,
        dataset.ownerTeam,
        dataset.ownerEmail,
        dataset.storageSystem,
        dataset.storageLocation,
        dataset.containsPersonalData,
        dataset.containsFinancialData || false,
        dataset.containsHealthData || false,
        tags,
        dataset.recordCount || 0,
        dataset.dataQualityScore || 'N/A',
        dataset.upstreamCount,
        dataset.downstreamCount,
        dataset.createdAt,
        dataset.isDeprecated,
      ].join(','),
    );
  }
}

async function main() {
  const options = parseArgs();

  const pool = new Pool({
    connectionString: DEFAULT_DB_URL,
  });

  try {
    const catalogService = new CatalogService(pool);

    // Build filters
    const filters: DatasetQueryFilters = {};

    if (options.dataType) {
      filters.dataType = options.dataType as any;
    }
    if (options.classification) {
      filters.classificationLevel = options.classification as any;
    }
    if (options.owner) {
      filters.ownerTeam = options.owner;
    }
    if (options.storage) {
      filters.storageSystem = options.storage as any;
    }
    if (options.tags) {
      filters.tags = options.tags.split(',').map((t) => t.trim());
    }
    if (options.pii !== undefined) {
      filters.containsPersonalData = options.pii;
    }
    if (options.search) {
      filters.search = options.search;
    }

    // Fetch datasets
    const datasets = await catalogService.listDatasets(filters, options.limit);

    // Format output
    switch (options.format) {
      case 'json':
        formatJson(datasets);
        break;
      case 'csv':
        formatCsv(datasets);
        break;
      case 'table':
      default:
        formatTable(datasets);
        break;
    }
  } catch (error) {
    console.error('Error listing datasets:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
