/**
 * @fileoverview Expand/Contract Migration Pattern Implementation
 * Implements the expand/contract pattern for zero-downtime database migrations
 * with automated phase management and compatibility validation.
 */

import { EventEmitter } from 'events';
import {
  Migration,
  MigrationPhaseDefinition,
  MigrationPhase,
  MigrationContext,
} from './MigrationManager.js';

/**
 * Expand/Contract migration builder and executor
 */
export class ExpandContractMigration extends EventEmitter {
  private phases: Map<MigrationPhase, MigrationPhaseDefinition[]> = new Map();

  constructor() {
    super();
    this.initializePhases();
  }

  /**
   * Create expand/contract migration for column addition
   */
  static addColumn(options: {
    table: string;
    column: string;
    type: string;
    nullable?: boolean;
    defaultValue?: any;
    index?: boolean;
    unique?: boolean;
  }): ExpandContractMigration {
    const migration = new ExpandContractMigration();

    // Expand phase: Add new column
    migration.addExpandPhase({
      name: `Add column ${options.column}`,
      sql: migration.generateAddColumnSQL(options),
      validationQueries: [
        `SELECT column_name FROM information_schema.columns WHERE table_name = '${options.table}' AND column_name = '${options.column}'`,
      ],
    });

    // Migrate phase: Populate new column
    if (options.defaultValue !== undefined) {
      migration.addMigratePhase({
        name: `Populate column ${options.column}`,
        sql: `UPDATE ${options.table} SET ${options.column} = ${migration.formatValue(options.defaultValue)} WHERE ${options.column} IS NULL`,
        validationQueries: [
          `SELECT COUNT(*) as null_count FROM ${options.table} WHERE ${options.column} IS NULL`,
        ],
      });
    }

    // Contract phase: Add constraints if needed
    if (!options.nullable && options.defaultValue !== undefined) {
      migration.addContractPhase({
        name: `Add NOT NULL constraint to ${options.column}`,
        sql: `ALTER TABLE ${options.table} ALTER COLUMN ${options.column} SET NOT NULL`,
        rollbackSql: `ALTER TABLE ${options.table} ALTER COLUMN ${options.column} DROP NOT NULL`,
        validationQueries: [
          `SELECT is_nullable FROM information_schema.columns WHERE table_name = '${options.table}' AND column_name = '${options.column}'`,
        ],
      });
    }

    if (options.unique) {
      migration.addContractPhase({
        name: `Add UNIQUE constraint to ${options.column}`,
        sql: `ALTER TABLE ${options.table} ADD CONSTRAINT ${options.table}_${options.column}_unique UNIQUE (${options.column})`,
        rollbackSql: `ALTER TABLE ${options.table} DROP CONSTRAINT ${options.table}_${options.column}_unique`,
        validationQueries: [
          `SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = '${options.table}' AND constraint_type = 'UNIQUE'`,
        ],
      });
    }

    if (options.index) {
      migration.addContractPhase({
        name: `Create index on ${options.column}`,
        sql: `CREATE INDEX CONCURRENTLY idx_${options.table}_${options.column} ON ${options.table} (${options.column})`,
        rollbackSql: `DROP INDEX CONCURRENTLY IF EXISTS idx_${options.table}_${options.column}`,
        validationQueries: [
          `SELECT indexname FROM pg_indexes WHERE tablename = '${options.table}' AND indexname = 'idx_${options.table}_${options.column}'`,
        ],
      });
    }

    return migration;
  }

  /**
   * Create expand/contract migration for column removal
   */
  static removeColumn(options: {
    table: string;
    column: string;
    backupColumn?: string;
  }): ExpandContractMigration {
    const migration = new ExpandContractMigration();

    // Expand phase: Create backup column if specified
    if (options.backupColumn) {
      migration.addExpandPhase({
        name: `Create backup column ${options.backupColumn}`,
        sql: `ALTER TABLE ${options.table} ADD COLUMN ${options.backupColumn} TEXT`,
        validationQueries: [
          `SELECT column_name FROM information_schema.columns WHERE table_name = '${options.table}' AND column_name = '${options.backupColumn}'`,
        ],
      });

      migration.addMigratePhase({
        name: `Copy data to backup column`,
        sql: `UPDATE ${options.table} SET ${options.backupColumn} = ${options.column}::TEXT WHERE ${options.backupColumn} IS NULL`,
        validationQueries: [
          `SELECT COUNT(*) as backup_count FROM ${options.table} WHERE ${options.backupColumn} IS NOT NULL`,
        ],
      });
    }

    // Contract phase: Remove the original column
    migration.addContractPhase({
      name: `Remove column ${options.column}`,
      sql: `ALTER TABLE ${options.table} DROP COLUMN ${options.column}`,
      rollbackSql: options.backupColumn
        ? `ALTER TABLE ${options.table} ADD COLUMN ${options.column} TEXT; UPDATE ${options.table} SET ${options.column} = ${options.backupColumn}`
        : undefined,
      validationQueries: [
        `SELECT COUNT(*) as column_exists FROM information_schema.columns WHERE table_name = '${options.table}' AND column_name = '${options.column}'`,
      ],
    });

    return migration;
  }

