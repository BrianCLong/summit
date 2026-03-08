#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const promises_1 = require("fs/promises");
const js_yaml_1 = require("js-yaml");
const pg_1 = require("pg");
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const glob_1 = require("glob");
const pg_js_1 = require("./loader/pg.js");
const neo4j_js_1 = require("./loader/neo4j.js");
const compare_js_1 = require("./diff/compare.js");
const emit_js_1 = require("./report/emit.js");
const plan_js_1 = require("./autofix/plan.js");
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const program = new commander_1.Command();
program
    .name('graph-sync-validator')
    .description('Graph-Postgres drift validator')
    .version('0.1.0');
program.command('run')
    .requiredOption('--selectors <pattern>', 'Path to selectors yaml (glob supported)')
    .requiredOption('--pg <url>', 'Postgres connection string')
    .requiredOption('--neo4j <url>', 'Neo4j connection string')
    .option('--out <path>', 'Output path for report.json', './report.json')
    .option('--chunk-size <number>', 'Chunk size', '1000')
    .option('--apply', 'Apply autofix', false)
    .action(async (options) => {
    const startTime = Date.now();
    console.log(chalk_1.default.blue('Starting Graph-Sync Validator...'));
    // Load Selectors
    const files = await (0, glob_1.glob)(options.selectors);
    if (files.length === 0) {
        console.error(chalk_1.default.red(`No selectors found for pattern: ${options.selectors}`));
        process.exit(1);
    }
    console.log(chalk_1.default.dim(`Loaded ${files.length} selector files.`));
    // Connect DBs
    const pool = new pg_1.Pool({ connectionString: options.pg });
    // Handle potential auth in URL or assume standardized connection string
    const driver = neo4j_driver_1.default.driver(options.neo4j);
    const pgLoader = new pg_js_1.PgLoader(pool);
    const neoLoader = new neo4j_js_1.Neo4jLoader(driver);
    const severityWeights = {
        MISSING_NODE: 10,
        MISSING_REL: 7,
        PROP_MISMATCH: 6,
        ORPHAN_NODE: 3,
        ORPHAN_REL: 3
    };
    const allFindings = [];
    const aggregatedPlan = { cypher: [], sql: [] };
    const metrics = { scannedRows: 0, scannedNodes: 0, scannedRels: 0, durationMs: 0 };
    try {
        await driver.verifyConnectivity();
        for (const file of files) {
            console.log(chalk_1.default.yellow(`Processing ${file}...`));
            const content = await (0, promises_1.readFile)(file, 'utf-8');
            const selector = (0, js_yaml_1.load)(content);
            const selectorFindings = [];
            const pgStream = pgLoader.load(selector, Number(options.chunkSize));
            const neoStream = neoLoader.load(selector, Number(options.chunkSize));
            const diffIter = (0, compare_js_1.diffStream)(pgStream, neoStream, selector, severityWeights);
            for await (const finding of diffIter) {
                selectorFindings.push(finding);
                allFindings.push(finding);
            }
            const plan = (0, plan_js_1.generatePlan)(selectorFindings, selector);
            aggregatedPlan.cypher.push(...plan.cypher);
            aggregatedPlan.sql.push(...plan.sql);
        }
    }
    catch (err) {
        console.error(chalk_1.default.red('Error during execution:'), err);
        process.exit(1);
    }
    finally {
        await pool.end();
        await driver.close();
    }
    metrics.durationMs = Date.now() - startTime;
    const report = (0, emit_js_1.createReport)(`run-${startTime}`, allFindings, aggregatedPlan, metrics);
    const reportJson = JSON.stringify(report, null, 2);
    await (0, promises_1.mkdir)(path_1.default.dirname(options.out), { recursive: true });
    await (0, promises_1.writeFile)(options.out, reportJson);
    console.log(chalk_1.default.green(`Report written to ${options.out}`));
    console.log(chalk_1.default.dim(`Hash: ${report.deterministicHash}`));
    if (options.apply) {
        if (aggregatedPlan.cypher.length > 0 || aggregatedPlan.sql.length > 0) {
            console.log(chalk_1.default.yellow('Applying auto-fix...'));
            // Execute Cypher
            if (aggregatedPlan.cypher.length > 0) {
                const session = driver.session();
                try {
                    for (const query of aggregatedPlan.cypher) {
                        console.log(chalk_1.default.dim(`Exec Cypher: ${query}`));
                        await session.run(query);
                    }
                }
                catch (e) {
                    console.error(chalk_1.default.red('Cypher Apply failed'), e);
                    throw e;
                }
                finally {
                    await session.close();
                }
            }
            // Execute SQL
            if (aggregatedPlan.sql.length > 0) {
                const client = await pool.connect();
                try {
                    await client.query('BEGIN');
                    for (const query of aggregatedPlan.sql) {
                        console.log(chalk_1.default.dim(`Exec SQL: ${query}`));
                        await client.query(query);
                    }
                    await client.query('COMMIT');
                }
                catch (e) {
                    await client.query('ROLLBACK');
                    console.error(chalk_1.default.red('SQL Apply failed, rolled back.'), e);
                    throw e;
                }
                finally {
                    client.release();
                }
            }
            console.log(chalk_1.default.green('Auto-fix applied successfully.'));
        }
        else {
            console.log(chalk_1.default.green('No drift to fix.'));
        }
    }
});
async function run() {
    await program.parseAsync(process.argv);
}
run();
