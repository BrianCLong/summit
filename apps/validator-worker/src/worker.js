"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const dotenv_1 = __importDefault(require("dotenv"));
const pg_1 = require("pg");
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const glob_1 = require("glob");
const promises_1 = require("fs/promises");
const js_yaml_1 = require("js-yaml");
const graph_sync_validator_1 = require("@intelgraph/graph-sync-validator");
dotenv_1.default.config();
const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379
};
const worker = new bullmq_1.Worker('graph-sync-validator', async (job) => {
    console.log(`Processing job ${job.id}`);
    const { selectorsGlob, pgUrlSecret, neo4jUrlSecret, outPath, apply } = job.data;
    // In a real env, resolve secrets. Here assuming they are the connection strings.
    const pgUrl = pgUrlSecret;
    const neo4jUrl = neo4jUrlSecret;
    const files = await (0, glob_1.glob)(selectorsGlob);
    const pool = new pg_1.Pool({ connectionString: pgUrl });
    const driver = neo4j_driver_1.default.driver(neo4jUrl);
    const pgLoader = new graph_sync_validator_1.PgLoader(pool);
    const neoLoader = new graph_sync_validator_1.Neo4jLoader(driver);
    const severityWeights = { MISSING_NODE: 10, MISSING_REL: 7, PROP_MISMATCH: 6, ORPHAN_NODE: 3, ORPHAN_REL: 3 };
    const allFindings = [];
    const aggregatedPlan = { cypher: [], sql: [] };
    const metrics = { scannedRows: 0, scannedNodes: 0, scannedRels: 0, durationMs: 0 };
    const startTime = Date.now();
    try {
        await driver.verifyConnectivity();
        for (const file of files) {
            const content = await (0, promises_1.readFile)(file, 'utf-8');
            const selector = (0, js_yaml_1.load)(content);
            const selectorFindings = [];
            const pgStream = pgLoader.load(selector, 1000);
            const neoStream = neoLoader.load(selector, 1000);
            const diffIter = (0, graph_sync_validator_1.diffStream)(pgStream, neoStream, selector, severityWeights);
            for await (const finding of diffIter) {
                selectorFindings.push(finding);
                allFindings.push(finding);
            }
            const plan = (0, graph_sync_validator_1.generatePlan)(selectorFindings, selector);
            aggregatedPlan.cypher.push(...plan.cypher);
            aggregatedPlan.sql.push(...plan.sql);
        }
    }
    finally {
        await pool.end();
        await driver.close();
    }
    metrics.durationMs = Date.now() - startTime;
    const report = (0, graph_sync_validator_1.createReport)(job.id || 'unknown', allFindings, aggregatedPlan, metrics);
    console.log(`Job ${job.id} completed. Drift hash: ${report.deterministicHash}`);
    return report;
}, { connection });
console.log('Worker started');
