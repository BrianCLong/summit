import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Pool, PoolClient } from 'pg';
import { spawn as childSpawn, SpawnOptions } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MigrationManagerOptions {
  migrationsDir?: string;
  seedsDir?: string;
  connectionString?: string;
  allowBreakingChanges?: boolean;
  pool?: Pool;
  spawn?: typeof childSpawn;
  migrationsTable?: string;
  seedsTable?: string;
}

interface ManagedMigration {
  name: string;
  upPath: string;
  downPath: string;
  upSql: string;
  downSql: string;
  checksum: string;
}

interface ManagedSeed {
  name: string;
  sql: string;
}

export interface MigrationStatus {
  applied: string[];
  pending: string[];
  seedsApplied: string[];
  seedsPending: string[];
}

const DEFAULT_MIGRATIONS_DIR = path.resolve(
  __dirname,
  '../../../db/managed-migrations',
);
const DEFAULT_SEEDS_DIR = path.resolve(__dirname, '../../../db/managed-seeds');

export class MigrationManager {
  private migrationsDir: string;
  private seedsDir: string;
  private pool: Pool;
  private spawn: typeof childSpawn;
  private allowBreakingChanges: boolean;
  private migrationsTable: string;
  private seedsTable: string;

  constructor(options: MigrationManagerOptions = {}) {
    this.migrationsDir = options.migrationsDir ?? DEFAULT_MIGRATIONS_DIR;
    this.seedsDir = options.seedsDir ?? DEFAULT_SEEDS_DIR;
    this.spawn = options.spawn ?? childSpawn;
    this.allowBreakingChanges =
      options.allowBreakingChanges ??
      process.env.ALLOW_BREAKING_MIGRATIONS === 'true';
    this.migrationsTable = options.migrationsTable ?? 'migration_history';
    this.seedsTable = options.seedsTable ?? 'seed_history';

    const connectionString =
      options.connectionString ||
      process.env.POSTGRES_URL ||
      process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('POSTGRES_URL or DATABASE_URL is required for migrations');
    }

