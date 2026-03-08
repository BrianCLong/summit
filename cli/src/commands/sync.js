"use strict";
/**
 * Sync Commands
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSyncCommands = registerSyncCommands;
const ora_1 = __importDefault(require("ora"));
const config_js_1 = require("../lib/config.js");
const graph_client_js_1 = require("../lib/graph-client.js");
const pgvector_sync_js_1 = require("../lib/pgvector-sync.js");
const output_js_1 = require("../utils/output.js");
const errors_js_1 = require("../utils/errors.js");
function registerSyncCommands(program, config) {
    const sync = program
        .command('sync')
        .alias('s')
        .description('PgVector synchronization operations');
    sync
        .command('run')
        .description('Synchronize graph nodes to pgvector')
        .option('--batch-size <number>', 'Batch size for processing', '1000')
        .option('--dimension <number>', 'Embedding dimension', '1536')
        .option('--table <name>', 'Target table name', 'node_embeddings')
        .option('--truncate', 'Truncate table before sync')
        .option('--dry-run', 'Simulate sync without writing')
        .option('--profile <name>', 'Use named profile')
        .action(async (options) => {
        const spinner = (0, ora_1.default)('Initializing sync...').start();
        try {
            const profile = (0, config_js_1.getProfile)(config, options.profile);
            if (!profile.neo4j) {
                throw new errors_js_1.ConnectionError('Neo4j configuration not found');
            }
            if (!profile.postgres) {
                throw new errors_js_1.ConnectionError('PostgreSQL configuration not found');
            }
            // Initialize clients
            spinner.text = 'Connecting to databases...';
            const graphClient = new graph_client_js_1.GraphClient(profile.neo4j);
            await graphClient.connect();
            const pgSync = new pgvector_sync_js_1.PgVectorSync(profile.postgres);
            pgSync.setGraphClient(graphClient);
            await pgSync.connect();
            // Run sync
            spinner.text = 'Running synchronization...';
            const status = await pgSync.syncFromGraph({
                batchSize: parseInt(options.batchSize),
                embeddingDimension: parseInt(options.dimension),
                tableName: options.table,
                truncate: options.truncate,
                dryRun: options.dryRun,
            }, (s) => {
                spinner.text = `Syncing: ${s.progress}% (${s.stats.processedNodes}/${s.stats.totalNodes} nodes)`;
            });
            await graphClient.disconnect();
            await pgSync.disconnect();
            spinner.stop();
            if (program.opts().json) {
                console.log(JSON.stringify(status, null, 2));
            }
            else {
                if (status.status === 'completed') {
                    (0, output_js_1.success)(options.dryRun ? 'Dry run completed' : 'Sync completed successfully');
                    console.log(`\nSync Statistics:`);
                    console.log(`  Total Nodes: ${status.stats.totalNodes.toLocaleString()}`);
                    console.log(`  Processed: ${status.stats.processedNodes.toLocaleString()}`);
                    console.log(`  Inserted: ${status.stats.insertedRows.toLocaleString()}`);
                    console.log(`  Updated: ${status.stats.updatedRows.toLocaleString()}`);
                    console.log(`  Skipped: ${status.stats.skippedRows.toLocaleString()}`);
                    console.log(`  Errors: ${status.stats.errors}`);
                    console.log(`  Duration: ${(status.stats.duration / 1000).toFixed(2)}s`);
                }
                else {
                    (0, output_js_1.error)(`Sync failed: ${status.error}`);
                }
            }
        }
        catch (err) {
            spinner.stop();
            (0, errors_js_1.handleError)(err);
        }
    });
    sync
        .command('search <query>')
        .description('Search embeddings by similarity')
        .option('--limit <number>', 'Maximum results', '10')
        .option('--threshold <number>', 'Minimum similarity threshold')
        .option('--labels <labels>', 'Filter by labels (comma-separated)')
        .option('--table <name>', 'Table name', 'node_embeddings')
        .option('--profile <name>', 'Use named profile')
        .action(async (query, options) => {
        const spinner = (0, ora_1.default)('Searching embeddings...').start();
        try {
            const profile = (0, config_js_1.getProfile)(config, options.profile);
            if (!profile.postgres) {
                throw new errors_js_1.ConnectionError('PostgreSQL configuration not found');
            }
            const pgSync = new pgvector_sync_js_1.PgVectorSync(profile.postgres);
            await pgSync.connect();
            // Generate query embedding (placeholder - in production call embedding service)
            const queryEmbedding = generateQueryEmbedding(query, 1536);
            const results = await pgSync.search(queryEmbedding, {
                limit: parseInt(options.limit),
                threshold: options.threshold ? parseFloat(options.threshold) : undefined,
                labels: options.labels?.split(','),
                tableName: options.table,
            });
            await pgSync.disconnect();
            spinner.stop();
            if (program.opts().json) {
                console.log(JSON.stringify(results, null, 2));
            }
            else {
                if (results.length === 0) {
                    console.log('No results found');
                }
                else {
                    const tableData = results.map((r) => ({
                        id: r.id.substring(0, 20) + '...',
                        similarity: r.similarity?.toFixed(4) || 'N/A',
                        labels: r.metadata?.labels?.join(', ') || '',
                    }));
                    console.log((0, output_js_1.formatTable)(tableData));
                    console.log(`\n${results.length} results found`);
                }
            }
        }
        catch (err) {
            spinner.stop();
            (0, errors_js_1.handleError)(err);
        }
    });
    sync
        .command('get <nodeId>')
        .description('Get embedding for a specific node')
        .option('--table <name>', 'Table name', 'node_embeddings')
        .option('--profile <name>', 'Use named profile')
        .action(async (nodeId, options) => {
        try {
            const profile = (0, config_js_1.getProfile)(config, options.profile);
            if (!profile.postgres) {
                throw new errors_js_1.ConnectionError('PostgreSQL configuration not found');
            }
            const pgSync = new pgvector_sync_js_1.PgVectorSync(profile.postgres);
            await pgSync.connect();
            const result = await pgSync.getEmbedding(nodeId, options.table);
            await pgSync.disconnect();
            if (!result) {
                (0, output_js_1.error)(`Embedding not found for node ${nodeId}`);
                process.exit(1);
            }
            if (program.opts().json) {
                console.log(JSON.stringify(result, null, 2));
            }
            else {
                console.log(`\nEmbedding for node ${nodeId}:`);
                console.log(`  Dimension: ${result.embedding.length}`);
                console.log(`  Labels: ${result.metadata?.labels?.join(', ') || 'none'}`);
                console.log(`  Preview: [${result.embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
            }
        }
        catch (err) {
            (0, errors_js_1.handleError)(err);
        }
    });
    sync
        .command('delete <nodeId>')
        .description('Delete embedding for a node')
        .option('--table <name>', 'Table name', 'node_embeddings')
        .option('--profile <name>', 'Use named profile')
        .action(async (nodeId, options) => {
        try {
            const profile = (0, config_js_1.getProfile)(config, options.profile);
            if (!profile.postgres) {
                throw new errors_js_1.ConnectionError('PostgreSQL configuration not found');
            }
            const pgSync = new pgvector_sync_js_1.PgVectorSync(profile.postgres);
            await pgSync.connect();
            const deleted = await pgSync.deleteEmbedding(nodeId, options.table);
            await pgSync.disconnect();
            if (deleted) {
                (0, output_js_1.success)(`Embedding deleted for node ${nodeId}`);
            }
            else {
                (0, output_js_1.error)(`Embedding not found for node ${nodeId}`);
            }
        }
        catch (err) {
            (0, errors_js_1.handleError)(err);
        }
    });
    sync
        .command('stats')
        .description('Show pgvector synchronization statistics')
        .option('--table <name>', 'Table name', 'node_embeddings')
        .option('--profile <name>', 'Use named profile')
        .action(async (options) => {
        const spinner = (0, ora_1.default)('Fetching statistics...').start();
        try {
            const profile = (0, config_js_1.getProfile)(config, options.profile);
            if (!profile.postgres) {
                throw new errors_js_1.ConnectionError('PostgreSQL configuration not found');
            }
            const pgSync = new pgvector_sync_js_1.PgVectorSync(profile.postgres);
            await pgSync.connect();
            const stats = await pgSync.getStats(options.table);
            await pgSync.disconnect();
            spinner.stop();
            if (program.opts().json) {
                console.log(JSON.stringify(stats, null, 2));
            }
            else {
                console.log('\nPgVector Statistics:');
                console.log(`  Total Embeddings: ${stats.totalEmbeddings.toLocaleString()}`);
                console.log(`  Dimension: ${stats.dimension}`);
                console.log(`  Labels: ${stats.labels.join(', ') || 'none'}`);
                if (stats.lastUpdated) {
                    console.log(`  Last Updated: ${stats.lastUpdated.toISOString()}`);
                }
            }
        }
        catch (err) {
            spinner.stop();
            (0, errors_js_1.handleError)(err);
        }
    });
    sync
        .command('health')
        .description('Check pgvector connectivity')
        .option('--profile <name>', 'Use named profile')
        .action(async (options) => {
        const spinner = (0, ora_1.default)('Checking connection...').start();
        try {
            const profile = (0, config_js_1.getProfile)(config, options.profile);
            if (!profile.postgres) {
                throw new errors_js_1.ConnectionError('PostgreSQL configuration not found');
            }
            const pgSync = new pgvector_sync_js_1.PgVectorSync(profile.postgres);
            const health = await pgSync.healthCheck();
            await pgSync.disconnect();
            spinner.stop();
            if (program.opts().json) {
                console.log(JSON.stringify(health, null, 2));
            }
            else {
                if (health.connected) {
                    (0, output_js_1.success)(`Connected to PostgreSQL (${health.latencyMs}ms)`);
                    if (health.pgvectorVersion) {
                        console.log(`  pgvector version: ${health.pgvectorVersion}`);
                    }
                }
                else {
                    (0, output_js_1.error)('Failed to connect to PostgreSQL');
                }
            }
        }
        catch (err) {
            spinner.stop();
            (0, errors_js_1.handleError)(err);
        }
    });
    sync
        .command('init')
        .description('Initialize pgvector table and indexes')
        .option('--dimension <number>', 'Embedding dimension', '1536')
        .option('--table <name>', 'Table name', 'node_embeddings')
        .option('--profile <name>', 'Use named profile')
        .action(async (options) => {
        const spinner = (0, ora_1.default)('Initializing table...').start();
        try {
            const profile = (0, config_js_1.getProfile)(config, options.profile);
            if (!profile.postgres) {
                throw new errors_js_1.ConnectionError('PostgreSQL configuration not found');
            }
            const pgSync = new pgvector_sync_js_1.PgVectorSync(profile.postgres);
            await pgSync.connect();
            await pgSync.ensureTable({
                embeddingDimension: parseInt(options.dimension),
                tableName: options.table,
            });
            await pgSync.disconnect();
            spinner.stop();
            (0, output_js_1.success)(`Table ${options.table} initialized with dimension ${options.dimension}`);
        }
        catch (err) {
            spinner.stop();
            (0, errors_js_1.handleError)(err);
        }
    });
}
/**
 * Generate a placeholder query embedding (in production, call embedding service)
 */
function generateQueryEmbedding(query, dimension) {
    const hash = (str) => {
        let h = 0;
        for (let i = 0; i < str.length; i++) {
            h = (h << 5) - h + str.charCodeAt(i);
            h = h & h;
        }
        return h;
    };
    const seed = hash(query);
    const embedding = [];
    for (let i = 0; i < dimension; i++) {
        embedding.push(Math.sin(seed + i) * 0.5 + 0.5);
    }
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map((val) => val / magnitude);
}