  /**
   * Create expand/contract migration for table renaming
   */
  static renameTable(options: {
    oldName: string;
    newName: string;
    useView?: boolean;
  }): ExpandContractMigration {
    const migration = new ExpandContractMigration();

    if (options.useView) {
      // Expand phase: Create new table and copy data
      migration.addExpandPhase({
        name: `Create new table ${options.newName}`,
        sql: `CREATE TABLE ${options.newName} (LIKE ${options.oldName} INCLUDING ALL)`,
        validationQueries: [
          `SELECT table_name FROM information_schema.tables WHERE table_name = '${options.newName}'`,
        ],
      });

      migration.addMigratePhase({
        name: `Copy data to new table`,
        sql: `INSERT INTO ${options.newName} SELECT * FROM ${options.oldName}`,
        validationQueries: [
          `SELECT COUNT(*) as new_count FROM ${options.newName}`,
          `SELECT COUNT(*) as old_count FROM ${options.oldName}`,
        ],
      });

      migration.addMigratePhase({
        name: `Create view for old table name`,
        sql: `CREATE VIEW ${options.oldName}_view AS SELECT * FROM ${options.newName}`,
        rollbackSql: `DROP VIEW IF EXISTS ${options.oldName}_view`,
        validationQueries: [
          `SELECT table_name FROM information_schema.views WHERE table_name = '${options.oldName}_view'`,
        ],
      });

      // Contract phase: Drop old table and rename view
      migration.addContractPhase({
        name: `Drop old table and rename view`,
        sql: `DROP TABLE ${options.oldName}; ALTER VIEW ${options.oldName}_view RENAME TO ${options.oldName}`,
        rollbackSql: `ALTER VIEW ${options.oldName} RENAME TO ${options.oldName}_view; CREATE TABLE ${options.oldName} (LIKE ${options.newName} INCLUDING ALL)`,
        validationQueries: [
          `SELECT table_name FROM information_schema.tables WHERE table_name = '${options.oldName}'`,
        ],
      });
    } else {
      // Simple rename (requires brief downtime)
      migration.addMigratePhase({
        name: `Rename table ${options.oldName} to ${options.newName}`,
        sql: `ALTER TABLE ${options.oldName} RENAME TO ${options.newName}`,
        rollbackSql: `ALTER TABLE ${options.newName} RENAME TO ${options.oldName}`,
        validationQueries: [
          `SELECT table_name FROM information_schema.tables WHERE table_name = '${options.newName}'`,
        ],
      });
    }

    return migration;
  }

  /**
   * Create expand/contract migration for data type change
   */
  static changeColumnType(options: {
    table: string;
    column: string;
    oldType: string;
    newType: string;
    conversionExpression?: string;
    tempColumn?: string;
  }): ExpandContractMigration {
    const migration = new ExpandContractMigration();
    const tempCol = options.tempColumn || `${options.column}_new`;

    // Expand phase: Add new column with new type
    migration.addExpandPhase({
      name: `Add temporary column ${tempCol}`,
      sql: `ALTER TABLE ${options.table} ADD COLUMN ${tempCol} ${options.newType}`,
      validationQueries: [
        `SELECT data_type FROM information_schema.columns WHERE table_name = '${options.table}' AND column_name = '${tempCol}'`,
      ],
    });

    // Migrate phase: Convert data to new column
    const conversionExpr =
      options.conversionExpression || `${options.column}::${options.newType}`;
    migration.addMigratePhase({
      name: `Convert data to new type`,
      sql: `UPDATE ${options.table} SET ${tempCol} = ${conversionExpr} WHERE ${tempCol} IS NULL`,
      validationQueries: [
        `SELECT COUNT(*) as converted_count FROM ${options.table} WHERE ${tempCol} IS NOT NULL`,
      ],
    });

    // Contract phase: Replace old column with new one
    migration.addContractPhase({
      name: `Replace old column with new one`,
      sql: `ALTER TABLE ${options.table} DROP COLUMN ${options.column}; ALTER TABLE ${options.table} RENAME COLUMN ${tempCol} TO ${options.column}`,
      rollbackSql: `ALTER TABLE ${options.table} RENAME COLUMN ${options.column} TO ${tempCol}; ALTER TABLE ${options.table} ADD COLUMN ${options.column} ${options.oldType}`,
      validationQueries: [
        `SELECT data_type FROM information_schema.columns WHERE table_name = '${options.table}' AND column_name = '${options.column}'`,
      ],
    });

    return migration;
  }