    this.pool =
      options.pool ||
      new Pool({
        connectionString,
        max: 10,
        idleTimeoutMillis: 10000,
      });
  }

  static validateOnlineSafety(sql: string) {
    const riskyPatterns = [
      /DROP\s+TABLE/i,
      /DROP\s+COLUMN/i,
      /ALTER\s+TABLE\s+\w+\s+RENAME/i,
      /ALTER\s+TABLE\s+\w+\s+ALTER\s+COLUMN\s+\w+\s+TYPE/i,
    ];

    if (riskyPatterns.some((pattern) => pattern.test(sql))) {
      throw new Error(
        'Migration contains potentially breaking change. Use additive/online-safe patterns or set ALLOW_BREAKING_MIGRATIONS=true to bypass.',
      );
    }
  }

  private async withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      return await fn(client);
    } finally {
      client.release();
    }
  }

  private async ensureMetaTables(client: PoolClient) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
        id BIGSERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        rolled_back_at TIMESTAMPTZ,
        execution_ms INTEGER,
        zero_downtime_safe BOOLEAN DEFAULT true
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${this.seedsTable} (
        id BIGSERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        execution_ms INTEGER
      )
    `);
  }

  private hashStatements(...chunks: string[]) {
    const hash = crypto.createHash('sha256');
    chunks.forEach((chunk) => hash.update(chunk));
    return hash.digest('hex');
  }

  private readMigrationFiles(): ManagedMigration[] {
    if (!fs.existsSync(this.migrationsDir)) {
      return [];
    }

    const files = fs
      .readdirSync(this.migrationsDir)
      .filter((file) => file.endsWith('.up.sql'))
      .sort();

    return files.map((file) => {
      const name = file.replace('.up.sql', '');
      const upPath = path.join(this.migrationsDir, `${name}.up.sql`);
      const downPath = path.join(this.migrationsDir, `${name}.down.sql`);

      if (!fs.existsSync(downPath)) {
        throw new Error(`Missing down migration for ${name}`);
      }

      const upSql = fs.readFileSync(upPath, 'utf8');
      const downSql = fs.readFileSync(downPath, 'utf8');
      const checksum = this.hashStatements(upSql, downSql);

      return { name, upPath, downPath, upSql, downSql, checksum };
    });
  }

  private readSeedFiles(): ManagedSeed[] {
    if (!fs.existsSync(this.seedsDir)) {
      return [];
    }

    return fs
      .readdirSync(this.seedsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort()
      .map((file) => ({
        name: file.replace('.sql', ''),
        sql: fs.readFileSync(path.join(this.seedsDir, file), 'utf8'),
      }));
  }

  private async getAppliedMigrations(client: PoolClient) {
    const result = await client.query(
      `SELECT name, checksum FROM ${this.migrationsTable} WHERE rolled_back_at IS NULL ORDER BY applied_at ASC`,
    );
    return result.rows as { name: string; checksum: string }[];
  }

  private async getAppliedSeeds(client: PoolClient) {
    const result = await client.query(
      `SELECT name FROM ${this.seedsTable} ORDER BY applied_at ASC`,
    );
    return result.rows as { name: string }[];
  }

  private async runSqlSafely(client: PoolClient, sql: string) {
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '5s'");
    await client.query(sql);
  }

  async migrate(options: { dryRun?: boolean; to?: string } = {}) {
    const migrations = this.readMigrationFiles();

    return this.withClient(async (client) => {
      await this.ensureMetaTables(client);
      const applied = await this.getAppliedMigrations(client);
      const appliedNames = new Set(applied.map((migration) => migration.name));

      const pending = migrations.filter((migration) => !appliedNames.has(migration.name));
      const target = options.to
        ? pending.filter((migration) => migration.name <= options.to)
        : pending;

      for (const migration of target) {
        if (!this.allowBreakingChanges) {
          MigrationManager.validateOnlineSafety(migration.upSql);
        }

        if (options.dryRun) {
          continue;
        }

        const start = Date.now();
        await client.query('BEGIN');

        try {
          await this.runSqlSafely(client, migration.upSql);
          await client.query(
            `INSERT INTO ${this.migrationsTable} (name, checksum, execution_ms, zero_downtime_safe)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (name) DO NOTHING`,
            [migration.name, migration.checksum, Date.now() - start, true],
          );
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      }
    });
  }

  async rollback(options: { steps?: number } = {}) {
    const steps = options.steps ?? 1;
    const migrations = this.readMigrationFiles();

    return this.withClient(async (client) => {
      await this.ensureMetaTables(client);
      const applied = await client.query(
        `SELECT name, checksum FROM ${this.migrationsTable} WHERE rolled_back_at IS NULL ORDER BY applied_at DESC LIMIT $1`,
        [steps],
      );

      for (const record of applied.rows) {
        const migration = migrations.find((item) => item.name === record.name);
        if (!migration) {
          throw new Error(`Unable to rollback ${record.name}: migration file missing`);
        }

        if (migration.checksum !== record.checksum) {
          throw new Error(
            `Checksum mismatch for ${record.name}. Regenerate migration or update checksum to proceed.`,
          );
        }

        await client.query('BEGIN');
        try {
          await this.runSqlSafely(client, migration.downSql);
          await client.query(
            `UPDATE ${this.migrationsTable} SET rolled_back_at = now() WHERE name = $1`,
            [migration.name],
          );
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      }
    });
  }

  async seed(options: { force?: boolean } = {}) {
    const seeds = this.readSeedFiles();

    return this.withClient(async (client) => {
      await this.ensureMetaTables(client);
      const applied = await this.getAppliedSeeds(client);
      const appliedNames = new Set(applied.map((seed) => seed.name));

      for (const seed of seeds) {
        if (appliedNames.has(seed.name) && !options.force) {
          continue;
        }

        const start = Date.now();
        await client.query('BEGIN');
        try {
          await this.runSqlSafely(client, seed.sql);
          await client.query(
            `INSERT INTO ${this.seedsTable} (name, execution_ms)
             VALUES ($1, $2)
             ON CONFLICT (name) DO UPDATE SET applied_at = now(), execution_ms = EXCLUDED.execution_ms`,
            [seed.name, Date.now() - start],
          );
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      }
    });
  }

  async status(): Promise<MigrationStatus> {
    const migrations = this.readMigrationFiles();
    const seeds = this.readSeedFiles();

    return this.withClient(async (client) => {
      await this.ensureMetaTables(client);
      const appliedMigrations = await this.getAppliedMigrations(client);
      const appliedSeeds = await this.getAppliedSeeds(client);

      const appliedNames = new Set(appliedMigrations.map((migration) => migration.name));
      const appliedSeedNames = new Set(appliedSeeds.map((seed) => seed.name));

      const pendingMigrations = migrations
        .filter((migration) => !appliedNames.has(migration.name))
        .map((migration) => migration.name);
      const pendingSeeds = seeds
        .filter((seed) => !appliedSeedNames.has(seed.name))
        .map((seed) => seed.name);

      return {
        applied: Array.from(appliedNames),
        pending: pendingMigrations,
        seedsApplied: Array.from(appliedSeedNames),
        seedsPending: pendingSeeds,
      };
    });
  }

  async testMigrations() {
    const migrations = this.readMigrationFiles();

    return this.withClient(async (client) => {
      await this.ensureMetaTables(client);
      await client.query('BEGIN');
      try {
        for (const migration of migrations) {
          if (!this.allowBreakingChanges) {
            MigrationManager.validateOnlineSafety(migration.upSql);
          }
          await this.runSqlSafely(client, migration.upSql);
        }
      } finally {
        await client.query('ROLLBACK');
      }

      return { migrationsTested: migrations.length };
    });
  }

  async backup(outputPath?: string) {
    const connectionString =
      process.env.POSTGRES_URL || process.env.DATABASE_URL || undefined;
    if (!connectionString) {
      throw new Error('POSTGRES_URL or DATABASE_URL is required to run backups');
    }

    const destination =
      outputPath ||
      path.resolve(
        process.cwd(),
        'backups',
        `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.sql`,
      );

    await fs.promises.mkdir(path.dirname(destination), { recursive: true });

    await this.runCommand('pg_dump', ['--file', destination, '--dbname', connectionString]);
    return destination;
  }

  async restore(inputPath: string) {
    const connectionString =
      process.env.POSTGRES_URL || process.env.DATABASE_URL || undefined;
    if (!connectionString) {
      throw new Error('POSTGRES_URL or DATABASE_URL is required to restore backups');
    }

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Backup file ${inputPath} does not exist`);
    }

    await this.runCommand('psql', ['--dbname', connectionString, '--file', inputPath]);
  }

  private async runCommand(command: string, args: string[], options: SpawnOptions = {}) {
    await new Promise<void>((resolve, reject) => {
      const child = this.spawn(command, args, {
        stdio: 'inherit',
        ...options,
      });

      child.on('error', reject);
      child.on('exit', (code) => {
        if (code === 0) return resolve();
        reject(new Error(`${command} exited with code ${code}`));
      });
    });
  }
}
