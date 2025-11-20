#!/usr/bin/env node
/**
 * CLI tool to show catalog statistics
 * Usage: node scripts/catalog-stats.ts
 */

import { Pool } from 'pg';
import { CatalogService } from '../server/src/catalog/CatalogService.js';

const DEFAULT_DB_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/maestro';

async function main() {
  const pool = new Pool({
    connectionString: DEFAULT_DB_URL,
  });

  try {
    const catalogService = new CatalogService(pool);
    const stats = await catalogService.getStats();

    console.log('');
    console.log('='.repeat(80));
    console.log('Data Catalog Statistics');
    console.log('='.repeat(80));
    console.log('');

    console.log(`Total Datasets:          ${stats.totalDatasets}`);
    console.log(`Datasets with PII:       ${stats.datasetsWithPII}`);
    console.log(`Deprecated Datasets:     ${stats.deprecatedDatasets}`);
    console.log(`Total Records:           ${stats.totalRecords.toLocaleString()}`);
    console.log(`Avg Quality Score:       ${(stats.averageQualityScore * 100).toFixed(1)}%`);
    console.log('');

    console.log('Datasets by Type:');
    for (const [type, count] of Object.entries(stats.datasetsByType)) {
      console.log(`  ${type.padEnd(20)} ${count}`);
    }
    console.log('');

    console.log('Datasets by Classification:');
    for (const [level, count] of Object.entries(stats.datasetsByClassification)) {
      console.log(`  ${level.padEnd(20)} ${count}`);
    }
    console.log('');

    console.log('Datasets by Storage System:');
    for (const [system, count] of Object.entries(stats.datasetsByStorageSystem)) {
      console.log(`  ${system.padEnd(20)} ${count}`);
    }
    console.log('');

    console.log(`Last Updated:            ${stats.lastUpdated}`);
    console.log('');
    console.log('='.repeat(80));
    console.log('');
  } catch (error) {
    console.error('Error fetching catalog statistics:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
