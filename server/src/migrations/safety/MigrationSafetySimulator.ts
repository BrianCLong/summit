import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

export type MigrationDirection = 'up' | 'down';

export interface UnsafePattern {
  pattern: string;
  severity: 'warning' | 'error';
  detail: string;
  suggestion: string;
  direction: MigrationDirection;
  statement: string;
}

export interface SimulationStep {
  action: 'apply' | 'rollback' | 'reapply';
  direction: MigrationDirection;
  status: 'passed' | 'failed';
  durationMs: number;
  affectedRows?: number | null;
  error?: string;
}

export interface MigrationSimulationResult {
  file: string;
  status: 'passed' | 'failed';
  steps: SimulationStep[];
  unsafePatterns: UnsafePattern[];
  patchGenerated?: string;
  message?: string;
}

export interface MigrationSafetyReport {
  startedAt: string;
  finishedAt: string;
  migrations: MigrationSimulationResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    unsafeFindings: number;
    patchesGenerated: number;
  };
}

export interface MigrationSafetyOptions {
  migrationsDir: string;
  connectionString: string;
  reportDir: string;
  patchDir: string;
  targetMigration?: string;
  continueOnError?: boolean;
}

export class MigrationSafetySimulator {
  private readonly migrationsDir: string;
  private readonly connectionString: string;
  private readonly reportDir: string;
  private readonly patchDir: string;
  private readonly targetMigration?: string;
  private readonly continueOnError: boolean;

  constructor(options: MigrationSafetyOptions) {
    this.migrationsDir = options.migrationsDir;
    this.connectionString = options.connectionString;
    this.reportDir = options.reportDir;
    this.patchDir = options.patchDir;
    this.targetMigration = options.targetMigration;
    this.continueOnError = Boolean(options.continueOnError);
  }

  async run(): Promise<MigrationSafetyReport> {
    this.ensureDirectories();
    const migrations = this.loadMigrationFiles();

    const client = new Client({ connectionString: this.connectionString });
    const startedAt = new Date();
    const migrationResults: MigrationSimulationResult[] = [];

    await client.connect();
    await client.query('BEGIN');

    try {
      for (const migration of migrations) {
        const result = await this.simulateMigration(client, migration);
        migrationResults.push(result);

        if (result.status === 'failed' && !this.continueOnError) {
          break;
        }
      }
    } finally {
      await client.query('ROLLBACK');
      await client.end();
    }

    const finishedAt = new Date();
    const report: MigrationSafetyReport = {
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      migrations: migrationResults,
      summary: {
        total: migrationResults.length,
        passed: migrationResults.filter((m) => m.status === 'passed').length,
        failed: migrationResults.filter((m) => m.status === 'failed').length,
        unsafeFindings: migrationResults.reduce(
          (sum, m) => sum + m.unsafePatterns.length,
          0,
        ),
        patchesGenerated: migrationResults.filter((m) => Boolean(m.patchGenerated))
          .length,
      },
    };

    this.writeReport(report);

    return report;
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }

