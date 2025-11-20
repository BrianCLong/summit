#!/usr/bin/env node
/**
 * Initialize catalog with golden path datasets
 * Usage: node scripts/catalog-init.ts
 */

import { Pool } from 'pg';
import { CatalogService } from '../server/src/catalog/CatalogService.js';
import { DatasetRegistration } from '../server/src/catalog/types.js';

const DEFAULT_DB_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/maestro';

/**
 * Golden path dataset definitions
 */
const GOLDEN_PATH_DATASETS: DatasetRegistration[] = [
  {
    datasetId: 'users',
    name: 'Users',
    description: 'Core user accounts and authentication data',
    dataType: 'audit',
    classificationLevel: 'confidential',
    ownerTeam: 'platform-engineering',
    ownerEmail: 'platform@intelgraph.ai',
    storageSystem: 'postgres',
    storageLocation: 'maestro.users',
    schemaDefinition: [
      {
        name: 'id',
        type: 'UUID',
        nullable: false,
        description: 'Unique user identifier',
      },
      {
        name: 'organization_id',
        type: 'UUID',
        nullable: false,
        description: 'Organization the user belongs to',
      },
      {
        name: 'email',
        type: 'VARCHAR(255)',
        nullable: false,
        description: 'User email address',
        pii: true,
        encrypted: true,
      },
      {
        name: 'name',
        type: 'VARCHAR(255)',
        nullable: false,
        description: 'User full name',
        pii: true,
      },
      {
        name: 'role',
        type: 'VARCHAR(50)',
        nullable: false,
        description: 'User role (admin, editor, viewer)',
      },
      {
        name: 'permissions',
        type: 'JSONB',
        nullable: false,
        description: 'User permissions array',
      },
      {
        name: 'oidc_subject',
        type: 'VARCHAR(255)',
        nullable: true,
        description: 'OIDC subject identifier',
      },
      {
        name: 'created_at',
        type: 'TIMESTAMP WITH TIME ZONE',
        nullable: false,
        description: 'Account creation timestamp',
      },
      {
        name: 'last_login_at',
        type: 'TIMESTAMP WITH TIME ZONE',
        nullable: true,
        description: 'Last successful login timestamp',
      },
    ],
    containsPersonalData: true,
    containsFinancialData: false,
    containsHealthData: false,
    jurisdiction: ['US', 'EU'],
    tags: ['pii', 'users', 'golden-path', 'audit'],
    licenseId: 'intelgraph-platform-license',
    authorityRequirements: ['LICENSE', 'TOS'],
    retentionDays: 2555, // 7 years
    retentionPolicyId: 'audit-7yr',
  },
  {
    datasetId: 'organizations',
    name: 'Organizations',
    description: 'Tenant organizations and subscription data',
    dataType: 'analytics',
    classificationLevel: 'internal',
    ownerTeam: 'platform-engineering',
    ownerEmail: 'platform@intelgraph.ai',
    storageSystem: 'postgres',
    storageLocation: 'maestro.organizations',
    schemaDefinition: [
      {
        name: 'id',
        type: 'UUID',
        nullable: false,
        description: 'Unique organization identifier',
      },
      {
        name: 'name',
        type: 'VARCHAR(255)',
        nullable: false,
        description: 'Organization name',
      },
      {
        name: 'slug',
        type: 'VARCHAR(100)',
        nullable: false,
        description: 'URL-safe organization identifier',
      },
      {
        name: 'domain',
        type: 'VARCHAR(255)',
        nullable: true,
        description: 'Organization domain',
      },
      {
        name: 'subscription_tier',
        type: 'VARCHAR(50)',
        nullable: false,
        description: 'Subscription tier (free, pro, enterprise)',
      },
      {
        name: 'settings',
        type: 'JSONB',
        nullable: false,
        description: 'Organization settings',
      },
      {
        name: 'created_at',
        type: 'TIMESTAMP WITH TIME ZONE',
        nullable: false,
        description: 'Organization creation timestamp',
      },
    ],
    containsPersonalData: false,
    containsFinancialData: false,
    containsHealthData: false,
    jurisdiction: ['US'],
    tags: ['organizations', 'golden-path', 'operational'],
    licenseId: 'intelgraph-platform-license',
    retentionDays: 1095, // 3 years
    retentionPolicyId: 'operational-3yr',
  },
  {
    datasetId: 'projects',
    name: 'Projects',
    description: 'User projects and graph databases',
    dataType: 'analytics',
    classificationLevel: 'internal',
    ownerTeam: 'platform-engineering',
    ownerEmail: 'platform@intelgraph.ai',
    storageSystem: 'postgres',
    storageLocation: 'maestro.projects',
    schemaDefinition: [
      {
        name: 'id',
        type: 'UUID',
        nullable: false,
        description: 'Unique project identifier',
      },
      {
        name: 'organization_id',
        type: 'UUID',
        nullable: false,
        description: 'Organization owning the project',
      },
      {
        name: 'name',
        type: 'VARCHAR(255)',
        nullable: false,
        description: 'Project name',
      },
      {
        name: 'description',
        type: 'TEXT',
        nullable: true,
        description: 'Project description',
      },
      {
        name: 'neo4j_database',
        type: 'VARCHAR(100)',
        nullable: true,
        description: 'Associated Neo4j database name',
      },
      {
        name: 'status',
        type: 'VARCHAR(50)',
        nullable: false,
        description: 'Project status (active, archived)',
      },
      {
        name: 'created_at',
        type: 'TIMESTAMP WITH TIME ZONE',
        nullable: false,
        description: 'Project creation timestamp',
      },
    ],
    containsPersonalData: false,
    containsFinancialData: false,
    containsHealthData: false,
    jurisdiction: ['US'],
    tags: ['projects', 'golden-path', 'operational'],
    licenseId: 'intelgraph-platform-license',
    retentionDays: 1095, // 3 years
    retentionPolicyId: 'operational-3yr',
  },
  {
    datasetId: 'ingestion_jobs',
    name: 'Ingestion Jobs',
    description: 'ETL and data ingestion job configurations',
    dataType: 'analytics',
    classificationLevel: 'internal',
    ownerTeam: 'data-engineering',
    ownerEmail: 'data-eng@intelgraph.ai',
    storageSystem: 'postgres',
    storageLocation: 'maestro.ingestion_jobs',
    schemaDefinition: [
      {
        name: 'id',
        type: 'UUID',
        nullable: false,
        description: 'Unique job identifier',
      },
      {
        name: 'project_id',
        type: 'UUID',
        nullable: false,
        description: 'Project the job belongs to',
      },
      {
        name: 'name',
        type: 'VARCHAR(255)',
        nullable: false,
        description: 'Job name',
      },
      {
        name: 'source_type',
        type: 'VARCHAR(100)',
        nullable: false,
        description: 'Data source type (csv, api, database, etc.)',
      },
      {
        name: 'source_config',
        type: 'JSONB',
        nullable: false,
        description: 'Source configuration',
      },
      {
        name: 'mapping_config',
        type: 'JSONB',
        nullable: false,
        description: 'Data mapping configuration',
      },
      {
        name: 'schedule',
        type: 'VARCHAR(100)',
        nullable: true,
        description: 'Cron schedule for recurring jobs',
      },
      {
        name: 'status',
        type: 'VARCHAR(50)',
        nullable: false,
        description: 'Job status (active, paused, failed)',
      },
      {
        name: 'created_at',
        type: 'TIMESTAMP WITH TIME ZONE',
        nullable: false,
        description: 'Job creation timestamp',
      },
    ],
    containsPersonalData: false,
    containsFinancialData: false,
    containsHealthData: false,
    jurisdiction: ['US'],
    tags: ['etl', 'pipelines', 'golden-path', 'operational'],
    licenseId: 'intelgraph-platform-license',
    retentionDays: 1095, // 3 years
    retentionPolicyId: 'operational-3yr',
  },
  {
    datasetId: 'graph_entities',
    name: 'Graph Entities',
    description: 'Knowledge graph entities (persons, organizations, events)',
    dataType: 'analytics',
    classificationLevel: 'confidential',
    ownerTeam: 'data-engineering',
    ownerEmail: 'data-eng@intelgraph.ai',
    storageSystem: 'neo4j',
    storageLocation: 'neo4j://entities',
    schemaDefinition: [
      {
        name: 'id',
        type: 'STRING',
        nullable: false,
        description: 'Unique entity identifier',
      },
      {
        name: 'type',
        type: 'STRING',
        nullable: false,
        description: 'Entity type (Person, Organization, Event, etc.)',
      },
      {
        name: 'props',
        type: 'MAP',
        nullable: false,
        description: 'Entity properties',
      },
      {
        name: '_provenance',
        type: 'MAP',
        nullable: true,
        description: 'Provenance metadata',
      },
    ],
    containsPersonalData: true,
    containsFinancialData: false,
    containsHealthData: false,
    jurisdiction: ['US'],
    tags: ['entities', 'graph', 'pii', 'golden-path'],
    licenseId: 'intelgraph-platform-license',
    authorityRequirements: ['LICENSE', 'WARRANT'],
    retentionDays: 1095, // 3 years
    retentionPolicyId: 'operational-3yr',
  },
  {
    datasetId: 'graph_relationships',
    name: 'Graph Relationships',
    description: 'Knowledge graph relationships between entities',
    dataType: 'analytics',
    classificationLevel: 'confidential',
    ownerTeam: 'data-engineering',
    ownerEmail: 'data-eng@intelgraph.ai',
    storageSystem: 'neo4j',
    storageLocation: 'neo4j://relationships',
    schemaDefinition: [
      {
        name: 'id',
        type: 'STRING',
        nullable: false,
        description: 'Unique relationship identifier',
      },
      {
        name: 'type',
        type: 'STRING',
        nullable: false,
        description: 'Relationship type (KNOWS, WORKS_AT, ATTENDED, etc.)',
      },
      {
        name: 'source',
        type: 'STRING',
        nullable: false,
        description: 'Source entity ID',
      },
      {
        name: 'target',
        type: 'STRING',
        nullable: false,
        description: 'Target entity ID',
      },
      {
        name: 'props',
        type: 'MAP',
        nullable: false,
        description: 'Relationship properties',
      },
      {
        name: '_provenance',
        type: 'MAP',
        nullable: true,
        description: 'Provenance metadata',
      },
    ],
    containsPersonalData: true,
    containsFinancialData: false,
    containsHealthData: false,
    jurisdiction: ['US'],
    tags: ['relationships', 'graph', 'pii', 'golden-path'],
    licenseId: 'intelgraph-platform-license',
    authorityRequirements: ['LICENSE', 'WARRANT'],
    retentionDays: 1095, // 3 years
    retentionPolicyId: 'operational-3yr',
  },
  {
    datasetId: 'openlineage_events',
    name: 'OpenLineage Events',
    description: 'Data lineage events from pipelines and transformations',
    dataType: 'audit',
    classificationLevel: 'internal',
    ownerTeam: 'data-engineering',
    ownerEmail: 'data-eng@intelgraph.ai',
    storageSystem: 'postgres',
    storageLocation: 'maestro.openlineage_events',
    schemaDefinition: [
      {
        name: 'id',
        type: 'UUID',
        nullable: false,
        description: 'Unique event identifier',
      },
      {
        name: 'event_type',
        type: 'VARCHAR(50)',
        nullable: false,
        description: 'Event type (START, COMPLETE, FAIL)',
      },
      {
        name: 'job_name',
        type: 'VARCHAR(255)',
        nullable: false,
        description: 'Job name',
      },
      {
        name: 'run_id',
        type: 'VARCHAR(255)',
        nullable: false,
        description: 'Run identifier',
      },
      {
        name: 'inputs',
        type: 'JSONB',
        nullable: false,
        description: 'Input datasets',
      },
      {
        name: 'outputs',
        type: 'JSONB',
        nullable: false,
        description: 'Output datasets',
      },
      {
        name: 'event_time',
        type: 'TIMESTAMP WITH TIME ZONE',
        nullable: false,
        description: 'Event timestamp',
      },
    ],
    containsPersonalData: false,
    containsFinancialData: false,
    containsHealthData: false,
    jurisdiction: ['US'],
    tags: ['lineage', 'audit', 'golden-path'],
    licenseId: 'intelgraph-platform-license',
    retentionDays: 2555, // 7 years
    retentionPolicyId: 'audit-7yr',
  },
  {
    datasetId: 'provenance_claims',
    name: 'Provenance Claims',
    description: 'Provenance claims for audit and compliance',
    dataType: 'audit',
    classificationLevel: 'restricted',
    ownerTeam: 'compliance',
    ownerEmail: 'compliance@intelgraph.ai',
    storageSystem: 'postgres',
    storageLocation: 'provenance.claims',
    schemaDefinition: [
      {
        name: 'id',
        type: 'UUID',
        nullable: false,
        description: 'Unique claim identifier',
      },
      {
        name: 'claim_type',
        type: 'VARCHAR(100)',
        nullable: false,
        description: 'Type of claim',
      },
      {
        name: 'subject',
        type: 'VARCHAR(255)',
        nullable: false,
        description: 'Claim subject',
      },
      {
        name: 'predicate',
        type: 'VARCHAR(255)',
        nullable: false,
        description: 'Claim predicate',
      },
      {
        name: 'object',
        type: 'TEXT',
        nullable: false,
        description: 'Claim object',
      },
      {
        name: 'confidence',
        type: 'NUMERIC(3,2)',
        nullable: false,
        description: 'Claim confidence score',
      },
      {
        name: 'created_at',
        type: 'TIMESTAMP WITH TIME ZONE',
        nullable: false,
        description: 'Claim creation timestamp',
      },
    ],
    containsPersonalData: true,
    containsFinancialData: false,
    containsHealthData: false,
    jurisdiction: ['US'],
    tags: ['provenance', 'audit', 'golden-path'],
    licenseId: 'intelgraph-platform-license',
    authorityRequirements: ['ADMIN_AUTH', 'WARRANT'],
    retentionDays: 2555, // 7 years
    retentionPolicyId: 'audit-7yr',
  },
];

