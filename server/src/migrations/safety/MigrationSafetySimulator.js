"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationSafetySimulator = void 0;
// @ts-nocheck
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pg_1 = require("pg");
class MigrationSafetySimulator {
    migrationsDir;
    connectionString;
    reportDir;
    patchDir;
    targetMigration;
    continueOnError;
    constructor(options) {
        this.migrationsDir = options.migrationsDir;
        this.connectionString = options.connectionString;
        this.reportDir = options.reportDir;
        this.patchDir = options.patchDir;
        this.targetMigration = options.targetMigration;
        this.continueOnError = Boolean(options.continueOnError);
    }
    async run() {
        this.ensureDirectories();
        const migrations = this.loadMigrationFiles();
        const client = new pg_1.Client({ connectionString: this.connectionString });
        const startedAt = new Date();
        const migrationResults = [];
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
        }
        finally {
            await client.query('ROLLBACK');
            await client.end();
        }
        const finishedAt = new Date();
        const report = {
            startedAt: startedAt.toISOString(),
            finishedAt: finishedAt.toISOString(),
            migrations: migrationResults,
            summary: {
                total: migrationResults.length,
                passed: migrationResults.filter((m) => m.status === 'passed').length,
                failed: migrationResults.filter((m) => m.status === 'failed').length,
                unsafeFindings: migrationResults.reduce((sum, m) => sum + m.unsafePatterns.length, 0),
                patchesGenerated: migrationResults.filter((m) => Boolean(m.patchGenerated))
                    .length,
            },
        };
        this.writeReport(report);
        return report;
    }
    ensureDirectories() {
        if (!fs_1.default.existsSync(this.reportDir)) {
            fs_1.default.mkdirSync(this.reportDir, { recursive: true });
        }
        if (!fs_1.default.existsSync(this.patchDir)) {
            fs_1.default.mkdirSync(this.patchDir, { recursive: true });
        }
    }
    loadMigrationFiles() {
        const files = fs_1.default
            .readdirSync(this.migrationsDir)
            .filter((file) => file.endsWith('.sql') && !file.endsWith('.down.sql'))
            .sort();
        if (this.targetMigration) {
            if (!files.includes(this.targetMigration)) {
                throw new Error(`Target migration ${this.targetMigration} not found in ${this.migrationsDir}`);
            }
            return [this.targetMigration];
        }
        return files;
    }
    readSqlFile(filepath) {
        const content = fs_1.default.readFileSync(filepath, 'utf8');
        return content
            .replace(/^\s*BEGIN\s*;\s*$/gim, '')
            .replace(/^\s*COMMIT\s*;\s*$/gim, '')
            .replace(/^\s*ROLLBACK\s*;\s*$/gim, '');
    }
    async simulateMigration(client, migrationFile) {
        const upPath = path_1.default.join(this.migrationsDir, migrationFile);
        const downPath = path_1.default.join(this.migrationsDir, migrationFile.replace('.sql', '.down.sql'));
        const hasDown = fs_1.default.existsSync(downPath);
        const upSql = this.readSqlFile(upPath);
        const downSql = hasDown ? this.readSqlFile(downPath) : '';
        const savepoint = `migration_${path_1.default
            .parse(migrationFile)
            .name.replace(/[^a-zA-Z0-9_]+/g, '_')}`;
        const unsafePatterns = [
            ...MigrationSafetySimulator.detectUnsafePatterns(upSql, 'up'),
            ...(hasDown
                ? MigrationSafetySimulator.detectUnsafePatterns(downSql, 'down')
                : []),
        ];
        let patchGenerated;
        if (!hasDown) {
            const patchPath = path_1.default.join(this.patchDir, `${path_1.default.parse(migrationFile).name}.down.sql`);
            if (!fs_1.default.existsSync(patchPath)) {
                const patchContent = MigrationSafetySimulator.generateRollbackPatchContent(migrationFile, upSql);
                fs_1.default.writeFileSync(patchPath, patchContent, 'utf8');
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
        const steps = [];
        let status = 'passed';
        let message;
        await client.query(`SAVEPOINT ${savepoint}`);
        const runStep = async (sql, direction, action) => {
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
            }
            catch (error) {
                status = 'failed';
                const durationMs = Date.now() - started;
                const messageText = `${action.toUpperCase()} ${direction.toUpperCase()} failed: ${error.message}`;
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
            }
            else {
                message = 'Forward migration applied; rollback skipped (no down script).';
            }
        }
        catch (error) {
            status = 'failed';
            message = error.message;
        }
        finally {
            try {
                await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
            }
            catch (rollbackError) {
                message =
                    message || `Failed to rollback to savepoint: ${rollbackError.message}`;
            }
            try {
                await client.query(`RELEASE SAVEPOINT ${savepoint}`);
            }
            catch {
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
    static detectUnsafePatterns(sql, direction) {
        const statements = sql
            .split(/;\s*\n?|;\s*$/)
            .map((statement) => statement.trim())
            .filter(Boolean);
        const patterns = [];
        const addPattern = (statement, pattern, severity, detail, suggestion) => {
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
                addPattern(statement, 'drop_table', 'error', 'Dropping tables is destructive and blocks rollbacks.', 'Prefer soft deletes or ensure a reversible path before dropping tables.');
            }
            if (/drop\s+column/i.test(statement)) {
                addPattern(statement, 'drop_column', 'error', 'Dropping columns risks irreversible data loss.', 'Use expand/contract: add new columns, backfill, then remove after deployments are updated.');
            }
            if (/alter\s+table\s+.*\s+set\s+not\s+null/i.test(statement)) {
                addPattern(statement, 'set_not_null', 'warning', 'Adding NOT NULL constraints can fail on existing data.', 'Backfill data and add validation before enforcing NOT NULL.');
            }
            if (/truncate\s+table/i.test(statement)) {
                addPattern(statement, 'truncate_table', 'warning', 'TRUNCATE can remove data without rollback support.', 'Consider DELETE with predicates and ensure backups are available.');
            }
            if (/rename\s+table/i.test(statement) || /rename\s+column/i.test(statement)) {
                addPattern(statement, 'rename_operation', 'warning', 'Renames can break dependent code without dual-read/dual-write support.', 'Use views or compatibility columns to bridge deploys and add down migrations.');
            }
            if (normalized.startsWith('update ') && !/\bwhere\b/i.test(statement)) {
                addPattern(statement, 'update_without_where', 'warning', 'UPDATE without WHERE updates all rows.', 'Limit UPDATE statements with predicates and verification queries.');
            }
            if (normalized.startsWith('delete ') && !/\bwhere\b/i.test(statement)) {
                addPattern(statement, 'delete_without_where', 'warning', 'DELETE without WHERE removes all rows.', 'Restrict deletes with predicates and ensure backups exist.');
            }
        }
        return patterns;
    }
    static generateRollbackPatchContent(migrationFile, upSql) {
        const rollbackStatements = [];
        const tableCreateRegex = /create\s+table\s+if\s+not\s+exists\s+([a-zA-Z0-9_.]+)/gi;
        const tableCreateRegexSimple = /create\s+table\s+([a-zA-Z0-9_.]+)/gi;
        const addColumnRegex = /alter\s+table\s+([a-zA-Z0-9_.]+)\s+add\s+column\s+(if\s+not\s+exists\s+)?([a-zA-Z0-9_]+)/gi;
        const createIndexRegex = /create\s+index\s+(if\s+not\s+exists\s+)?([a-zA-Z0-9_]+)\s+on\s+([a-zA-Z0-9_.]+)/gi;
        let match;
        const seenTables = new Set();
        const addDropTable = (tableName) => {
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
            rollbackStatements.push(`ALTER TABLE ${table} DROP COLUMN IF EXISTS ${column} CASCADE;`);
        }
        while ((match = createIndexRegex.exec(upSql)) !== null) {
            const indexName = match[2];
            rollbackStatements.push(`DROP INDEX IF EXISTS ${indexName};`);
        }
        if (rollbackStatements.length === 0) {
            rollbackStatements.push('-- Review required: no obvious rollback actions detected automatically.');
        }
        const lines = [
            `-- Auto-generated rollback for ${migrationFile}`,
            'BEGIN;',
            ...rollbackStatements,
            'COMMIT;',
        ];
        return `${lines.join('\n')}\n`;
    }
    writeReport(report) {
        const filename = path_1.default.join(this.reportDir, 'migration-safety-report.json');
        fs_1.default.writeFileSync(filename, JSON.stringify(report, null, 2));
    }
}
exports.MigrationSafetySimulator = MigrationSafetySimulator;