  /**
   * Create expand/contract migration for index creation
   */
  static createIndex(options: {
    table: string;
    columns: string[];
    name?: string;
    unique?: boolean;
    partial?: string;
    concurrent?: boolean;
  }): ExpandContractMigration {
    const migration = new ExpandContractMigration();
    const indexName =
      options.name || `idx_${options.table}_${options.columns.join('_')}`;
    const uniqueClause = options.unique ? 'UNIQUE ' : '';
    const concurrentClause = options.concurrent ? 'CONCURRENTLY ' : '';
    const partialClause = options.partial ? ` WHERE ${options.partial}` : '';

    // Expand phase: Create index
    migration.addExpandPhase({
      name: `Create index ${indexName}`,
      sql: `CREATE ${uniqueClause}INDEX ${concurrentClause}${indexName} ON ${options.table} (${options.columns.join(', ')})${partialClause}`,
      rollbackSql: `DROP INDEX ${concurrentClause}IF EXISTS ${indexName}`,
      validationQueries: [
        `SELECT indexname FROM pg_indexes WHERE indexname = '${indexName}'`,
      ],
    });

    return migration;
  }

  /**
   * Create expand/contract migration for foreign key addition
   */
  static addForeignKey(options: {
    table: string;
    column: string;
    referencedTable: string;
    referencedColumn: string;
    name?: string;
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
    onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
  }): ExpandContractMigration {
    const migration = new ExpandContractMigration();
    const constraintName =
      options.name || `fk_${options.table}_${options.column}`;

    // Expand phase: Validate existing data
    migration.addExpandPhase({
      name: `Validate foreign key data`,
      sql: `SELECT 1`, // Placeholder - would contain actual validation
      validationQueries: [
        `SELECT COUNT(*) as invalid_refs FROM ${options.table} t 
         LEFT JOIN ${options.referencedTable} r ON t.${options.column} = r.${options.referencedColumn}
         WHERE t.${options.column} IS NOT NULL AND r.${options.referencedColumn} IS NULL`,
      ],
    });

    // Contract phase: Add foreign key constraint
    const onDeleteClause = options.onDelete
      ? ` ON DELETE ${options.onDelete}`
      : '';
    const onUpdateClause = options.onUpdate
      ? ` ON UPDATE ${options.onUpdate}`
      : '';

    migration.addContractPhase({
      name: `Add foreign key constraint`,
      sql: `ALTER TABLE ${options.table} ADD CONSTRAINT ${constraintName} 
            FOREIGN KEY (${options.column}) 
            REFERENCES ${options.referencedTable} (${options.referencedColumn})${onDeleteClause}${onUpdateClause}`,
      rollbackSql: `ALTER TABLE ${options.table} DROP CONSTRAINT ${constraintName}`,
      validationQueries: [
        `SELECT constraint_name FROM information_schema.table_constraints 
         WHERE table_name = '${options.table}' AND constraint_name = '${constraintName}'`,
      ],
    });

    return migration;
  }

  /**
   * Add expand phase
   */
  addExpandPhase(phase: Partial<MigrationPhaseDefinition>): this {
    return this.addPhase('expand', phase);
  }

  /**
   * Add migrate phase
   */
  addMigratePhase(phase: Partial<MigrationPhaseDefinition>): this {
    return this.addPhase('migrate', phase);
  }

  /**
   * Add contract phase
   */
  addContractPhase(phase: Partial<MigrationPhaseDefinition>): this {
    return this.addPhase('contract', phase);
  }

  /**
   * Add cleanup phase
   */
  addCleanupPhase(phase: Partial<MigrationPhaseDefinition>): this {
    return this.addPhase('cleanup', phase);
  }

