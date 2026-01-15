import fs from 'fs';
import path from 'path';

export type MigrationRiskSeverity = 'error' | 'warning';

export interface MigrationRiskFinding {
  rule: string;
  severity: MigrationRiskSeverity;
  message: string;
  statement: string;
}

export interface MigrationRiskEntry {
  name: string;
  path: string;
  findings: MigrationRiskFinding[];
}

export interface MigrationRiskSummary {
  totalMigrations: number;
  riskyMigrations: number;
  findings: number;
}

export interface MigrationRiskReport {
  generatedAt: string;
  overridden: boolean;
  migrations: MigrationRiskEntry[];
  summary: MigrationRiskSummary;
}

export interface MigrationRiskOptions {
  migrationsDir: string;
  overridden: boolean;
}

const DEFAULT_MANAGED_MIGRATIONS_DIR = (() => {
  const candidates = [
    path.resolve(process.cwd(), 'db/managed-migrations'),
    path.resolve(process.cwd(), 'server/db/managed-migrations'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
})();

const rules = [
  {
    rule: 'drop_table',
    severity: 'error' as const,
    pattern: /drop\s+table/i,
    message: 'DROP TABLE is destructive and requires an explicit override.',
  },
  {
    rule: 'drop_column',
    severity: 'error' as const,
    pattern: /drop\s+column/i,
    message: 'DROP COLUMN is destructive and requires an explicit override.',
  },
  {
    rule: 'type_change',
    severity: 'error' as const,
    pattern: /alter\s+table[\s\S]*?alter\s+column[\s\S]*?type\s+/i,
    message:
      'ALTER COLUMN TYPE can narrow data types and requires an explicit override.',
  },
  {
    rule: 'add_not_null_without_default',
    severity: 'error' as const,
    pattern: /add\s+column/i,
    message:
      'Adding NOT NULL columns without DEFAULT can break existing rows.',
  },
];

const stripSqlComments = (sql: string) =>
  sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');

const splitStatements = (sql: string) =>
  stripSqlComments(sql)
    .split(/;\s*\n?|;\s*$/)
    .map((statement) => statement.trim())
    .filter(Boolean);

export const scanSqlForRisks = (sql: string): MigrationRiskFinding[] => {
  const statements = splitStatements(sql);
  const findings: MigrationRiskFinding[] = [];

  for (const statement of statements) {
    for (const rule of rules) {
      if (!rule.pattern.test(statement)) {
        continue;
      }

      if (
        rule.rule === 'add_not_null_without_default' &&
        /not\s+null/i.test(statement) &&
        !/\bdefault\b/i.test(statement)
      ) {
        findings.push({
          rule: rule.rule,
          severity: rule.severity,
          message: rule.message,
          statement,
        });
        continue;
      }

      if (rule.rule !== 'add_not_null_without_default') {
        findings.push({
          rule: rule.rule,
          severity: rule.severity,
          message: rule.message,
          statement,
        });
      }
    }
  }

  return findings;
};

const loadMigrationFiles = (migrationsDir: string) => {
  if (!fs.existsSync(migrationsDir)) {
    return [] as string[];
  }

  return fs
    .readdirSync(migrationsDir)
    .filter((file: any) => file.endsWith('.up.sql'))
    .sort()
    .map((file: any) => path.join(migrationsDir, file));
};

export const buildMigrationRiskReport = (
  options: MigrationRiskOptions,
): MigrationRiskReport => {
  const migrationsDir = options.migrationsDir || DEFAULT_MANAGED_MIGRATIONS_DIR;
  const migrationPaths = loadMigrationFiles(migrationsDir);

  const migrations = migrationPaths.map((migrationPath: any) => {
    const name = path.basename(migrationPath, '.up.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    const findings = scanSqlForRisks(sql);

    return {
      name,
      path: migrationPath,
      findings,
    };
  });

  const riskyMigrations = migrations.filter((migration: any) => migration.findings.length > 0);
  const findingsCount = riskyMigrations.reduce(
    (count: any, migration: any) => count + migration.findings.length,
    0,
  );

  return {
    generatedAt: new Date().toISOString(),
    overridden: options.overridden,
    migrations,
    summary: {
      totalMigrations: migrations.length,
      riskyMigrations: riskyMigrations.length,
      findings: findingsCount,
    },
  };
};

export const formatMigrationRiskReport = (
  report: MigrationRiskReport,
): string => {
  if (report.summary.findings === 0) {
    return '✅ No destructive migration patterns detected.';
  }

  const lines = ['❌ Destructive migration patterns detected:'];

  for (const migration of report.migrations) {
    if (migration.findings.length === 0) continue;
    lines.push(`\n- ${migration.name}`);
    for (const finding of migration.findings) {
      lines.push(`  • [${finding.severity}] ${finding.message}`);
      lines.push(`    ↳ ${finding.statement}`);
    }
  }

  if (report.overridden) {
    lines.push('\n⚠️ Override enabled (MIGRATION_DESTRUCTIVE_OK=1).');
  } else {
    lines.push('\nSet MIGRATION_DESTRUCTIVE_OK=1 to override this check.');
  }

  return lines.join('\n');
};

export const resolveMigrationDir = (dir?: string) =>
  dir ? path.resolve(dir) : DEFAULT_MANAGED_MIGRATIONS_DIR;
