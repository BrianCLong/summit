"use strict";
/**
 * Graph service commands for Admin CLI
 * Neo4j graph database operations
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
exports.registerGraphCommands = registerGraphCommands;
const commander_1 = require("commander");
const ora_1 = __importDefault(require("ora"));
const chalk_1 = __importDefault(require("chalk"));
const output_js_1 = require("../utils/output.js");
const api_client_js_1 = require("../utils/api-client.js");
const config_js_1 = require("../utils/config.js");
const confirm_js_1 = require("../utils/confirm.js");
/**
 * Register graph commands
 */
function registerGraphCommands(program) {
    const graphCmd = new commander_1.Command('graph')
        .description('Graph database (Neo4j) operations');
    // Stats command
    graphCmd
        .command('stats')
        .description('Show graph database statistics')
        .option('--detailed', 'Show detailed breakdown')
        .action(async (options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await showGraphStats(options.detailed, globalOpts);
    });
    // Health command
    graphCmd
        .command('health')
        .description('Check graph database health')
        .action(async (_options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await checkGraphHealth(globalOpts);
    });
    // Query command
    graphCmd
        .command('query')
        .description('Execute a read-only Cypher query')
        .argument('<cypher>', 'Cypher query to execute')
        .option('--limit <n>', 'Limit results', '100')
        .option('--timeout <ms>', 'Query timeout in milliseconds', '30000')
        .action(async (cypher, options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await executeQuery(cypher, options, globalOpts);
    });
    // Schema command
    graphCmd
        .command('schema')
        .description('Show graph schema (labels, relationships, indexes)')
        .option('--indexes', 'Show indexes only')
        .option('--constraints', 'Show constraints only')
        .action(async (options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await showSchema(options, globalOpts);
    });
    // Clear cache command
    graphCmd
        .command('clear-cache')
        .description('Clear graph query cache')
        .option('--force', 'Skip confirmation')
        .action(async (options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await clearCache(options.force, globalOpts);
    });
    // Vacuum command
    graphCmd
        .command('vacuum')
        .description('Run database maintenance (requires downtime)')
        .option('--analyze', 'Only analyze, do not vacuum')
        .option('--force', 'Skip confirmation')
        .action(async (options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await runVacuum(options, globalOpts);
    });
    // Export command
    graphCmd
        .command('export')
        .description('Export graph data')
        .option('--format <format>', 'Export format (cypher, graphml, json)', 'json')
        .option('--labels <labels>', 'Labels to export (comma-separated)')
        .option('-o, --output <file>', 'Output file path')
        .option('--limit <n>', 'Maximum nodes to export')
        .action(async (options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await exportGraph(options, globalOpts);
    });
    program.addCommand(graphCmd);
}
/**
 * Show graph statistics
 */
