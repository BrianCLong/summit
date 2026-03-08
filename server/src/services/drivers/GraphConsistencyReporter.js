"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphConsistencyReporter = void 0;
// @ts-nocheck
const GraphConsistencyService_js_1 = require("../GraphConsistencyService.js");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const logger_js_1 = __importDefault(require("../config/logger.js"));
class GraphConsistencyReporter {
    service;
    constructor(service = GraphConsistencyService_js_1.GraphConsistencyService.getInstance()) {
        this.service = service;
    }
    async generateReport(outputPath = null, format = 'json', autoRepair = false, pruneOrphans = false) {
        const report = await this.service.validateConsistency(autoRepair, pruneOrphans);
        if (format === 'console') {
            console.log('--- Graph Consistency Report ---');
            console.log(`Timestamp: ${report.timestamp}`);
            console.log('Summary:');
            console.table(report.summary);
            if (report.details.missing_ids.length > 0) {
                console.log(`\nMissing in Neo4j (${report.details.missing_ids.length}):`);
                console.log(report.details.missing_ids.slice(0, 10).join(', ') + (report.details.missing_ids.length > 10 ? ' ...' : ''));
            }
            if (report.details.orphan_ids.length > 0) {
                console.log(`\nOrphans in Neo4j (${report.details.orphan_ids.length}):`);
                console.log(report.details.orphan_ids.slice(0, 10).join(', ') + (report.details.orphan_ids.length > 10 ? ' ...' : ''));
            }
            if (report.details.mismatches.length > 0) {
                console.log(`\nProperty Mismatches (${report.details.mismatches.length}):`);
                report.details.mismatches.slice(0, 5).forEach(m => {
                    console.log(`- ID: ${m.id}`);
                    console.log(`  Diff: ${JSON.stringify(m.diff)}`);
                });
                if (report.details.mismatches.length > 5)
                    console.log(`... and ${report.details.mismatches.length - 5} more`);
            }
            if (report.details.orphan_edges.length > 0) {
                console.log(`\nOrphan Edges (${report.details.orphan_edges.length}):`);
                console.log(`Edges connected to valid nodes but invalid endpoints, or edges that will be removed with orphans.`);
            }
            if (report.actions_taken.length > 0) {
                console.log(`\nActions Taken (${report.actions_taken.length}):`);
                report.actions_taken.slice(0, 10).forEach(a => console.log(`- ${a}`));
                if (report.actions_taken.length > 10)
                    console.log(`... and ${report.actions_taken.length - 10} more`);
            }
            console.log('--------------------------------');
        }
        if (outputPath) {
            const outputDir = path_1.default.dirname(outputPath);
            await promises_1.default.mkdir(outputDir, { recursive: true });
            await promises_1.default.writeFile(outputPath, JSON.stringify(report, null, 2));
            logger_js_1.default.info(`Consistency report written to ${outputPath}`);
        }
        else if (format === 'json') {
            console.log(JSON.stringify(report, null, 2));
        }
        if (report.summary.total_drift_detected > 0) {
            // Allow CI to exit non-zero if drift detected and not repaired
            if (!autoRepair && !pruneOrphans) {
                throw new Error(`Graph drift detected: ${report.summary.total_drift_detected} issues found.`);
            }
        }
    }
}
exports.GraphConsistencyReporter = GraphConsistencyReporter;
