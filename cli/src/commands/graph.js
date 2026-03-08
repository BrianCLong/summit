"use strict";
/**
 * Graph Query Commands
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerGraphCommands = registerGraphCommands;
const ora_1 = __importDefault(require("ora"));
const config_js_1 = require("../lib/config.js");
const graph_client_js_1 = require("../lib/graph-client.js");
const output_js_1 = require("../utils/output.js");
const errors_js_1 = require("../utils/errors.js");
const constants_js_1 = require("../lib/constants.js");
function registerGraphCommands(program, config) {
    const graph = program
        .command('graph')
        .alias('g')
        .description('Graph database operations');
    graph
        .command('query <cypher>')
        .alias('q')
        .description('Execute a Cypher query')
        .option('-l, --limit <number>', 'Limit results', String(constants_js_1.DEFAULT_QUERY_LIMIT))
        .option('-p, --params <json>', 'Query parameters as JSON')
        .option('-d, --database <name>', 'Target database')
        .option('--explain', 'Show query execution plan')
        .option('--profile <name>', 'Use named profile')
        .action(async (cypher, options) => {
        const spinner = (0, ora_1.default)('Executing query...').start();
        try {
            const profile = (0, config_js_1.getProfile)(config, options.profile);
            if (!profile.neo4j) {
                throw new errors_js_1.ConnectionError('Neo4j configuration not found');
            }
            const client = new graph_client_js_1.GraphClient(profile.neo4j);
            await client.connect();
            const params = options.params ? JSON.parse(options.params) : {};
            if (options.explain) {
                spinner.text = 'Generating execution plan...';
                const plan = await client.explain(cypher);
                spinner.stop();
                console.log((0, output_js_1.formatOutput)(plan, { format: program.opts().json ? 'json' : 'plain' }));
            }
            else {
                const result = await client.query(cypher, {
                    limit: parseInt(options.limit),
                    parameters: params,
                    database: options.database,
                });
                spinner.stop();
                if (program.opts().json) {
                    console.log(JSON.stringify(result, null, 2));
                }
                else {
                    if (result.rows.length === 0) {
                        console.log('No results found');
                    }
                    else {
                        const tableData = result.rows.map((row) => {
                            const obj = {};
                            result.columns.forEach((col, i) => {
                                obj[col] = row[i];
                            });
                            return obj;
                        });
                        console.log((0, output_js_1.formatTable)(tableData));
                    }
                    console.log(`\n${result.totalRows} rows returned in ${result.summary.resultAvailableAfter}ms`);
                }
            }
            await client.disconnect();
        }
        catch (err) {
            spinner.stop();
            (0, errors_js_1.handleError)(err);
        }
    });
    graph
        .command('nodes')
        .alias('n')
        .description('List nodes by label')
        .option('-l, --label <label>', 'Filter by label')
        .option('-p, --properties <json>', 'Filter by properties')
        .option('--limit <number>', 'Limit results', String(constants_js_1.DEFAULT_QUERY_LIMIT))
        .option('--profile <name>', 'Use named profile')
        .action(async (options) => {
        const spinner = (0, ora_1.default)('Fetching nodes...').start();
        try {
            const profile = (0, config_js_1.getProfile)(config, options.profile);
            if (!profile.neo4j) {
                throw new errors_js_1.ConnectionError('Neo4j configuration not found');
            }
            const client = new graph_client_js_1.GraphClient(profile.neo4j);
            await client.connect();
            const props = options.properties ? JSON.parse(options.properties) : undefined;
            const nodes = await client.queryNodes(options.label, props, {
                limit: parseInt(options.limit),
            });
            spinner.stop();
            if (program.opts().json) {
                console.log(JSON.stringify(nodes, null, 2));
            }
            else {
                if (nodes.length === 0) {
                    console.log('No nodes found');
                }
                else {
                    const tableData = nodes.map((n) => ({
                        id: n.id.substring(0, 20) + '...',
                        labels: n.labels.join(', '),
                        properties: Object.keys(n.properties).length + ' props',
                    }));
                    console.log((0, output_js_1.formatTable)(tableData));
                }
                console.log(`\n${nodes.length} nodes found`);
            }
            await client.disconnect();
        }
        catch (err) {
            spinner.stop();
            (0, errors_js_1.handleError)(err);
        }
    });
    graph
        .command('relationships')
        .alias('rels')
        .description('List relationships by type')
        .option('-t, --type <type>', 'Filter by relationship type')
        .option('--limit <number>', 'Limit results', String(constants_js_1.DEFAULT_QUERY_LIMIT))
        .option('--profile <name>', 'Use named profile')
        .action(async (options) => {
        const spinner = (0, ora_1.default)('Fetching relationships...').start();
        try {
            const profile = (0, config_js_1.getProfile)(config, options.profile);
            if (!profile.neo4j) {
                throw new errors_js_1.ConnectionError('Neo4j configuration not found');
            }
            const client = new graph_client_js_1.GraphClient(profile.neo4j);
            await client.connect();
            const relationships = await client.queryRelationships(options.type, {
                limit: parseInt(options.limit),
            });
            spinner.stop();
            if (program.opts().json) {
                console.log(JSON.stringify(relationships, null, 2));
            }
            else {
                if (relationships.length === 0) {
                    console.log('No relationships found');
                }
                else {
                    const tableData = relationships.map((r) => ({
                        id: r.id.substring(0, 20) + '...',
                        type: r.type,
                        start: r.startNodeId.substring(0, 15) + '...',
                        end: r.endNodeId.substring(0, 15) + '...',
                    }));
                    console.log((0, output_js_1.formatTable)(tableData));
                }
                console.log(`\n${relationships.length} relationships found`);
            }
            await client.disconnect();
        }
        catch (err) {
            spinner.stop();
            (0, errors_js_1.handleError)(err);
        }
    });
    graph
        .command('path <startId> <endId>')
        .description('Find paths between two nodes')
        .option('--max-depth <number>', 'Maximum path depth', '5')
        .option('--limit <number>', 'Limit results', '10')
        .option('--profile <name>', 'Use named profile')
        .action(async (startId, endId, options) => {
        const spinner = (0, ora_1.default)('Finding paths...').start();
        try {
            const profile = (0, config_js_1.getProfile)(config, options.profile);
            if (!profile.neo4j) {
                throw new errors_js_1.ConnectionError('Neo4j configuration not found');
            }
            const client = new graph_client_js_1.GraphClient(profile.neo4j);
            await client.connect();
            const paths = await client.findPaths(startId, endId, {
                maxDepth: parseInt(options.maxDepth),
                limit: parseInt(options.limit),
            });
            spinner.stop();
            if (program.opts().json) {
                console.log(JSON.stringify(paths, null, 2));
            }
            else {
                if (paths.length === 0) {
                    console.log('No paths found');
                }
                else {
                    for (let i = 0; i < paths.length; i++) {
                        const path = paths[i];
                        console.log(`\nPath ${i + 1} (length: ${path.length}):`);
                        const pathStr = path.nodes
                            .map((n) => `(${n.labels.join(':')}:${n.id.substring(0, 8)})`)
                            .join(' -> ');
                        console.log(`  ${pathStr}`);
                    }
                }
                console.log(`\n${paths.length} paths found`);
            }
            await client.disconnect();
        }
        catch (err) {
            spinner.stop();
            (0, errors_js_1.handleError)(err);
        }
    });
    graph
        .command('neighbors <nodeId>')
        .description('Get neighbors of a node')
        .option('-d, --direction <dir>', 'Direction: in, out, both', 'both')
        .option('--limit <number>', 'Limit results', String(constants_js_1.DEFAULT_QUERY_LIMIT))
        .option('--profile <name>', 'Use named profile')
        .action(async (nodeId, options) => {
        const spinner = (0, ora_1.default)('Fetching neighbors...').start();
        try {
            const profile = (0, config_js_1.getProfile)(config, options.profile);
            if (!profile.neo4j) {
                throw new errors_js_1.ConnectionError('Neo4j configuration not found');
            }
            const client = new graph_client_js_1.GraphClient(profile.neo4j);
            await client.connect();
            const neighbors = await client.getNeighbors(nodeId, options.direction, {
                limit: parseInt(options.limit),
            });
            spinner.stop();
            if (program.opts().json) {
                console.log(JSON.stringify(neighbors, null, 2));
            }
            else {
                if (neighbors.length === 0) {
                    console.log('No neighbors found');
                }
                else {
                    const tableData = neighbors.map((n) => ({
                        id: n.id.substring(0, 20) + '...',
                        labels: n.labels.join(', '),
                        properties: Object.keys(n.properties).length + ' props',
                    }));
                    console.log((0, output_js_1.formatTable)(tableData));
                }
                console.log(`\n${neighbors.length} neighbors found`);
            }
            await client.disconnect();
        }
        catch (err) {
            spinner.stop();
            (0, errors_js_1.handleError)(err);
        }
    });
    graph
        .command('stats')
        .description('Show graph database statistics')
        .option('--profile <name>', 'Use named profile')
        .action(async (options) => {
        const spinner = (0, ora_1.default)('Fetching statistics...').start();
        try {
            const profile = (0, config_js_1.getProfile)(config, options.profile);
            if (!profile.neo4j) {
                throw new errors_js_1.ConnectionError('Neo4j configuration not found');
            }
            const client = new graph_client_js_1.GraphClient(profile.neo4j);
            await client.connect();
            const stats = await client.getStats();
            spinner.stop();
            if (program.opts().json) {
                console.log(JSON.stringify(stats, null, 2));
            }
            else {
                console.log('\nGraph Statistics:');
                console.log(`  Nodes: ${stats.nodeCount.toLocaleString()}`);
                console.log(`  Relationships: ${stats.relationshipCount.toLocaleString()}`);
                console.log(`  Labels: ${stats.labels.join(', ') || 'none'}`);
                console.log(`  Relationship Types: ${stats.relationshipTypes.join(', ') || 'none'}`);
            }
            await client.disconnect();
        }
        catch (err) {
            spinner.stop();
            (0, errors_js_1.handleError)(err);
        }
    });
    graph
        .command('health')
        .description('Check graph database connectivity')
        .option('--profile <name>', 'Use named profile')
        .action(async (options) => {
        const spinner = (0, ora_1.default)('Checking connection...').start();
        try {
            const profile = (0, config_js_1.getProfile)(config, options.profile);
            if (!profile.neo4j) {
                throw new errors_js_1.ConnectionError('Neo4j configuration not found');
            }
            const client = new graph_client_js_1.GraphClient(profile.neo4j);
            const health = await client.healthCheck();
            spinner.stop();
            if (program.opts().json) {
                console.log(JSON.stringify(health, null, 2));
            }
            else {
                if (health.connected) {
                    (0, output_js_1.success)(`Connected to Neo4j (${health.latencyMs}ms)`);
                    if (health.serverInfo) {
                        console.log(`  Version: ${health.serverInfo.version}`);
                        console.log(`  Edition: ${health.serverInfo.edition}`);
                    }
                }
                else {
                    (0, output_js_1.error)('Failed to connect to Neo4j');
                }
            }
            await client.disconnect();
        }
        catch (err) {
            spinner.stop();
            (0, errors_js_1.handleError)(err);
        }
    });
}
