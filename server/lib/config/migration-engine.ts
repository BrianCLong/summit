import * as fs from 'fs';
import * as path from 'path';

interface Migration {
  version: number;
  up: (config: any) => any;
  down: (config: any) => any;
}

export class MigrationError extends Error {
  constructor(message: string, public rolledBackConfig: any) {
    super(message);
    this.name = 'MigrationError';
  }
}

export class MigrationEngine {
  private migrations: Migration[];
  private historyFilePath: string;

  constructor(private migrationsDir: string, historyFilePath: string) {
    this.migrations = this.loadMigrations();
    this.historyFilePath = historyFilePath;
  }

  private loadMigrations(): Migration[] {
    if (!fs.existsSync(this.migrationsDir)) {
      return [];
    }
    const files = fs.readdirSync(this.migrationsDir).filter(file => file.endsWith('.js'));
    const migrations = files.map(file => {
      const migration = require(path.join(this.migrationsDir, file));
      return {
        version: parseInt(path.basename(file, '.js')),
        ...migration,
      };
    });
    return migrations.sort((a, b) => a.version - b.version);
  }

  private loadMigrationHistory(): Set<number> {
    if (!fs.existsSync(this.historyFilePath)) {
      return new Set();
    }
    return new Set(JSON.parse(fs.readFileSync(this.historyFilePath, 'utf-8')));
  }

  private saveMigrationHistory(history: Set<number>) {
    fs.writeFileSync(this.historyFilePath, JSON.stringify(Array.from(history)), 'utf-8');
  }

  public migrate(config: any, targetVersion?: number): any {
    const history = this.loadMigrationHistory();
    const currentVersion = config.version || 0;
    const finalVersion = targetVersion === undefined ? this.migrations[this.migrations.length - 1]?.version ?? 0 : targetVersion;

    let migratedConfig = { ...config };
    const successfullyApplied: Migration[] = [];

    for (const migration of this.migrations) {
      if (migration.version > currentVersion && migration.version <= finalVersion && !history.has(migration.version)) {
        try {
          migratedConfig = migration.up(migratedConfig);
          migratedConfig.version = migration.version;
          successfullyApplied.push(migration);
          console.log(`Applied migration version ${migration.version}`);
        } catch (error) {
          console.error(`Failed to apply migration version ${migration.version}. Rolling back...`, error);
          for (const applied of successfullyApplied.reverse()) {
            migratedConfig = applied.down(migratedConfig);
            console.log(`Rolled back migration version ${applied.version}`);
          }
          throw new MigrationError(`Migration failed at version ${migration.version} and was rolled back.`, migratedConfig);
        }
      }
    }

    successfullyApplied.forEach(m => history.add(m.version));
    this.saveMigrationHistory(history);

    return migratedConfig;
  }
}
