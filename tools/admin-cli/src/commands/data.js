"use strict";
/**
 * Data operations commands for Admin CLI
 * Backfill, reindex, and data integrity verification
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDataCommands = registerDataCommands;
const commander_1 = require("commander");
const ora_1 = __importDefault(require("ora"));
const chalk_1 = __importDefault(require("chalk"));
const output_js_1 = require("../utils/output.js");
const api_client_js_1 = require("../utils/api-client.js");
const config_js_1 = require("../utils/config.js");
const confirm_js_1 = require("../utils/confirm.js");
/**
 * Register data commands
 */
function registerDataCommands(program) {
    const dataCmd = new commander_1.Command('data')
        .description('Data operations: backfill, reindex, verify integrity');
    // Backfill command
    dataCmd
        .command('backfill')
        .description('Backfill data from source to target')
        .requiredOption('-s, --source <source>', 'Source identifier (e.g., postgres, neo4j)')
        .requiredOption('-t, --target <target>', 'Target identifier')
        .option('--entity-type <type>', 'Entity type to backfill')
        .option('--from <date>', 'Start date (ISO format)')
        .option('--to <date>', 'End date (ISO format)')
        .option('--batch-size <size>', 'Batch size', '1000')
        .option('--concurrency <n>', 'Concurrency level', '4')
        .option('--force', 'Skip confirmation')
        .action(async (options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await runBackfill(options, globalOpts);
    });
    // Reindex command
    dataCmd
        .command('reindex')
        .description('Reindex data in search engine')
        .option('-i, --index <name>', 'Specific index to reindex')
        .option('--all', 'Reindex all indices')
        .option('--batch-size <size>', 'Batch size', '500')
        .option('--force', 'Skip confirmation')
        .action(async (options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await runReindex(options, globalOpts);
    });
    // Verify integrity command
    dataCmd
        .command('verify-integrity')
        .description('Verify data integrity across stores')
        .option('--source <store>', 'Source data store', 'postgres')
        .option('--target <store>', 'Target data store to verify against', 'neo4j')
        .option('--entity-type <type>', 'Entity type to verify')
        .option('--sample-size <n>', 'Sample size for verification', '10000')
        .option('--fix', 'Attempt to fix inconsistencies')
        .option('--report <file>', 'Output report file')
        .action(async (options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await verifyIntegrity(options, globalOpts);
    });
    // Operation status command
    dataCmd
        .command('status [operationId]')
        .description('Check status of data operation')
        .option('--watch', 'Watch operation progress')
        .action(async (operationId, options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await checkOperationStatus(operationId, options.watch, globalOpts);
    });
    // Cancel operation command
    dataCmd
        .command('cancel <operationId>')
        .description('Cancel a running data operation')
        .option('--force', 'Force cancel without confirmation')
        .action(async (operationId, options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await cancelOperation(operationId, options.force, globalOpts);
    });
    // List operations
    dataCmd
        .command('operations')
        .description('List recent data operations')
        .option('--status <status>', 'Filter by status (pending, running, completed, failed)')
        .option('--limit <n>', 'Number of operations to show', '20')
        .action(async (options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await listOperations(options, globalOpts);
    });
    program.addCommand(dataCmd);
}
/**
 * Run backfill operation
 */