    if (!fs.existsSync(this.patchDir)) {
      fs.mkdirSync(this.patchDir, { recursive: true });
    }
  }

  private loadMigrationFiles(): string[] {
    const files = fs
      .readdirSync(this.migrationsDir)
      .filter((file) => file.endsWith('.sql') && !file.endsWith('.down.sql'))
      .sort();

    if (this.targetMigration) {
      if (!files.includes(this.targetMigration)) {
        throw new Error(
          `Target migration ${this.targetMigration} not found in ${this.migrationsDir}`,
        );
      }
      return [this.targetMigration];
    }

    return files;
  }

  private readSqlFile(filepath: string): string {
    const content = fs.readFileSync(filepath, 'utf8');

    return content
      .replace(/^\s*BEGIN\s*;\s*$/gim, '')
      .replace(/^\s*COMMIT\s*;\s*$/gim, '')
      .replace(/^\s*ROLLBACK\s*;\s*$/gim, '');
  }

  private async simulateMigration(
    client: Client,
    migrationFile: string,
  ): Promise<MigrationSimulationResult> {
    const upPath = path.join(this.migrationsDir, migrationFile);
    const downPath = path.join(
      this.migrationsDir,
      migrationFile.replace('.sql', '.down.sql'),
    );

    const hasDown = fs.existsSync(downPath);
    const upSql = this.readSqlFile(upPath);
    const downSql = hasDown ? this.readSqlFile(downPath) : '';

    const savepoint = `migration_${path
      .parse(migrationFile)
      .name.replace(/[^a-zA-Z0-9_]+/g, '_')}`;

    const unsafePatterns = [
      ...MigrationSafetySimulator.detectUnsafePatterns(upSql, 'up'),
      ...(hasDown
        ? MigrationSafetySimulator.detectUnsafePatterns(downSql, 'down')
        : []),
    ];

    let patchGenerated: string | undefined;

    if (!hasDown) {
      const patchPath = path.join(
        this.patchDir,
        `${path.parse(migrationFile).name}.down.sql`,
      );

      if (!fs.existsSync(patchPath)) {
        const patchContent = MigrationSafetySimulator.generateRollbackPatchContent(
          migrationFile,
          upSql,
        );
        fs.writeFileSync(patchPath, patchContent, 'utf8');
        patchGenerated = patchPath;
      }

      unsafePatterns.push({
        pattern: 'missing_down_script',
        severity: 'error',
        detail: 'Down migration script is missing',
        suggestion: 'Provide a reversible down migration to guarantee rollback.',
        direction: 'down',
        statement: 'N/A',
      });
    }

    const steps: SimulationStep[] = [];
    let status: 'passed' | 'failed' = 'passed';
    let message: string | undefined;

    await client.query(`SAVEPOINT ${savepoint}`);

    const runStep = async (
      sql: string,
      direction: MigrationDirection,
      action: SimulationStep['action'],
    ) => {
      const started = Date.now();

      try {
        const result = await client.query(sql);
        steps.push({
          action,
          direction,
          status: 'passed',
          durationMs: Date.now() - started,
          affectedRows: result.rowCount ?? null,
        });
      } catch (error) {
        status = 'failed';
        const durationMs = Date.now() - started;
        const messageText = `${action.toUpperCase()} ${direction.toUpperCase()} failed: ${(
          error as Error
        ).message}`;

        steps.push({
          action,
          direction,
          status: 'failed',
          durationMs,
          affectedRows: null,
          error: messageText,
        });

        throw new Error(messageText);
      }
    };

    try {
      await runStep(upSql, 'up', 'apply');

      if (hasDown) {
        await runStep(downSql, 'down', 'rollback');
        await runStep(upSql, 'up', 'reapply');
      } else {
        message = 'Forward migration applied; rollback skipped (no down script).';
      }
    } catch (error) {
      status = 'failed';
      message = (error as Error).message;
    } finally {
      try {
        await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
      } catch (rollbackError) {
        message =
          message || `Failed to rollback to savepoint: ${(rollbackError as Error).message}`;
      }

      try {
        await client.query(`RELEASE SAVEPOINT ${savepoint}`);
      } catch {
        // savepoint might have been implicitly released; safe to ignore
      }
    }

    return {
      file: migrationFile,
      status,
      steps,
      unsafePatterns,
      patchGenerated,
      message,
    };
  }

  static detectUnsafePatterns(
    sql: string,
    direction: MigrationDirection,
  ): UnsafePattern[] {
    const statements = sql
      .split(/;\s*\n?|;\s*$/)
      .map((statement) => statement.trim())
      .filter(Boolean);

    const patterns: UnsafePattern[] = [];

    const addPattern = (
      statement: string,
      pattern: string,
      severity: 'warning' | 'error',
      detail: string,
      suggestion: string,
    ) => {
      patterns.push({
        pattern,
        severity,
        detail,
        suggestion,
        direction,
        statement,
      });
    };

    for (const statement of statements) {
      const normalized = statement.toLowerCase();

      if (/drop\s+table/i.test(statement)) {
        addPattern(
          statement,
          'drop_table',
          'error',
          'Dropping tables is destructive and blocks rollbacks.',
          'Prefer soft deletes or ensure a reversible path before dropping tables.',
        );
      }

      if (/drop\s+column/i.test(statement)) {
        addPattern(
          statement,
          'drop_column',
          'error',
          'Dropping columns risks irreversible data loss.',
          'Use expand/contract: add new columns, backfill, then remove after deployments are updated.',
        );
      }

      if (/alter\s+table\s+.*\s+set\s+not\s+null/i.test(statement)) {
        addPattern(
          statement,
          'set_not_null',
          'warning',
          'Adding NOT NULL constraints can fail on existing data.',
          'Backfill data and add validation before enforcing NOT NULL.',
        );
      }

      if (/truncate\s+table/i.test(statement)) {
        addPattern(
          statement,
          'truncate_table',
          'warning',
          'TRUNCATE can remove data without rollback support.',
          'Consider DELETE with predicates and ensure backups are available.',
        );
      }

      if (/rename\s+table/i.test(statement) || /rename\s+column/i.test(statement)) {
        addPattern(
          statement,
          'rename_operation',
          'warning',
          'Renames can break dependent code without dual-read/dual-write support.',
          'Use views or compatibility columns to bridge deploys and add down migrations.',
        );
      }

      if (normalized.startsWith('update ') && !/\bwhere\b/i.test(statement)) {
        addPattern(
          statement,
          'update_without_where',
          'warning',
          'UPDATE without WHERE updates all rows.',
          'Limit UPDATE statements with predicates and verification queries.',
        );
      }

      if (normalized.startsWith('delete ') && !/\bwhere\b/i.test(statement)) {
        addPattern(
          statement,
          'delete_without_where',
          'warning',
          'DELETE without WHERE removes all rows.',
          'Restrict deletes with predicates and ensure backups exist.',
        );
      }
    }

    return patterns;
  }

  static generateRollbackPatchContent(
    migrationFile: string,
    upSql: string,
  ): string {
    const rollbackStatements: string[] = [];

    const tableCreateRegex = /create\s+table\s+if\s+not\s+exists\s+([a-zA-Z0-9_.]+)/gi;
    const tableCreateRegexSimple = /create\s+table\s+([a-zA-Z0-9_.]+)/gi;
    const addColumnRegex = /alter\s+table\s+([a-zA-Z0-9_.]+)\s+add\s+column\s+(if\s+not\s+exists\s+)?([a-zA-Z0-9_]+)/gi;
    const createIndexRegex = /create\s+index\s+(if\s+not\s+exists\s+)?([a-zA-Z0-9_]+)\s+on\s+([a-zA-Z0-9_.]+)/gi;

    let match: RegExpExecArray | null;

    const seenTables = new Set<string>();

    const addDropTable = (tableName: string) => {
      if (seenTables.has(tableName)) {
        return;
      }
      seenTables.add(tableName);
      rollbackStatements.push(`DROP TABLE IF EXISTS ${tableName} CASCADE;`);
    };

    while ((match = tableCreateRegex.exec(upSql)) !== null) {
      addDropTable(match[1]);
    }

    while ((match = tableCreateRegexSimple.exec(upSql)) !== null) {
      addDropTable(match[1]);
    }

    while ((match = addColumnRegex.exec(upSql)) !== null) {
      const table = match[1];
      const column = match[3];
      rollbackStatements.push(
        `ALTER TABLE ${table} DROP COLUMN IF EXISTS ${column} CASCADE;`,
      );
    }

    while ((match = createIndexRegex.exec(upSql)) !== null) {
      const indexName = match[2];
      rollbackStatements.push(`DROP INDEX IF EXISTS ${indexName};`);
    }

    if (rollbackStatements.length === 0) {
      rollbackStatements.push(
        '-- Review required: no obvious rollback actions detected automatically.',
      );
    }

    const lines = [
      `-- Auto-generated rollback for ${migrationFile}`,
      'BEGIN;',
      ...rollbackStatements,
      'COMMIT;',
    ];

    return `${lines.join('\n')}\n`;
  }

  private writeReport(report: MigrationSafetyReport): void {
    const filename = path.join(this.reportDir, 'migration-safety-report.json');
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
  }
}