  /**
   * Build final migration with all phases
   */
  build(migrationConfig: {
    id: string;
    version: string;
    name: string;
    description: string;
    author: string;
    targetTables: string[];
  }): Migration {
    const allPhases: MigrationPhaseDefinition[] = [];
    let order = 0;

    // Add phases in correct order: expand -> migrate -> contract -> cleanup
    for (const phaseType of [
      'expand',
      'migrate',
      'contract',
      'cleanup',
    ] as MigrationPhase[]) {
      const phases = this.phases.get(phaseType) || [];
      for (const phase of phases) {
        allPhases.push({
          ...phase,
          phase: phaseType,
          order: order++,
        });
      }
    }

    return {
      id: migrationConfig.id,
      version: migrationConfig.version,
      name: migrationConfig.name,
      description: migrationConfig.description,
      type: 'schema_change',
      strategy: 'expand_contract',
      riskLevel: 'medium',
      phases: allPhases,
      dependencies: [],
      rollbackPlan: {
        automatic: true,
        conditions: [
          {
            type: 'error_rate',
            threshold: 5, // 5% error rate
            window: 5, // 5 minutes
            enabled: true,
          },
          {
            type: 'timeout',
            threshold: 30, // 30 minutes
            window: 1,
            enabled: true,
          },
        ],
        strategy: 'phased',
        preserveData: true,
        backupRequired: true,
        rollbackPhases: this.generateRollbackPhases(allPhases),
      },
      validation: {
        pre_migration: [
          {
            name: 'Check table exists',
            query: `SELECT COUNT(*) as table_count FROM information_schema.tables 
                    WHERE table_name IN (${migrationConfig.targetTables.map((t) => `'${t}'`).join(', ')})`,
            expected_result: {
              table_count: migrationConfig.targetTables.length,
            },
            operator: 'equals',
            critical: true,
            timeout: 30,
          },
        ],
        post_migration: [
          {
            name: 'Verify no data loss',
            query: 'SELECT 1', // Would be customized per migration
            expected_result: { success: true },
            operator: 'equals',
            critical: true,
            timeout: 60,
          },
        ],
        continuous: [],
        data_integrity: migrationConfig.targetTables.map((table) => ({
          name: `${table} integrity check`,
          table,
          checks: {
            row_count: { min: 0 },
            foreign_key_integrity: true,
          },
        })),
      },
      metadata: {
        author: migrationConfig.author,
        reviewedBy: [],
        approvedBy: '',
        createdAt: new Date(),
        estimatedDuration: allPhases.reduce(
          (sum, phase) => sum + phase.timeout,
          0,
        ),
        targetTables: migrationConfig.targetTables,
        affectedRows: 0,
        requires_downtime: false,
      },
      tenant_specific: false,
      environments: ['development', 'staging', 'production'],
      lifecycle: {
        temporary: false,
      },
      analytics: {
        enabled: true,
        trackingEvents: [],
        customMetrics: [],
        cohortAnalysis: false,
        conversionTracking: {
          enabled: false,
          goalEvents: [],
        },
        sampling: {
          enabled: false,
          rate: 1.0,
        },
      },
      killSwitch: true,
    };
  }

  /**
   * Private helper methods
   */

  private initializePhases(): void {
    this.phases.set('expand', []);
    this.phases.set('migrate', []);
    this.phases.set('contract', []);
    this.phases.set('cleanup', []);
  }

  private addPhase(
    phaseType: MigrationPhase,
    phase: Partial<MigrationPhaseDefinition>,
  ): this {
    const phases = this.phases.get(phaseType) || [];

    const fullPhase: MigrationPhaseDefinition = {
      phase: phaseType,
      name: phase.name || `${phaseType} phase`,
      description: phase.description || '',
      sql: phase.sql || '',
      rollbackSql: phase.rollbackSql,
      validationQueries: phase.validationQueries || [],
      prerequisites: phase.prerequisites || [],
      timeout: phase.timeout || 30,
      retryable: phase.retryable || false,
      parallel: phase.parallel || false,
      order: phases.length,
    };

    phases.push(fullPhase);
    this.phases.set(phaseType, phases);

    return this;
  }

  private generateAddColumnSQL(options: {
    table: string;
    column: string;
    type: string;
    nullable?: boolean;
    defaultValue?: any;
  }): string {
    let sql = `ALTER TABLE ${options.table} ADD COLUMN ${options.column} ${options.type}`;

    if (options.defaultValue !== undefined) {
      sql += ` DEFAULT ${this.formatValue(options.defaultValue)}`;
    }

    if (options.nullable === false) {
      // Don't add NOT NULL immediately in expand phase - do it in contract phase
      // sql += ' NOT NULL';
    }

    return sql;
  }