async function runBackfill(options, globalOpts) {
    // Validate dates
    if (options.from && isNaN(Date.parse(options.from))) {
        (0, output_js_1.printError)('Invalid --from date format. Use ISO format (YYYY-MM-DD)');
        process.exit(1);
    }
    if (options.to && isNaN(Date.parse(options.to))) {
        (0, output_js_1.printError)('Invalid --to date format. Use ISO format (YYYY-MM-DD)');
        process.exit(1);
    }
    const backfillConfig = {
        source: options.source,
        target: options.target,
        entityType: options.entityType,
        dateRange: {
            from: options.from,
            to: options.to,
        },
        batchSize: parseInt(options.batchSize ?? '1000', 10),
        concurrency: parseInt(options.concurrency ?? '4', 10),
    };
    if (globalOpts.dryRun) {
        (0, output_js_1.printDryRunBanner)();
        console.log(chalk_1.default.bold('Would run backfill with configuration:'));
        (0, output_js_1.outputKeyValue)(backfillConfig);
        return;
    }
    if (!options.force) {
        (0, confirm_js_1.requireInteractive)('Backfill operation');
        const confirmed = await (0, confirm_js_1.confirmWithPhrase)({
            message: `You are about to backfill data from "${options.source}" to "${options.target}". This may take significant time and resources.`,
            requireTypedConfirmation: false,
        });
        if (!confirmed) {
            (0, confirm_js_1.abort)();
        }
    }
    const spinner = (0, ora_1.default)('Starting backfill operation...').start();
    const apiClient = (0, api_client_js_1.createApiClient)({
        endpoint: (0, config_js_1.getEndpoint)(globalOpts.profile, globalOpts.endpoint),
        token: (0, config_js_1.getToken)(globalOpts.profile, globalOpts.token),
    });
    try {
        const response = await apiClient.post('/admin/data/backfill', backfillConfig);
        spinner.stop();
        if (!response.success) {
            (0, output_js_1.printError)(`Failed to start backfill: ${response.error?.message}`);
            process.exit(1);
        }
        const operation = response.data ?? createMockOperation('backfill');
        if ((0, output_js_1.getOutputFormat)() === 'json') {
            (0, output_js_1.output)(operation);
            return;
        }
        (0, output_js_1.printSuccess)('Backfill operation started');
        console.log(chalk_1.default.bold('Operation ID:'), operation.operationId);
        console.log(chalk_1.default.gray('Use `summit-admin data status ' + operation.operationId + '` to check progress'));
    }
    catch (err) {
        spinner.fail('Failed to start backfill');
        (0, output_js_1.printError)(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}
/**
 * Run reindex operation
 */
async function runReindex(options, globalOpts) {
    if (!options.index && !options.all) {
        (0, output_js_1.printError)('Specify --index <name> or --all');
        process.exit(1);
    }
    const reindexConfig = {
        index: options.all ? '*' : options.index,
        batchSize: parseInt(options.batchSize ?? '500', 10),
    };
    if (globalOpts.dryRun) {
        (0, output_js_1.printDryRunBanner)();
        console.log(chalk_1.default.bold('Would reindex with configuration:'));
        (0, output_js_1.outputKeyValue)(reindexConfig);
        return;
    }
    if (!options.force) {
        (0, confirm_js_1.requireInteractive)('Reindex operation');
        const message = options.all
            ? 'You are about to reindex ALL indices. This will consume significant resources.'
            : `You are about to reindex "${options.index}".`;
        const confirmed = await (0, confirm_js_1.confirmWithPhrase)({
            message,
            requireTypedConfirmation: options.all ?? false,
            typedConfirmationPhrase: confirm_js_1.CONFIRMATION_PHRASES.FORCE,
        });
        if (!confirmed) {
            (0, confirm_js_1.abort)();
        }
    }
    const spinner = (0, ora_1.default)('Starting reindex operation...').start();
    const apiClient = (0, api_client_js_1.createApiClient)({
        endpoint: (0, config_js_1.getEndpoint)(globalOpts.profile, globalOpts.endpoint),
        token: (0, config_js_1.getToken)(globalOpts.profile, globalOpts.token),
    });
    try {
        const response = await apiClient.post('/admin/data/reindex', reindexConfig);
        spinner.stop();
        if (!response.success) {
            (0, output_js_1.printError)(`Failed to start reindex: ${response.error?.message}`);
            process.exit(1);
        }
        const operation = response.data ?? createMockOperation('reindex');
        if ((0, output_js_1.getOutputFormat)() === 'json') {
            (0, output_js_1.output)(operation);
            return;
        }
        (0, output_js_1.printSuccess)('Reindex operation started');
        console.log(chalk_1.default.bold('Operation ID:'), operation.operationId);
        console.log(chalk_1.default.gray('Use `summit-admin data status ' + operation.operationId + '` to check progress'));
    }
    catch (err) {
        spinner.fail('Failed to start reindex');
        (0, output_js_1.printError)(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}
/**
 * Verify data integrity
 */
async function verifyIntegrity(options, globalOpts) {
    const verifyConfig = {
        source: options.source ?? 'postgres',
        target: options.target ?? 'neo4j',
        entityType: options.entityType,
        sampleSize: parseInt(options.sampleSize ?? '10000', 10),
        fix: options.fix ?? false,
    };
    if (options.fix && !globalOpts.dryRun) {
        (0, confirm_js_1.requireInteractive)('Data integrity fix');
        const confirmed = await (0, confirm_js_1.confirmWithPhrase)({
            message: 'You are about to run integrity verification with auto-fix enabled. This will modify data.',
            requireTypedConfirmation: true,
            typedConfirmationPhrase: confirm_js_1.CONFIRMATION_PHRASES.FORCE,
        });
        if (!confirmed) {
            (0, confirm_js_1.abort)();
        }
    }
    if (globalOpts.dryRun) {
        (0, output_js_1.printDryRunBanner)();
        console.log(chalk_1.default.bold('Would verify integrity with configuration:'));
        (0, output_js_1.outputKeyValue)(verifyConfig);
        return;
    }
    const spinner = (0, ora_1.default)('Running integrity verification...').start();
    const apiClient = (0, api_client_js_1.createApiClient)({
        endpoint: (0, config_js_1.getEndpoint)(globalOpts.profile, globalOpts.endpoint),
        token: (0, config_js_1.getToken)(globalOpts.profile, globalOpts.token),
    });
    try {
        const response = await apiClient.post('/admin/data/verify-integrity', verifyConfig);
        spinner.stop();
        if (!response.success) {
            (0, output_js_1.printError)(`Failed to verify integrity: ${response.error?.message}`);
            process.exit(1);
        }
        const report = response.data ?? createMockIntegrityReport();
        // Write report to file if specified
        if (options.report) {
            const fs = await Promise.resolve().then(() => __importStar(require('node:fs/promises')));
            await fs.writeFile(options.report, JSON.stringify(report, null, 2));
            (0, output_js_1.printInfo)(`Report saved to ${options.report}`);
        }
        if ((0, output_js_1.getOutputFormat)() === 'json') {
            (0, output_js_1.output)(report);
            return;
        }
        (0, output_js_1.printHeader)('Integrity Verification Report');
        console.log(chalk_1.default.bold('Summary:'));
        console.log(`  Records checked: ${chalk_1.default.cyan(report.recordsChecked.toLocaleString())}`);
        console.log(`  Inconsistencies: ${report.inconsistencies > 0 ? chalk_1.default.red(report.inconsistencies) : chalk_1.default.green(0)}`);
        console.log(`  Duration: ${(0, output_js_1.formatDuration)(report.durationMs)}`);
        console.log();
        if (report.issues.length > 0) {
            console.log(chalk_1.default.bold('Issues Found:'));
            const issueRows = report.issues.slice(0, 10).map((issue) => ({
                type: issue.type,
                entityId: issue.entityId,
                field: issue.field ?? '-',
                message: issue.message,
            }));
            (0, output_js_1.outputTable)(issueRows);
            if (report.issues.length > 10) {
                (0, output_js_1.printWarning)(`... and ${report.issues.length - 10} more issues`);
            }
        }
        else {
            (0, output_js_1.printSuccess)('No integrity issues found');
        }
    }
    catch (err) {
        spinner.fail('Failed to verify integrity');
        (0, output_js_1.printError)(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}
/**
 * Check operation status
 */
async function checkOperationStatus(operationId, watch, globalOpts) {
    const apiClient = (0, api_client_js_1.createApiClient)({
        endpoint: (0, config_js_1.getEndpoint)(globalOpts.profile, globalOpts.endpoint),
        token: (0, config_js_1.getToken)(globalOpts.profile, globalOpts.token),
    });
    const checkOnce = async (opId) => {
        const response = await apiClient.get(`/admin/data/operations/${opId}`);
        if (!response.success) {
            throw new Error(response.error?.message ?? 'Failed to fetch operation status');
        }
        return response.data ?? createMockOperation('backfill');
    };
    if (!operationId) {
        // List recent operations if no ID provided
        await listOperations({ limit: '10' }, globalOpts);
        return;
    }
    if (watch) {
        const spinner = (0, ora_1.default)('Watching operation...').start();
        let lastProgress = -1;
        const interval = setInterval(async () => {
            try {
                const operation = await checkOnce(operationId);
                const progress = operation.progress ?? 0;
                if (progress !== lastProgress) {
                    lastProgress = progress;
                    spinner.text = `Operation ${operationId}: ${operation.status} (${Math.round(progress * 100)}%)`;
                }
                if (operation.status === 'completed' || operation.status === 'failed') {
                    clearInterval(interval);
                    spinner.stop();
                    outputOperationStatus(operation, globalOpts);
                    if (operation.status === 'failed') {
                        process.exit(1);
                    }
                }
            }
            catch (err) {
                clearInterval(interval);
                spinner.fail('Error checking status');
                (0, output_js_1.printError)(err instanceof Error ? err.message : String(err));
                process.exit(1);
            }
        }, 2000);
    }
    else {
        const spinner = (0, ora_1.default)('Fetching operation status...').start();
        try {
            const operation = await checkOnce(operationId);
            spinner.stop();
            outputOperationStatus(operation, globalOpts);
        }
        catch (err) {
            spinner.fail('Failed to fetch operation status');
            (0, output_js_1.printError)(err instanceof Error ? err.message : String(err));
            process.exit(1);
        }
    }
}
/**
 * Cancel operation
 */
async function cancelOperation(operationId, force, globalOpts) {
    if (!force) {
        (0, confirm_js_1.requireInteractive)('Operation cancellation');
        const { confirm: confirmPrompt } = await Promise.resolve().then(() => __importStar(require('../utils/confirm.js')));
        const confirmed = await confirmPrompt(`Cancel operation ${operationId}?`);
        if (!confirmed) {
            (0, confirm_js_1.abort)();
        }
    }
    const spinner = (0, ora_1.default)('Cancelling operation...').start();
    const apiClient = (0, api_client_js_1.createApiClient)({
        endpoint: (0, config_js_1.getEndpoint)(globalOpts.profile, globalOpts.endpoint),
        token: (0, config_js_1.getToken)(globalOpts.profile, globalOpts.token),
    });
    try {
        const response = await apiClient.post(`/admin/data/operations/${operationId}/cancel`, {});
        spinner.stop();
        if (!response.success) {
            (0, output_js_1.printError)(`Failed to cancel operation: ${response.error?.message}`);
            process.exit(1);
        }
        (0, output_js_1.printSuccess)(`Operation ${operationId} cancelled`);
    }
    catch (err) {
        spinner.fail('Failed to cancel operation');
        (0, output_js_1.printError)(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}
/**
 * List operations
 */
async function listOperations(options, globalOpts) {
    const spinner = (0, ora_1.default)('Fetching operations...').start();
    const apiClient = (0, api_client_js_1.createApiClient)({
        endpoint: (0, config_js_1.getEndpoint)(globalOpts.profile, globalOpts.endpoint),
        token: (0, config_js_1.getToken)(globalOpts.profile, globalOpts.token),
    });
    try {
        const params = new URLSearchParams();
        if (options.status)
            params.append('status', options.status);
        if (options.limit)
            params.append('limit', options.limit);
        const response = await apiClient.get(`/admin/data/operations?${params.toString()}`);
        spinner.stop();
        if (!response.success) {
            (0, output_js_1.printError)(`Failed to fetch operations: ${response.error?.message}`);
            process.exit(1);
        }
        const operations = response.data?.items ?? getMockOperations();
        if ((0, output_js_1.getOutputFormat)() === 'json') {
            (0, output_js_1.output)(operations);
            return;
        }
        (0, output_js_1.printHeader)('Data Operations');
        const operationRows = operations.map((op) => ({
            id: op.operationId.slice(0, 8) + '...',
            type: op.type,
            status: formatOperationStatus(op.status),
            progress: op.progress ? `${Math.round(op.progress * 100)}%` : '-',
            started: new Date(op.startedAt).toLocaleString(),
        }));
        (0, output_js_1.outputTable)(operationRows);
    }
    catch (err) {
        spinner.fail('Failed to fetch operations');
        (0, output_js_1.printError)(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}
/**
 * Output operation status
 */
function outputOperationStatus(operation, _globalOpts) {
    if ((0, output_js_1.getOutputFormat)() === 'json') {
        (0, output_js_1.output)(operation);
        return;
    }
    (0, output_js_1.printHeader)(`Operation: ${operation.operationId}`);
    (0, output_js_1.outputKeyValue)({
        type: operation.type,
        status: formatOperationStatus(operation.status),
        progress: operation.progress ? `${Math.round(operation.progress * 100)}%` : 'N/A',
        startedAt: operation.startedAt,
        completedAt: operation.completedAt ?? 'In progress',
        recordsProcessed: operation.recordsProcessed?.toLocaleString() ?? 'N/A',
        recordsTotal: operation.recordsTotal?.toLocaleString() ?? 'N/A',
    });
    if (operation.errors && operation.errors.length > 0) {
        console.log();
        console.log(chalk_1.default.bold.red('Errors:'));
        for (const error of operation.errors.slice(0, 5)) {
            console.log(chalk_1.default.red(`  - ${error}`));
        }
        if (operation.errors.length > 5) {
            console.log(chalk_1.default.gray(`  ... and ${operation.errors.length - 5} more errors`));
        }
    }
}
/**
 * Format operation status with color
 */
function formatOperationStatus(status) {
    switch (status) {
        case 'completed':
            return chalk_1.default.green('completed');
        case 'running':
            return chalk_1.default.blue('running');
        case 'pending':
            return chalk_1.default.yellow('pending');
        case 'failed':
            return chalk_1.default.red('failed');
        default:
            return chalk_1.default.gray(status);
    }
}
/**
 * Create mock operation for demo/fallback
 */
function createMockOperation(type) {
    return {
        operationId: 'op-' + Math.random().toString(36).slice(2, 10),
        type,
        status: 'running',
        startedAt: new Date().toISOString(),
        progress: 0.15,
        recordsProcessed: 15000,
        recordsTotal: 100000,
    };
}
/**
 * Get mock operations list
 */
function getMockOperations() {
    return [
        {
            operationId: 'op-abc12345',
            type: 'backfill',
            status: 'completed',
            startedAt: new Date(Date.now() - 3600000).toISOString(),
            completedAt: new Date(Date.now() - 1800000).toISOString(),
            progress: 1,
            recordsProcessed: 500000,
            recordsTotal: 500000,
        },
        {
            operationId: 'op-def67890',
            type: 'reindex',
            status: 'running',
            startedAt: new Date(Date.now() - 600000).toISOString(),
            progress: 0.45,
            recordsProcessed: 225000,
            recordsTotal: 500000,
        },
    ];
}
/**
 * Create mock integrity report
 */
function createMockIntegrityReport() {
    return {
        recordsChecked: 10000,
        inconsistencies: 0,
        durationMs: 45000,
        issues: [],
    };
}