async function main() {
  const pool = new Pool({
    connectionString: DEFAULT_DB_URL,
  });

  console.log('');
  console.log('='.repeat(80));
  console.log('Initializing Data Catalog with Golden Path Datasets');
  console.log('='.repeat(80));
  console.log('');

  try {
    const catalogService = new CatalogService(pool);

    let registered = 0;
    let skipped = 0;
    let failed = 0;

    for (const dataset of GOLDEN_PATH_DATASETS) {
      try {
        // Check if dataset already exists
        const existing = await catalogService.getDataset(dataset.datasetId);

        if (existing) {
          console.log(`⊘ Skipped: ${dataset.datasetId} (already exists)`);
          skipped++;
          continue;
        }

        // Register dataset
        await catalogService.registerDataset(dataset);
        console.log(`✓ Registered: ${dataset.datasetId}`);
        registered++;
      } catch (error) {
        console.error(`✗ Failed: ${dataset.datasetId} - ${error.message}`);
        failed++;
      }
    }

    console.log('');
    console.log('Summary:');
    console.log(`  Registered: ${registered}`);
    console.log(`  Skipped:    ${skipped}`);
    console.log(`  Failed:     ${failed}`);
    console.log('');

    // Add some example lineage edges
    if (registered > 0) {
      console.log('Creating lineage edges...');

      try {
        await catalogService.recordLineage(
          'ingestion_jobs',
          'graph_entities',
          'extract',
          'Extract entities from ingestion jobs',
          'entity-extraction-pipeline',
        );
        console.log('✓ Lineage: ingestion_jobs → graph_entities');

        await catalogService.recordLineage(
          'graph_entities',
          'graph_relationships',
          'transform',
          'Infer relationships from entities',
          'relationship-inference-pipeline',
        );
        console.log('✓ Lineage: graph_entities → graph_relationships');

        await catalogService.recordLineage(
          'ingestion_jobs',
          'openlineage_events',
          'load',
          'Log lineage events from ingestion',
          'lineage-tracking-service',
        );
        console.log('✓ Lineage: ingestion_jobs → openlineage_events');
      } catch (error) {
        console.warn(`Warning: Could not create lineage edges: ${error.message}`);
      }

      console.log('');
    }

    console.log('='.repeat(80));
    console.log('Catalog initialization complete!');
    console.log('');
    console.log('Next steps:');
    console.log('  • Run "make catalog:list" to browse datasets');
    console.log('  • Run "make catalog:show DATASET_ID=users" to view dataset details');
    console.log('  • Run "make catalog:stats" to view catalog statistics');
    console.log('');
    console.log('='.repeat(80));
    console.log('');
  } catch (error) {
    console.error('Error initializing catalog:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