  private formatValue(value: any): string {
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    } else if (typeof value === 'number') {
      return value.toString();
    } else if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    } else if (value === null || value === undefined) {
      return 'NULL';
    } else {
      return `'${JSON.stringify(value)}'`;
    }
  }

  private generateRollbackPhases(phases: MigrationPhaseDefinition[]): any[] {
    const rollbackPhases: any[] = [];

    // Generate rollback phases in reverse order
    const reversedPhases = [...phases].reverse();

    for (let i = 0; i < reversedPhases.length; i++) {
      const phase = reversedPhases[i];

      if (phase.rollbackSql) {
        rollbackPhases.push({
          order: i,
          name: `Rollback ${phase.name}`,
          sql: phase.rollbackSql,
          validation: phase.validationQueries,
          timeout: phase.timeout,
        });
      }
    }

    return rollbackPhases;
  }
}

/**
 * Expand/Contract migration examples and templates
 */
export class ExpandContractMigrationTemplates {
  /**
   * Template for adding a new required column with default value
   */
  static addRequiredColumn(
    table: string,
    column: string,
    type: string,
    defaultValue: any,
  ): ExpandContractMigration {
    return ExpandContractMigration.addColumn({
      table,
      column,
      type,
      nullable: false,
      defaultValue,
      index: true,
    });
  }

  /**
   * Template for splitting a column into multiple columns
   */
  static splitColumn(options: {
    table: string;
    sourceColumn: string;
    targetColumns: Array<{
      name: string;
      type: string;
      extractExpression: string;
    }>;
  }): ExpandContractMigration {
    const migration = new ExpandContractMigration();

    // Expand phase: Add new columns
    for (const targetCol of options.targetColumns) {
      migration.addExpandPhase({
        name: `Add column ${targetCol.name}`,
        sql: `ALTER TABLE ${options.table} ADD COLUMN ${targetCol.name} ${targetCol.type}`,
        validationQueries: [
          `SELECT column_name FROM information_schema.columns WHERE table_name = '${options.table}' AND column_name = '${targetCol.name}'`,
        ],
      });
    }

    // Migrate phase: Populate new columns
    for (const targetCol of options.targetColumns) {
      migration.addMigratePhase({
        name: `Populate column ${targetCol.name}`,
        sql: `UPDATE ${options.table} SET ${targetCol.name} = ${targetCol.extractExpression} WHERE ${targetCol.name} IS NULL`,
        validationQueries: [
          `SELECT COUNT(*) as populated_count FROM ${options.table} WHERE ${targetCol.name} IS NOT NULL`,
        ],
      });
    }

    // Contract phase: Remove source column
    migration.addContractPhase({
      name: `Remove source column ${options.sourceColumn}`,
      sql: `ALTER TABLE ${options.table} DROP COLUMN ${options.sourceColumn}`,
      validationQueries: [
        `SELECT COUNT(*) as column_exists FROM information_schema.columns WHERE table_name = '${options.table}' AND column_name = '${options.sourceColumn}'`,
      ],
    });

    return migration;
  }

