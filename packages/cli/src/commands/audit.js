"use strict";
/**
 * Summit CLI Audit Commands
 *
 * Audit log commands.
 *
 * SOC 2 Controls: CC7.2 (Monitoring), CC7.3 (Evaluation)
 *
 * @module @summit/cli/commands/audit
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
exports.auditCommands = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const client_js_1 = require("../client.js");
const utils_js_1 = require("../utils.js");
/**
 * Query audit logs
 */
const logs = new commander_1.Command('logs')
    .description('Query audit logs')
    .option('--start <date>', 'Start date (ISO format)')
    .option('--end <date>', 'End date (ISO format)')
    .option('-u, --user <userId>', 'Filter by user ID')
    .option('-a, --action <action>', 'Filter by action')
    .option('-r, --resource <type>', 'Filter by resource type')
    .option('-o, --outcome <outcome>', 'Filter by outcome (success, failure, denied)')
    .option('-l, --limit <number>', 'Maximum entries to return', '50')
    .option('--offset <number>', 'Offset for pagination', '0')
    .option('-f, --format <format>', 'Output format (table, json)', 'table')
    .action(async (options) => {
    const params = {
        limit: options.limit,
        offset: options.offset,
    };
    if (options.start)
        params.startDate = options.start;
    if (options.end)
        params.endDate = options.end;
    if (options.user)
        params.userId = options.user;
    if (options.action)
        params.action = options.action;
    if (options.resource)
        params.resourceType = options.resource;
    if (options.outcome)
        params.outcome = options.outcome;
    const response = await (0, client_js_1.get)('/audit/logs', params);
    if (options.format === 'json') {
        console.log(JSON.stringify(response.data, null, 2));
        return;
    }
    if (response.data.length === 0) {
        console.log(chalk_1.default.yellow('No audit entries found.'));
        return;
    }
    console.log(chalk_1.default.bold('\nAudit Log Entries\n'));
    // Format for table display
    const displayData = response.data.map((entry) => ({
        id: entry.id.substring(0, 8),
        timestamp: (0, utils_js_1.formatDate)(entry.timestamp),
        user: entry.userId.substring(0, 8),
        action: entry.action,
        resource: `${entry.resource.type}/${entry.resource.id.substring(0, 8)}`,
        outcome: entry.outcome,
        verdict: entry.verdict || '-',
    }));
    console.log((0, utils_js_1.formatOutput)(displayData, ['id', 'timestamp', 'user', 'action', 'resource', 'outcome', 'verdict']));
    console.log(`\nShowing ${response.data.length} entries (offset: ${options.offset})`);
});
/**
 * Export audit logs
 */
const exportCmd = new commander_1.Command('export')
    .description('Export audit logs to file')
    .option('--start <date>', 'Start date (ISO format)', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .option('--end <date>', 'End date (ISO format)', new Date().toISOString())
    .option('-u, --user <userId>', 'Filter by user ID')
    .option('-a, --action <action>', 'Filter by action')
    .option('--format <format>', 'Export format (json, csv)', 'json')
    .option('-o, --output <path>', 'Output file path')
    .action(async (options) => {
    const params = {
        startDate: options.start,
        endDate: options.end,
        limit: '10000', // Max export limit
    };
    if (options.user)
        params.userId = options.user;
    if (options.action)
        params.action = options.action;
    console.log(chalk_1.default.blue('Fetching audit logs...'));
    const response = await (0, client_js_1.get)('/audit/logs', params);
    let output;
    let filename;
    if (options.format === 'csv') {
        // Convert to CSV
        const headers = ['id', 'timestamp', 'userId', 'action', 'resourceType', 'resourceId', 'outcome', 'verdict', 'ipAddress'];
        const rows = response.data.map((entry) => [
            entry.id,
            entry.timestamp,
            entry.userId,
            entry.action,
            entry.resource.type,
            entry.resource.id,
            entry.outcome,
            entry.verdict || '',
            entry.ipAddress || '',
        ].map(v => `"${v}"`).join(','));
        output = [headers.join(','), ...rows].join('\n');
        filename = options.output || `audit-export-${new Date().toISOString().split('T')[0]}.csv`;
    }
    else {
        output = JSON.stringify(response.data, null, 2);
        filename = options.output || `audit-export-${new Date().toISOString().split('T')[0]}.json`;
    }
    const { writeFileSync } = await Promise.resolve().then(() => __importStar(require('fs')));
    writeFileSync(filename, output);
    console.log(chalk_1.default.green(`\nExported ${response.data.length} entries to ${filename}`));
});
exports.auditCommands = {
    logs,
    export: exportCmd,
};
