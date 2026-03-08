#!/usr/bin/env ts-node
"use strict";
// Maestro Conductor v24.3.0 - Migration CLI Tool
// Epic E17: Schema Evolution - Command-line interface for migrations
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const migrationFramework_1 = require("../../server/src/migrations/migrationFramework");
const indexManager_1 = require("../../server/src/db/indexManager");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const inquirer_1 = __importDefault(require("inquirer"));
const program = new commander_1.Command();
program
    .name('maestro-migrate')
    .description('Maestro database migration tool')
    .version('24.3.0');
// Create migration command
program
    .command('create')
    .description('Create a new migration')
    .option('-n, --name <name>', 'Migration name')
    .option('-t, --type <type>', 'Migration type (postgresql|neo4j|mixed)', 'mixed')
    .option('-d, --description <description>', 'Migration description')
    .option('--breaking', 'Mark as breaking change')
    .option('--tenant-scoped', 'Mark as tenant-scoped')
    .action(async (options) => {
    const spinner = (0, ora_1.default)('Creating migration...').start();
    try {
        const migration = await createMigrationTemplate(options);
        const fileName = `${migration.version}_${migration.name.replace(/\s+/g, '_')}.json`;
        const filePath = path_1.default.join(process.cwd(), 'migrations', fileName);
        await promises_1.default.mkdir(path_1.default.dirname(filePath), { recursive: true });
        await promises_1.default.writeFile(filePath, JSON.stringify(migration, null, 2));
        spinner.succeed(chalk_1.default.green(`Migration created: ${fileName}`));
        console.log(chalk_1.default.cyan(`Edit the migration file: ${filePath}`));
    }
    catch (error) {
        spinner.fail(chalk_1.default.red(`Failed to create migration: ${error.message}`));
        process.exit(1);
    }
});
// List migrations command
program
    .command('list')
    .description('List available migrations')
    .option('-d, --directory <directory>', 'Migrations directory', './migrations')
    .option('-s, --status', 'Show migration status')
    .option('--tenant-id <tenantId>', 'Tenant ID for status check')
    .action(async (options) => {
    const spinner = (0, ora_1.default)('Loading migrations...').start();
    try {
        const migrations = await migrationFramework_1.migrationFramework.loadMigrationsFromDirectory(options.directory);
        spinner.stop();
        console.log(chalk_1.default.bold('\nAvailable Migrations:'));
        console.log('━'.repeat(80));
        for (const migration of migrations) {
            const statusText = options.status && options.tenantId
                ? await getMigrationStatusText(migration.id, options.tenantId)
                : '';
            console.log(chalk_1.default.cyan(migration.version) +
                ' ' +
                chalk_1.default.bold(migration.name) +
                ' ' +
                chalk_1.default.gray(`(${migration.type})`) +
                (statusText ? ` ${statusText}` : ''));
            console.log(chalk_1.default.dim(`  ${migration.description}`));
            if (migration.metadata.breakingChange) {
                console.log(chalk_1.default.red('  ⚠️  Breaking Change'));
            }
            console.log('');
        }
    }
    catch (error) {
        spinner.fail(chalk_1.default.red(`Failed to list migrations: ${error.message}`));
        process.exit(1);
    }
});
// Run migration command
program
    .command('up')
    .description('Run pending migrations')
    .requiredOption('--tenant-id <tenantId>', 'Tenant ID')
    .option('-d, --directory <directory>', 'Migrations directory', './migrations')
    .option('--dry-run', 'Dry run without executing')
    .option('--skip-validation', 'Skip validation steps')
    .option('--phase <phase>', 'Run specific phase only (expand|migrate|contract)')
    .option('--migration <migrationId>', 'Run specific migration only')
    .option('-v, --verbose', 'Verbose output')
    .option('--force', 'Force run even with warnings')
    .action(async (options) => {
    await runMigrations(options, 'up');
});
// Rollback migration command
program
    .command('down')
    .description('Rollback migrations')
    .requiredOption('--tenant-id <tenantId>', 'Tenant ID')
    .requiredOption('--migration <migrationId>', 'Migration ID to rollback')
    .option('--to-phase <phase>', 'Rollback to specific phase')
    .option('-v, --verbose', 'Verbose output')
    .option('--force', 'Force rollback even with warnings')
    .action(async (options) => {
    await runRollback(options);
});
// Status command
program
    .command('status')
    .description('Show migration status')
    .requiredOption('--tenant-id <tenantId>', 'Tenant ID')
    .option('-d, --directory <directory>', 'Migrations directory', './migrations')
    .action(async (options) => {
    const spinner = (0, ora_1.default)('Checking migration status...').start();
    try {
        const migrations = await migrationFramework_1.migrationFramework.loadMigrationsFromDirectory(options.directory);
        const runningMigrations = await migrationFramework_1.migrationFramework.listRunningMigrations(options.tenantId);
        spinner.stop();
        console.log(chalk_1.default.bold(`\nMigration Status for Tenant: ${options.tenantId}`));
        console.log('━'.repeat(80));
        if (runningMigrations.length > 0) {
            console.log(chalk_1.default.yellow('Running Migrations:'));
            for (const execution of runningMigrations) {
                const progress = (execution.progress.completedSteps /
                    execution.progress.totalSteps) *
                    100;
                console.log(`  ${execution.migrationId} - ${execution.currentPhase}:${execution.currentStep} ` +
                    chalk_1.default.cyan(`(${progress.toFixed(1)}%)`));
            }
            console.log('');
        }
        console.log(chalk_1.default.bold('Migration History:'));
        for (const migration of migrations) {
            const status = await migrationFramework_1.migrationFramework.getMigrationStatus(migration.id, options.tenantId);
            const statusIcon = getStatusIcon(status?.status);
            const statusColor = getStatusColor(status?.status);
            console.log(`${statusIcon} ${migration.version} ${migration.name} ` +
                statusColor(status?.status || 'pending'));
        }
    }
    catch (error) {
        spinner.fail(chalk_1.default.red(`Failed to get status: ${error.message}`));
        process.exit(1);
    }
});
// Validate command
program
    .command('validate')
    .description('Validate migration files')
    .option('-d, --directory <directory>', 'Migrations directory', './migrations')
    .option('-f, --file <file>', 'Validate specific file')
    .action(async (options) => {
    const spinner = (0, ora_1.default)('Validating migrations...').start();
    try {
        if (options.file) {
            await validateMigrationFile(options.file);
            spinner.succeed(chalk_1.default.green('Migration file is valid'));
        }
        else {
            const migrations = await migrationFramework_1.migrationFramework.loadMigrationsFromDirectory(options.directory);
            const errors = [];
            for (const migration of migrations) {
                const validationErrors = validateMigration(migration);
                if (validationErrors.length > 0) {
                    errors.push({
                        migration: migration.name,
                        errors: validationErrors,
                    });
                }
            }
            spinner.stop();
            if (errors.length === 0) {
                console.log(chalk_1.default.green('All migrations are valid'));
            }
            else {
                console.log(chalk_1.default.red('Validation errors found:'));
                for (const error of errors) {
                    console.log(chalk_1.default.yellow(`\n${error.migration}:`));
                    for (const err of error.errors) {
                        console.log(chalk_1.default.red(`  - ${err}`));
                    }
                }
                process.exit(1);
            }
        }
    }
    catch (error) {
        spinner.fail(chalk_1.default.red(`Validation failed: ${error.message}`));
        process.exit(1);
    }
});
// Generate report command
program
    .command('report')
    .description('Generate migration report')
    .requiredOption('--tenant-id <tenantId>', 'Tenant ID')
    .option('--format <format>', 'Output format (json|table)', 'table')
    .option('--output <file>', 'Output file')
    .action(async (options) => {
    const spinner = (0, ora_1.default)('Generating report...').start();
    try {
        const runningMigrations = await migrationFramework_1.migrationFramework.listRunningMigrations(options.tenantId);
        const report = migrationFramework_1.migrationFramework.generateMigrationReport(runningMigrations);
        spinner.stop();
        if (options.format === 'json') {
            const output = JSON.stringify(report, null, 2);
            if (options.output) {
                await promises_1.default.writeFile(options.output, output);
                console.log(chalk_1.default.green(`Report saved to ${options.output}`));
            }
            else {
                console.log(output);
            }
        }
        else {
            console.log(chalk_1.default.bold('\nMigration Report'));
            console.log('━'.repeat(40));
            console.log(`Total Migrations: ${report.totalMigrations}`);
            console.log(`Successful: ${chalk_1.default.green(report.successfulMigrations)}`);
            console.log(`Failed: ${chalk_1.default.red(report.failedMigrations)}`);
            console.log(`Average Duration: ${(report.averageDuration / 1000).toFixed(2)}s`);
            console.log(`Records Processed: ${report.totalRecordsProcessed.toLocaleString()}`);
        }
    }
    catch (error) {
        spinner.fail(chalk_1.default.red(`Failed to generate report: ${error.message}`));
        process.exit(1);
    }
});
// Index management commands
program
    .command('index:recommend')
    .description('Generate index recommendations')
    .requiredOption('--tenant-id <tenantId>', 'Tenant ID')
    .option('--query-log <file>', 'Query log file')
    .action(async (options) => {
    const spinner = (0, ora_1.default)('Analyzing queries and generating recommendations...').start();
    try {
        const indexManager = (0, indexManager_1.createIndexManager)(options.tenantId);
        let queryLog = [];
        if (options.queryLog) {
            const logContent = await promises_1.default.readFile(options.queryLog, 'utf-8');
            queryLog = logContent.split('\n').filter((line) => line.trim());
        }
        const recommendations = await indexManager.generateIndexRecommendations(queryLog);
        spinner.stop();
        console.log(chalk_1.default.bold('\nIndex Recommendations'));
        console.log('━'.repeat(60));
        if (recommendations.length === 0) {
            console.log(chalk_1.default.yellow('No recommendations found.'));
            return;
        }
        for (const rec of recommendations.slice(0, 10)) {
            // Top 10
            const impact = rec.impact === 'high'
                ? chalk_1.default.red(rec.impact)
                : rec.impact === 'medium'
                    ? chalk_1.default.yellow(rec.impact)
                    : chalk_1.default.gray(rec.impact);
            console.log(`${impact} ${rec.definition.name}`);
            console.log(chalk_1.default.dim(`  Database: ${rec.definition.database}`));
            console.log(chalk_1.default.dim(`  Reason: ${rec.reason}`));
            console.log(chalk_1.default.dim(`  Benefit/Cost: ${(rec.benefit / rec.cost).toFixed(2)}`));
            console.log('');
        }
        // Prompt to apply recommendations
        const { apply } = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'apply',
                message: 'Apply high-impact recommendations?',
                default: false,
            },
        ]);
        if (apply) {
            const applySpinner = (0, ora_1.default)('Applying recommendations...').start();
            await indexManager.applyRecommendations(recommendations, 5);
            applySpinner.succeed('Recommendations applied');
        }
    }
    catch (error) {
        spinner.fail(chalk_1.default.red(`Failed to generate recommendations: ${error.message}`));
        process.exit(1);
    }
});
async function createMigrationTemplate(options) {
    const timestamp = new Date()
        .toISOString()
        .replace(/[-:]/g, '')
        .substring(0, 15);
    const version = `v${timestamp}`;
    return {
        id: `${version}_${options.name.replace(/\s+/g, '_')}`,
        name: options.name,
        description: options.description || 'Auto-generated migration',
        type: options.type,
        version,
        dependencies: [],
        phases: {
            expand: [
                {
                    id: 'expand_step_1',
                    name: 'Expand phase step',
                    type: 'sql',
                    content: '-- Add your expand phase SQL here',
                    retryable: true,
                },
            ],
            migrate: [
                {
                    id: 'migrate_step_1',
                    name: 'Migrate phase step',
                    type: 'sql',
                    content: '-- Add your migrate phase SQL here',
                    retryable: true,
                },
            ],
            contract: [
                {
                    id: 'contract_step_1',
                    name: 'Contract phase step',
                    type: 'sql',
                    content: '-- Add your contract phase SQL here',
                    retryable: false,
                },
            ],
        },
        rollback: {
            contract: [
                {
                    id: 'rollback_contract_step_1',
                    name: 'Rollback contract step',
                    type: 'sql',
                    content: '-- Add rollback SQL here',
                    retryable: true,
                },
            ],
        },
        metadata: {
            author: process.env.USER || 'unknown',
            createdAt: new Date(),
            estimatedDuration: 300, // 5 minutes
            breakingChange: options.breaking || false,
            tenantScoped: options.tenantScoped || true,
        },
        settings: {
            batchSize: 1000,
            pauseBetweenBatches: 100,
            maxRetries: 3,
            timeout: 600000, // 10 minutes
        },
    };
}
async function runMigrations(options, direction) {
    const spinner = (0, ora_1.default)('Loading migrations...').start();
    try {
        const directory = options.directory || './migrations';
        const migrations = await migrationFramework_1.migrationFramework.loadMigrationsFromDirectory(directory);
        let migrationsToRun = migrations;
        if (options.migration) {
            migrationsToRun = migrations.filter((m) => m.id === options.migration);
            if (migrationsToRun.length === 0) {
                throw new Error(`Migration not found: ${options.migration}`);
            }
        }
        spinner.stop();
        // Show what will be executed
        console.log(chalk_1.default.bold(`\nPlanned migrations for tenant: ${options.tenantId}`));
        console.log('━'.repeat(60));
        for (const migration of migrationsToRun) {
            console.log(`${migration.version} ${migration.name} (${migration.type})`);
            if (migration.metadata.breakingChange) {
                console.log(chalk_1.default.red('  ⚠️  Breaking Change'));
            }
            if (options.dryRun) {
                console.log(chalk_1.default.yellow('  [DRY RUN]'));
            }
        }
        // Confirm execution
        if (!options.force && !options.dryRun) {
            const { confirm } = await inquirer_1.default.prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: `Execute ${migrationsToRun.length} migration(s)?`,
                    default: false,
                },
            ]);
            if (!confirm) {
                console.log(chalk_1.default.yellow('Migration cancelled.'));
                return;
            }
        }
        // Execute migrations
        for (const migration of migrationsToRun) {
            const migrationSpinner = (0, ora_1.default)(`Running ${migration.name}...`).start();
            try {
                const execution = await migrationFramework_1.migrationFramework.executeMigration(migration, options.tenantId, {
                    dryRun: options.dryRun,
                    phase: options.phase,
                    skipValidation: options.skipValidation,
                });
                migrationSpinner.succeed(chalk_1.default.green(`${migration.name} completed`) +
                    (options.verbose
                        ? ` (${execution.progress.completedSteps}/${execution.progress.totalSteps} steps)`
                        : ''));
            }
            catch (error) {
                migrationSpinner.fail(chalk_1.default.red(`${migration.name} failed: ${error.message}`));
                if (!options.force) {
                    process.exit(1);
                }
            }
        }
        console.log(chalk_1.default.green('\nAll migrations completed successfully!'));
    }
    catch (error) {
        spinner.fail(chalk_1.default.red(`Migration failed: ${error.message}`));
        process.exit(1);
    }
}
async function runRollback(options) {
    const spinner = (0, ora_1.default)('Rolling back migration...').start();
    try {
        await migrationFramework_1.migrationFramework.rollbackMigration(options.migration, options.tenantId, options.toPhase);
        spinner.succeed(chalk_1.default.green('Migration rolled back successfully'));
    }
    catch (error) {
        spinner.fail(chalk_1.default.red(`Rollback failed: ${error.message}`));
        process.exit(1);
    }
}
async function getMigrationStatusText(migrationId, tenantId) {
    try {
        const status = await migrationFramework_1.migrationFramework.getMigrationStatus(migrationId, tenantId);
        if (!status)
            return chalk_1.default.gray('pending');
        switch (status.status) {
            case 'completed':
                return chalk_1.default.green('✓ completed');
            case 'running':
                return chalk_1.default.yellow('⟳ running');
            case 'failed':
                return chalk_1.default.red('✗ failed');
            case 'rolled_back':
                return chalk_1.default.yellow('↶ rolled back');
            default:
                return chalk_1.default.gray('pending');
        }
    }
    catch {
        return chalk_1.default.gray('unknown');
    }
}
function getStatusIcon(status) {
    switch (status) {
        case 'completed':
            return chalk_1.default.green('✓');
        case 'running':
            return chalk_1.default.yellow('⟳');
        case 'failed':
            return chalk_1.default.red('✗');
        case 'rolled_back':
            return chalk_1.default.yellow('↶');
        default:
            return chalk_1.default.gray('○');
    }
}
function getStatusColor(status) {
    switch (status) {
        case 'completed':
            return chalk_1.default.green;
        case 'running':
            return chalk_1.default.yellow;
        case 'failed':
            return chalk_1.default.red;
        case 'rolled_back':
            return chalk_1.default.yellow;
        default:
            return chalk_1.default.gray;
    }
}
function validateMigration(migration) {
    const errors = [];
    if (!migration.id)
        errors.push('Missing migration ID');
    if (!migration.name)
        errors.push('Missing migration name');
    if (!migration.version)
        errors.push('Missing migration version');
    if (!migration.type ||
        !['postgresql', 'neo4j', 'mixed'].includes(migration.type)) {
        errors.push('Invalid migration type');
    }
    // Validate phases
    const hasPhases = Object.keys(migration.phases).length > 0;
    if (!hasPhases) {
        errors.push('Migration must have at least one phase');
    }
    // Validate steps
    for (const [phase, steps] of Object.entries(migration.phases)) {
        if (steps) {
            for (const step of steps) {
                if (!step.id)
                    errors.push(`Step missing ID in ${phase} phase`);
                if (!step.type ||
                    !['sql', 'cypher', 'javascript', 'validation'].includes(step.type)) {
                    errors.push(`Invalid step type in ${phase} phase: ${step.type}`);
                }
                if (!step.content)
                    errors.push(`Step missing content in ${phase} phase: ${step.id}`);
            }
        }
    }
    return errors;
}
async function validateMigrationFile(filePath) {
    const content = await promises_1.default.readFile(filePath, 'utf-8');
    const migration = JSON.parse(content);
    const errors = validateMigration(migration);
    if (errors.length > 0) {
        throw new Error(`Validation errors: ${errors.join(', ')}`);
    }
}
// Set up event listeners for migration framework
migrationFramework_1.migrationFramework.on('stepCompleted', (event) => {
    if (process.env.VERBOSE) {
        console.log(chalk_1.default.dim(`  Step completed: ${event.step} (${event.progress.completedSteps}/${event.progress.totalSteps})`));
    }
});
migrationFramework_1.migrationFramework.on('migrationCompleted', (execution) => {
    const duration = execution.completedAt.getTime() - execution.startedAt.getTime();
    console.log(chalk_1.default.green(`Migration ${execution.migrationId} completed in ${duration}ms`));
});
migrationFramework_1.migrationFramework.on('migrationFailed', (execution, error) => {
    console.error(chalk_1.default.red(`Migration ${execution.migrationId} failed:`, error));
});
if (require.main === module) {
    program.parse();
}
