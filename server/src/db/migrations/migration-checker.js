"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveMigrationDir = exports.formatMigrationRiskReport = exports.buildMigrationRiskReport = exports.scanSqlForRisks = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DEFAULT_MANAGED_MIGRATIONS_DIR = (() => {
    const candidates = [
        path_1.default.resolve(process.cwd(), 'db/managed-migrations'),
        path_1.default.resolve(process.cwd(), 'server/db/managed-migrations'),
    ];
    return candidates.find((candidate) => fs_1.default.existsSync(candidate)) || candidates[0];
})();
const rules = [
    {
        rule: 'drop_table',
        severity: 'error',
        pattern: /drop\s+table/i,
        message: 'DROP TABLE is destructive and requires an explicit override.',
    },
    {
        rule: 'drop_column',
        severity: 'error',
        pattern: /drop\s+column/i,
        message: 'DROP COLUMN is destructive and requires an explicit override.',
    },
    {
        rule: 'type_change',
        severity: 'error',
        pattern: /alter\s+table[\s\S]*?alter\s+column[\s\S]*?type\s+/i,
        message: 'ALTER COLUMN TYPE can narrow data types and requires an explicit override.',
    },
    {
        rule: 'add_not_null_without_default',
        severity: 'error',
        pattern: /add\s+column/i,
        message: 'Adding NOT NULL columns without DEFAULT can break existing rows.',
    },
];
const stripSqlComments = (sql) => sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');
const splitStatements = (sql) => stripSqlComments(sql)
    .split(/;\s*\n?|;\s*$/)
    .map((statement) => statement.trim())
    .filter(Boolean);
const scanSqlForRisks = (sql) => {
    const statements = splitStatements(sql);
    const findings = [];
    for (const statement of statements) {
        for (const rule of rules) {
            if (!rule.pattern.test(statement)) {
                continue;
            }
            if (rule.rule === 'add_not_null_without_default' &&
                /not\s+null/i.test(statement) &&
                !/\bdefault\b/i.test(statement)) {
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
exports.scanSqlForRisks = scanSqlForRisks;
const loadMigrationFiles = (migrationsDir) => {
    if (!fs_1.default.existsSync(migrationsDir)) {
        return [];
    }
    return fs_1.default
        .readdirSync(migrationsDir)
        .filter((file) => file.endsWith('.up.sql'))
        .sort()
        .map((file) => path_1.default.join(migrationsDir, file));
};
const buildMigrationRiskReport = (options) => {
    const migrationsDir = options.migrationsDir || DEFAULT_MANAGED_MIGRATIONS_DIR;
    const migrationPaths = loadMigrationFiles(migrationsDir);
    const migrations = migrationPaths.map((migrationPath) => {
        const name = path_1.default.basename(migrationPath, '.up.sql');
        const sql = fs_1.default.readFileSync(migrationPath, 'utf8');
        const findings = (0, exports.scanSqlForRisks)(sql);
        return {
            name,
            path: migrationPath,
            findings,
        };
    });
    const riskyMigrations = migrations.filter((migration) => migration.findings.length > 0);
    const findingsCount = riskyMigrations.reduce((count, migration) => count + migration.findings.length, 0);
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
exports.buildMigrationRiskReport = buildMigrationRiskReport;
const formatMigrationRiskReport = (report) => {
    if (report.summary.findings === 0) {
        return '✅ No destructive migration patterns detected.';
    }
    const lines = ['❌ Destructive migration patterns detected:'];
    for (const migration of report.migrations) {
        if (migration.findings.length === 0)
            continue;
        lines.push(`\n- ${migration.name}`);
        for (const finding of migration.findings) {
            lines.push(`  • [${finding.severity}] ${finding.message}`);
            lines.push(`    ↳ ${finding.statement}`);
        }
    }
    if (report.overridden) {
        lines.push('\n⚠️ Override enabled (MIGRATION_DESTRUCTIVE_OK=1).');
    }
    else {
        lines.push('\nSet MIGRATION_DESTRUCTIVE_OK=1 to override this check.');
    }
    return lines.join('\n');
};
exports.formatMigrationRiskReport = formatMigrationRiskReport;
const resolveMigrationDir = (dir) => dir ? path_1.default.resolve(dir) : DEFAULT_MANAGED_MIGRATIONS_DIR;
exports.resolveMigrationDir = resolveMigrationDir;