  /**
   * Template for normalizing data into a new table
   */
  static normalizeData(options: {
    sourceTable: string;
    targetTable: string;
    sourceColumn: string;
    normalizedColumns: string[];
    foreignKeyColumn: string;
  }): ExpandContractMigration {
    const migration = new ExpandContractMigration();

    // Expand phase: Create normalized table
    migration.addExpandPhase({
      name: `Create normalized table ${options.targetTable}`,
      sql: `CREATE TABLE ${options.targetTable} (
        id SERIAL PRIMARY KEY,
        ${options.normalizedColumns.map((col) => `${col} TEXT`).join(', ')},
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      validationQueries: [
        `SELECT table_name FROM information_schema.tables WHERE table_name = '${options.targetTable}'`,
      ],
    });

    // Migrate phase: Populate normalized table
    migration.addMigratePhase({
      name: `Populate normalized table`,
      sql: `INSERT INTO ${options.targetTable} (${options.normalizedColumns.join(', ')}) 
            SELECT DISTINCT ${options.normalizedColumns.join(', ')} 
            FROM ${options.sourceTable} 
            WHERE ${options.sourceColumn} IS NOT NULL`,
      validationQueries: [
        `SELECT COUNT(*) as normalized_count FROM ${options.targetTable}`,
      ],
    });

    // Migrate phase: Add foreign key column to source table
    migration.addMigratePhase({
      name: `Add foreign key column to source table`,
      sql: `ALTER TABLE ${options.sourceTable} ADD COLUMN ${options.foreignKeyColumn} INTEGER`,
      validationQueries: [
        `SELECT column_name FROM information_schema.columns WHERE table_name = '${options.sourceTable}' AND column_name = '${options.foreignKeyColumn}'`,
      ],
    });

    // Migrate phase: Populate foreign key column
    migration.addMigratePhase({
      name: `Populate foreign key references`,
      sql: `UPDATE ${options.sourceTable} s 
            SET ${options.foreignKeyColumn} = t.id 
            FROM ${options.targetTable} t 
            WHERE ${options.normalizedColumns.map((col) => `s.${col} = t.${col}`).join(' AND ')}`,
      validationQueries: [
        `SELECT COUNT(*) as updated_refs FROM ${options.sourceTable} WHERE ${options.foreignKeyColumn} IS NOT NULL`,
      ],
    });

    // Contract phase: Add foreign key constraint
    migration.addContractPhase({
      name: `Add foreign key constraint`,
      sql: `ALTER TABLE ${options.sourceTable} 
            ADD CONSTRAINT fk_${options.sourceTable}_${options.foreignKeyColumn} 
            FOREIGN KEY (${options.foreignKeyColumn}) REFERENCES ${options.targetTable} (id)`,
      rollbackSql: `ALTER TABLE ${options.sourceTable} DROP CONSTRAINT fk_${options.sourceTable}_${options.foreignKeyColumn}`,
      validationQueries: [
        `SELECT constraint_name FROM information_schema.table_constraints WHERE constraint_name = 'fk_${options.sourceTable}_${options.foreignKeyColumn}'`,
      ],
    });

    // Contract phase: Remove denormalized columns
    for (const col of options.normalizedColumns) {
      migration.addContractPhase({
        name: `Remove denormalized column ${col}`,
        sql: `ALTER TABLE ${options.sourceTable} DROP COLUMN ${col}`,
        validationQueries: [
          `SELECT COUNT(*) as column_exists FROM information_schema.columns WHERE table_name = '${options.sourceTable}' AND column_name = '${col}'`,
        ],
      });
    }

    return migration;
  }

  /**
   * Template for partitioning a large table
   */
  static partitionTable(options: {
    table: string;
    partitionColumn: string;
    partitionType: 'range' | 'list' | 'hash';
    partitions: Array<{
      name: string;
      condition: string;
    }>;
  }): ExpandContractMigration {
    const migration = new ExpandContractMigration();

    // Expand phase: Create partitioned table
    migration.addExpandPhase({
      name: `Create partitioned table ${options.table}_partitioned`,
      sql: `CREATE TABLE ${options.table}_partitioned (LIKE ${options.table} INCLUDING ALL) 
            PARTITION BY ${options.partitionType.toUpperCase()} (${options.partitionColumn})`,
      validationQueries: [
        `SELECT table_name FROM information_schema.tables WHERE table_name = '${options.table}_partitioned'`,
      ],
    });

    // Expand phase: Create partitions
    for (const partition of options.partitions) {
      migration.addExpandPhase({
        name: `Create partition ${partition.name}`,
        sql: `CREATE TABLE ${partition.name} PARTITION OF ${options.table}_partitioned FOR VALUES ${partition.condition}`,
        validationQueries: [
          `SELECT schemaname, tablename FROM pg_tables WHERE tablename = '${partition.name}'`,
        ],
      });
    }

    // Migrate phase: Copy data to partitioned table
    migration.addMigratePhase({
      name: `Copy data to partitioned table`,
      sql: `INSERT INTO ${options.table}_partitioned SELECT * FROM ${options.table}`,
      validationQueries: [
        `SELECT COUNT(*) as partitioned_count FROM ${options.table}_partitioned`,
        `SELECT COUNT(*) as original_count FROM ${options.table}`,
      ],
    });

    // Contract phase: Replace original table
    migration.addContractPhase({
      name: `Replace original table with partitioned version`,
      sql: `DROP TABLE ${options.table}; ALTER TABLE ${options.table}_partitioned RENAME TO ${options.table}`,
      rollbackSql: `ALTER TABLE ${options.table} RENAME TO ${options.table}_partitioned; CREATE TABLE ${options.table} (LIKE ${options.table}_partitioned INCLUDING ALL)`,
      validationQueries: [
        `SELECT table_name FROM information_schema.tables WHERE table_name = '${options.table}'`,
      ],
    });

    return migration;
  }
}
