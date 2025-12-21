import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('data_catalog_assets', {
    id: { type: 'uuid', primaryKey: true },
    urn: { type: 'text', notNull: true, unique: true },
    name: { type: 'text', notNull: true },
    description: { type: 'text' },
    type: { type: 'text', notNull: true },
    source: { type: 'text', notNull: true },
    schema: { type: 'jsonb', notNull: true },
    owners: { type: 'text[]', notNull: true, default: '{}' },
    tags: { type: 'text[]', notNull: true, default: '{}' },
    sensitivity: { type: 'text', notNull: true, default: 'internal' },
    metadata: { type: 'jsonb', notNull: true, default: '{}' },
    tenant_id: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('data_catalog_assets', ['tenant_id', 'urn']);
  pgm.createIndex('data_catalog_assets', ['tenant_id', 'name']);

  pgm.createTable('data_quality_rules', {
    id: { type: 'uuid', primaryKey: true },
    asset_id: { type: 'uuid', notNull: true, references: 'data_catalog_assets', onDelete: 'CASCADE' },
    name: { type: 'text', notNull: true },
    type: { type: 'text', notNull: true },
    params: { type: 'jsonb', notNull: true, default: '{}' },
    criticality: { type: 'text', notNull: true },
    tenant_id: { type: 'text', notNull: true },
  });

  pgm.createIndex('data_quality_rules', ['asset_id']);

  pgm.createTable('data_quality_results', {
    id: { type: 'uuid', primaryKey: true },
    rule_id: { type: 'uuid', notNull: true, references: 'data_quality_rules', onDelete: 'CASCADE' },
    asset_id: { type: 'uuid', notNull: true, references: 'data_catalog_assets', onDelete: 'CASCADE' },
    passed: { type: 'boolean', notNull: true },
    observed_value: { type: 'jsonb' },
    details: { type: 'text' },
    executed_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    tenant_id: { type: 'text', notNull: true },
  });

  pgm.createIndex('data_quality_results', ['asset_id', 'executed_at']);

  pgm.createTable('data_governance_policies', {
    id: { type: 'uuid', primaryKey: true },
    name: { type: 'text', notNull: true },
    description: { type: 'text' },
    rules: { type: 'jsonb', notNull: true },
    actions: { type: 'jsonb', notNull: true },
    tenant_id: { type: 'text', notNull: true },
  });

  pgm.createIndex('data_governance_policies', ['tenant_id']);

  // Lineage Tables
  pgm.createTable('lineage_nodes', {
      id: { type: 'uuid', primaryKey: true },
      asset_id: { type: 'uuid', notNull: true, references: 'data_catalog_assets', onDelete: 'CASCADE' },
      name: { type: 'text', notNull: true },
      type: { type: 'text', notNull: true },
      tenant_id: { type: 'text', notNull: true },
  });
  pgm.createIndex('lineage_nodes', ['asset_id']);

  pgm.createTable('lineage_edges', {
      id: { type: 'uuid', primaryKey: true },
      source_node_id: { type: 'uuid', notNull: true, references: 'lineage_nodes', onDelete: 'CASCADE' },
      target_node_id: { type: 'uuid', notNull: true, references: 'lineage_nodes', onDelete: 'CASCADE' },
      relation_type: { type: 'text', notNull: true },
      tenant_id: { type: 'text', notNull: true },
  });
  pgm.createIndex('lineage_edges', ['source_node_id']);
  pgm.createIndex('lineage_edges', ['target_node_id']);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('lineage_edges');
  pgm.dropTable('lineage_nodes');
  pgm.dropTable('data_governance_policies');
  pgm.dropTable('data_quality_results');
  pgm.dropTable('data_quality_rules');
  pgm.dropTable('data_catalog_assets');
}