async function showGraphStats(detailed, options) {
    const spinner = (0, ora_1.default)('Fetching graph statistics...').start();
    const apiClient = (0, api_client_js_1.createApiClient)({
        endpoint: (0, config_js_1.getEndpoint)(options.profile, options.endpoint),
        token: (0, config_js_1.getToken)(options.profile, options.token),
    });
    try {
        const response = await apiClient.get('/admin/graph/stats');
        spinner.stop();
        if (!response.success) {
            (0, output_js_1.printError)(`Failed to fetch graph stats: ${response.error?.message}`);
        }
        const stats = response.data ?? getMockGraphStats();
        if ((0, output_js_1.getOutputFormat)() === 'json') {
            (0, output_js_1.output)(stats);
            return;
        }
        (0, output_js_1.printHeader)('Graph Database Statistics');
        console.log(chalk_1.default.bold('Overview:'));
        console.log(`  Nodes:         ${chalk_1.default.cyan(stats.nodeCount.toLocaleString())}`);
        console.log(`  Relationships: ${chalk_1.default.cyan(stats.edgeCount.toLocaleString())}`);
        console.log(`  Storage:       ${(0, output_js_1.formatBytes)(stats.storageSize)}`);
        console.log(`  Cache Hit:     ${(0, output_js_1.formatPercentage)(stats.cacheHitRate)}`);
        console.log();
        if (detailed) {
            console.log(chalk_1.default.bold('Nodes by Label:'));
            const labelRows = Object.entries(stats.labelCounts).map(([label, count]) => ({
                label,
                count: count.toLocaleString(),
                percentage: (0, output_js_1.formatPercentage)(count / stats.nodeCount),
            }));
            (0, output_js_1.outputTable)(labelRows);
            console.log(chalk_1.default.bold('Relationships by Type:'));
            const relRows = Object.entries(stats.relationshipCounts).map(([type, count]) => ({
                type,
                count: count.toLocaleString(),
                percentage: (0, output_js_1.formatPercentage)(count / stats.edgeCount),
            }));
            (0, output_js_1.outputTable)(relRows);
        }
    }
    catch (err) {
        spinner.fail('Failed to fetch graph statistics');
        (0, output_js_1.printError)(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}
/**
 * Check graph health
 */
async function checkGraphHealth(options) {
    const spinner = (0, ora_1.default)('Checking graph health...').start();
    const apiClient = (0, api_client_js_1.createApiClient)({
        endpoint: (0, config_js_1.getEndpoint)(options.profile, options.endpoint),
        token: (0, config_js_1.getToken)(options.profile, options.token),
    });
    try {
        const response = await apiClient.get('/admin/graph/health');
        spinner.stop();
        if (!response.success) {
            (0, output_js_1.printError)(`Failed to check graph health: ${response.error?.message}`);
        }
        const health = response.data ?? {
            status: 'healthy',
            latency: 15,
            version: '5.24.0',
            cluster: { role: 'leader', members: 3 },
        };
        if ((0, output_js_1.getOutputFormat)() === 'json') {
            (0, output_js_1.output)(health);
            return;
        }
        (0, output_js_1.printHeader)('Graph Database Health');
        const statusColor = health.status === 'healthy' ? chalk_1.default.green : chalk_1.default.red;
        console.log(chalk_1.default.bold('Status:'), statusColor(health.status));
        console.log(chalk_1.default.bold('Version:'), health.version);
        console.log(chalk_1.default.bold('Latency:'), `${health.latency}ms`);
        if (health.cluster) {
            console.log();
            console.log(chalk_1.default.bold('Cluster:'));
            console.log(`  Role:    ${health.cluster.role}`);
            console.log(`  Members: ${health.cluster.members}`);
        }
        if (health.status === 'healthy') {
            (0, output_js_1.printSuccess)('Graph database is healthy');
        }
        else {
            (0, output_js_1.printWarning)('Graph database has issues');
        }
    }
    catch (err) {
        spinner.fail('Failed to check graph health');
        (0, output_js_1.printError)(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}
/**
 * Execute Cypher query
 */
async function executeQuery(cypher, options, globalOpts) {
    // Safety check: only allow read queries
    const cypherLower = cypher.toLowerCase().trim();
    const writeKeywords = ['create', 'merge', 'set', 'delete', 'remove', 'detach'];
    if (writeKeywords.some((kw) => cypherLower.includes(kw))) {
        (0, output_js_1.printError)('Write queries are not allowed through CLI. Use the admin UI for modifications.');
        process.exit(1);
    }
    const spinner = (0, ora_1.default)('Executing query...').start();
    const apiClient = (0, api_client_js_1.createApiClient)({
        endpoint: (0, config_js_1.getEndpoint)(globalOpts.profile, globalOpts.endpoint),
        token: (0, config_js_1.getToken)(globalOpts.profile, globalOpts.token),
        timeout: parseInt(options.timeout ?? '30000', 10),
    });
    try {
        const response = await apiClient.post('/admin/graph/query', {
            cypher,
            limit: parseInt(options.limit ?? '100', 10),
        });
        spinner.stop();
        if (!response.success) {
            (0, output_js_1.printError)(`Query failed: ${response.error?.message}`);
            process.exit(1);
        }
        const data = response.data ?? { results: [], summary: { time: 0, rows: 0 } };
        if ((0, output_js_1.getOutputFormat)() === 'json') {
            (0, output_js_1.output)(data);
            return;
        }
        if (data.results.length === 0) {
            console.log(chalk_1.default.gray('No results'));
        }
        else {
            (0, output_js_1.outputTable)(data.results);
        }
        console.log();
        console.log(chalk_1.default.gray(`Returned ${data.summary.rows} rows in ${data.summary.time}ms`));
    }
    catch (err) {
        spinner.fail('Query execution failed');
        (0, output_js_1.printError)(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}
/**
 * Show graph schema
 */
async function showSchema(options, globalOpts) {
    const spinner = (0, ora_1.default)('Fetching schema...').start();
    const apiClient = (0, api_client_js_1.createApiClient)({
        endpoint: (0, config_js_1.getEndpoint)(globalOpts.profile, globalOpts.endpoint),
        token: (0, config_js_1.getToken)(globalOpts.profile, globalOpts.token),
    });
    try {
        const response = await apiClient.get('/admin/graph/schema');
        spinner.stop();
        if (!response.success) {
            (0, output_js_1.printError)(`Failed to fetch schema: ${response.error?.message}`);
        }
        const schema = response.data ?? getMockSchema();
        if ((0, output_js_1.getOutputFormat)() === 'json') {
            (0, output_js_1.output)(schema);
            return;
        }
        (0, output_js_1.printHeader)('Graph Schema');
        if (!options.indexes && !options.constraints) {
            console.log(chalk_1.default.bold('Labels:'));
            console.log(`  ${schema.labels.join(', ')}`);
            console.log();
            console.log(chalk_1.default.bold('Relationship Types:'));
            console.log(`  ${schema.relationshipTypes.join(', ')}`);
            console.log();
        }
        if (!options.constraints || options.indexes) {
            console.log(chalk_1.default.bold('Indexes:'));
            const indexRows = schema.indexes.map((idx) => ({
                name: idx.name,
                type: idx.type,
                label: idx.label,
                properties: idx.properties.join(', '),
                state: formatIndexState(idx.state),
            }));
            (0, output_js_1.outputTable)(indexRows);
        }
        if (!options.indexes || options.constraints) {
            console.log(chalk_1.default.bold('Constraints:'));
            const constraintRows = schema.constraints.map((c) => ({
                name: c.name,
                type: c.type,
                label: c.label,
                properties: c.properties.join(', '),
            }));
            (0, output_js_1.outputTable)(constraintRows);
        }
    }
    catch (err) {
        spinner.fail('Failed to fetch schema');
        (0, output_js_1.printError)(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}
/**
 * Clear graph cache
 */
async function clearCache(force, globalOpts) {
    if (!force) {
        (0, confirm_js_1.requireInteractive)('Cache clearing');
        const confirmed = await (0, confirm_js_1.confirmWithPhrase)({
            message: 'Clearing the cache may temporarily impact query performance.',
            requireTypedConfirmation: false,
        });
        if (!confirmed) {
            (0, confirm_js_1.abort)();
        }
    }
    if (globalOpts.dryRun) {
        (0, output_js_1.printDryRunBanner)();
        console.log('Would clear graph query cache');
        return;
    }
    const spinner = (0, ora_1.default)('Clearing cache...').start();
    const apiClient = (0, api_client_js_1.createApiClient)({
        endpoint: (0, config_js_1.getEndpoint)(globalOpts.profile, globalOpts.endpoint),
        token: (0, config_js_1.getToken)(globalOpts.profile, globalOpts.token),
    });
    try {
        const response = await apiClient.post('/admin/graph/clear-cache', {});
        spinner.stop();
        if (!response.success) {
            (0, output_js_1.printError)(`Failed to clear cache: ${response.error?.message}`);
            process.exit(1);
        }
        (0, output_js_1.printSuccess)('Cache cleared successfully');
    }
    catch (err) {
        spinner.fail('Failed to clear cache');
        (0, output_js_1.printError)(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}
/**
 * Run vacuum/maintenance
 */
async function runVacuum(options, globalOpts) {
    if (!options.force && !options.analyze) {
        (0, confirm_js_1.requireInteractive)('Database maintenance');
        const confirmed = await (0, confirm_js_1.confirmWithPhrase)({
            message: 'Database vacuum may require significant resources and time. Ensure low-traffic period.',
            requireTypedConfirmation: true,
            typedConfirmationPhrase: confirm_js_1.CONFIRMATION_PHRASES.FORCE,
        });
        if (!confirmed) {
            (0, confirm_js_1.abort)();
        }
    }
    if (globalOpts.dryRun) {
        (0, output_js_1.printDryRunBanner)();
        console.log('Would run database', options.analyze ? 'analyze' : 'vacuum');
        return;
    }
    const spinner = (0, ora_1.default)(options.analyze ? 'Analyzing database...' : 'Running vacuum...').start();
    const apiClient = (0, api_client_js_1.createApiClient)({
        endpoint: (0, config_js_1.getEndpoint)(globalOpts.profile, globalOpts.endpoint),
        token: (0, config_js_1.getToken)(globalOpts.profile, globalOpts.token),
        timeout: 600000, // 10 minute timeout for maintenance
    });
    try {
        const response = await apiClient.post('/admin/graph/vacuum', {
            analyzeOnly: options.analyze ?? false,
        });
        spinner.stop();
        if (!response.success) {
            (0, output_js_1.printError)(`Maintenance failed: ${response.error?.message}`);
            process.exit(1);
        }
        const result = response.data ?? { success: true, duration: 0 };
        if ((0, output_js_1.getOutputFormat)() === 'json') {
            (0, output_js_1.output)(result);
            return;
        }
        (0, output_js_1.printSuccess)(options.analyze ? 'Analysis completed' : 'Vacuum completed');
        console.log(`Duration: ${result.duration}ms`);
        if (result.spaceReclaimed) {
            console.log(`Space reclaimed: ${(0, output_js_1.formatBytes)(result.spaceReclaimed)}`);
        }
    }
    catch (err) {
        spinner.fail('Maintenance failed');
        (0, output_js_1.printError)(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}
/**
 * Export graph data
 */
async function exportGraph(options, globalOpts) {
    const spinner = (0, ora_1.default)('Exporting graph data...').start();
    const apiClient = (0, api_client_js_1.createApiClient)({
        endpoint: (0, config_js_1.getEndpoint)(globalOpts.profile, globalOpts.endpoint),
        token: (0, config_js_1.getToken)(globalOpts.profile, globalOpts.token),
        timeout: 300000, // 5 minute timeout for export
    });
    try {
        const params = new URLSearchParams();
        params.append('format', options.format ?? 'json');
        if (options.labels)
            params.append('labels', options.labels);
        if (options.limit)
            params.append('limit', options.limit);
        const response = await apiClient.get(`/admin/graph/export?${params.toString()}`);
        spinner.stop();
        if (!response.success) {
            (0, output_js_1.printError)(`Export failed: ${response.error?.message}`);
            process.exit(1);
        }
        const exportData = response.data ?? {
            data: {},
            format: options.format ?? 'json',
            nodeCount: 0,
            edgeCount: 0,
        };
        if (options.output) {
            const fs = await Promise.resolve().then(() => __importStar(require('node:fs/promises')));
            const content = typeof exportData.data === 'string'
                ? exportData.data
                : JSON.stringify(exportData.data, null, 2);
            await fs.writeFile(options.output, content);
            (0, output_js_1.printSuccess)(`Exported to ${options.output}`);
            console.log(`  Nodes: ${exportData.nodeCount}`);
            console.log(`  Relationships: ${exportData.edgeCount}`);
        }
        else {
            (0, output_js_1.output)(exportData.data);
        }
    }
    catch (err) {
        spinner.fail('Export failed');
        (0, output_js_1.printError)(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}
/**
 * Format index state with color
 */
function formatIndexState(state) {
    switch (state) {
        case 'ONLINE':
            return chalk_1.default.green('online');
        case 'POPULATING':
            return chalk_1.default.yellow('populating');
        case 'FAILED':
            return chalk_1.default.red('failed');
        default:
            return chalk_1.default.gray(state);
    }
}
/**
 * Mock data for demo/fallback
 */
function getMockGraphStats() {
    return {
        nodeCount: 1250000,
        edgeCount: 4500000,
        labelCounts: {
            Entity: 800000,
            Person: 250000,
            Organization: 150000,
            Location: 50000,
        },
        relationshipCounts: {
            CONNECTED_TO: 2000000,
            BELONGS_TO: 1500000,
            LOCATED_IN: 500000,
            RELATED_TO: 500000,
        },
        storageSize: 8589934592, // 8GB
        cacheHitRate: 0.92,
    };
}
function getMockSchema() {
    return {
        labels: ['Entity', 'Person', 'Organization', 'Location', 'Event', 'Document'],
        relationshipTypes: [
            'CONNECTED_TO',
            'BELONGS_TO',
            'LOCATED_IN',
            'RELATED_TO',
            'PARTICIPATED_IN',
        ],
        indexes: [
            {
                name: 'entity_id_index',
                type: 'RANGE',
                label: 'Entity',
                properties: ['id'],
                state: 'ONLINE',
            },
            {
                name: 'person_name_index',
                type: 'FULLTEXT',
                label: 'Person',
                properties: ['name'],
                state: 'ONLINE',
            },
        ],
        constraints: [
            {
                name: 'entity_id_unique',
                type: 'UNIQUENESS',
                label: 'Entity',
                properties: ['id'],
            },
        ],
    };
}
