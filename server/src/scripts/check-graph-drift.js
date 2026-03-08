"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const GraphConsistencyReporter_js_1 = require("../services/drivers/GraphConsistencyReporter.js");
const postgres_js_1 = require("../db/postgres.js");
const neo4j_js_1 = require("../db/neo4j.js");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const run = async () => {
    const reporter = new GraphConsistencyReporter_js_1.GraphConsistencyReporter();
    // Parse args
    const autoRepair = process.argv.includes('--auto-repair');
    const pruneOrphans = process.argv.includes('--prune-orphans');
    const jsonOutput = process.argv.includes('--json');
    const outputPathIndex = process.argv.indexOf('--output');
    const outputPath = outputPathIndex > -1 ? process.argv[outputPathIndex + 1] : null;
    try {
        logger_js_1.default.info('Starting Graph Consistency Check Script...');
        await reporter.generateReport(outputPath, jsonOutput ? 'json' : 'console', autoRepair, pruneOrphans);
        logger_js_1.default.info('Check completed successfully.');
        process.exit(0);
    }
    catch (error) {
        logger_js_1.default.error('Graph consistency check failed or drift detected.', error);
        process.exit(1);
    }
    finally {
        await (0, postgres_js_1.closePostgresPool)();
        await (0, neo4j_js_1.closeNeo4jDriver)();
    }
};
run();
