"use strict";
/**
 * Output formatting utilities for Admin CLI
 * Supports JSON (machine-parseable) and human-readable formats
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setOutputFormat = setOutputFormat;
exports.getOutputFormat = getOutputFormat;
exports.output = output;
exports.outputJson = outputJson;
exports.outputYaml = outputYaml;
exports.outputTable = outputTable;
exports.outputKeyValue = outputKeyValue;
exports.formatHealthStatus = formatHealthStatus;
exports.formatPercentage = formatPercentage;
exports.formatDuration = formatDuration;
exports.formatBytes = formatBytes;
exports.formatTimestamp = formatTimestamp;
exports.printHeader = printHeader;
exports.printSuccess = printSuccess;
exports.printWarning = printWarning;
exports.printError = printError;
exports.printInfo = printInfo;
exports.printDryRunBanner = printDryRunBanner;
const chalk_1 = __importDefault(require("chalk"));
const table_1 = require("table");
/**
 * Global output format setting
 */
let globalFormat = 'table';
/**
 * Set global output format
 */
function setOutputFormat(format) {
    globalFormat = format;
}
/**
 * Get current output format
 */
function getOutputFormat() {
    return globalFormat;
}
/**
 * Format and print data based on output format
 */
function output(data, options) {
    const format = options?.format ?? globalFormat;
    switch (format) {
        case 'json':
            outputJson(data);
            break;
        case 'yaml':
            outputYaml(data);
            break;
        case 'table':
        default:
            if (options?.tableFormatter) {
                options.tableFormatter(data);
            }
            else if (Array.isArray(data)) {
                outputTable(data, options?.columns);
            }
            else {
                outputKeyValue(data);
            }
    }
}
/**
 * Output data as JSON
 */
function outputJson(data) {
    console.log(JSON.stringify(data, null, 2));
}
/**
 * Output data as YAML-like format
 */
function outputYaml(data) {
    const yaml = toYaml(data, 0);
    console.log(yaml);
}
function toYaml(data, indent) {
    const prefix = '  '.repeat(indent);
    if (data === null || data === undefined) {
        return 'null';
    }
    if (typeof data === 'string') {
        if (data.includes('\n')) {
            return `|\n${data
                .split('\n')
                .map((line) => `${prefix}  ${line}`)
                .join('\n')}`;
        }
        return data;
    }
    if (typeof data === 'number' || typeof data === 'boolean') {
        return String(data);
    }
    if (Array.isArray(data)) {
        if (data.length === 0)
            return '[]';
        return data.map((item) => `${prefix}- ${toYaml(item, indent + 1)}`).join('\n');
    }
    if (typeof data === 'object') {
        const obj = data;
        const keys = Object.keys(obj);
        if (keys.length === 0)
            return '{}';
        return keys
            .map((key) => {
            const value = obj[key];
            if (typeof value === 'object' && value !== null) {
                return `${prefix}${key}:\n${toYaml(value, indent + 1)}`;
            }
            return `${prefix}${key}: ${toYaml(value, indent)}`;
        })
            .join('\n');
    }
    return String(data);
}
/**
 * Output array data as table
 */
function outputTable(data, columns) {
    if (data.length === 0) {
        console.log(chalk_1.default.gray('No data to display'));
        return;
    }
    const cols = columns ?? Object.keys(data[0]);
    const headers = cols.map((c) => chalk_1.default.bold(formatHeader(c)));
    const rows = data.map((item) => cols.map((c) => formatCell(item[c])));
    const tableData = [headers, ...rows];
    console.log((0, table_1.table)(tableData, {
        border: (0, table_1.getBorderCharacters)('norc'),
        columnDefault: {
            paddingLeft: 1,
            paddingRight: 1,
        },
    }));
}
/**
 * Output key-value pairs
 */
function outputKeyValue(data, indent = 0) {
    const prefix = '  '.repeat(indent);
    for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            console.log(`${prefix}${chalk_1.default.bold(formatHeader(key))}:`);
            outputKeyValue(value, indent + 1);
        }
        else {
            console.log(`${prefix}${chalk_1.default.bold(formatHeader(key))}: ${formatCell(value)}`);
        }
    }
}
/**
 * Format header text (camelCase to Title Case)
 */
function formatHeader(key) {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
}
/**
 * Format cell value for display
 */
function formatCell(value) {
    if (value === null || value === undefined) {
        return chalk_1.default.gray('-');
    }
    if (typeof value === 'boolean') {
        return value ? chalk_1.default.green('✓') : chalk_1.default.red('✗');
    }
    if (typeof value === 'number') {
        return chalk_1.default.cyan(String(value));
    }
    if (Array.isArray(value)) {
        return value.join(', ');
    }
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    return String(value);
}
/**
 * Format health status with color
 */
function formatHealthStatus(status) {
    switch (status) {
        case 'healthy':
            return chalk_1.default.green('● healthy');
        case 'degraded':
            return chalk_1.default.yellow('◐ degraded');
        case 'unhealthy':
            return chalk_1.default.red('○ unhealthy');
        default:
            return chalk_1.default.gray('? unknown');
    }
}
/**
 * Format percentage
 */
function formatPercentage(value) {
    const formatted = (value * 100).toFixed(2) + '%';
    if (value >= 0.99)
        return chalk_1.default.green(formatted);
    if (value >= 0.95)
        return chalk_1.default.yellow(formatted);
    return chalk_1.default.red(formatted);
}
/**
 * Format duration in milliseconds
 */
function formatDuration(ms) {
    if (ms < 1000)
        return `${ms}ms`;
    if (ms < 60000)
        return `${(ms / 1000).toFixed(2)}s`;
    if (ms < 3600000)
        return `${(ms / 60000).toFixed(2)}m`;
    return `${(ms / 3600000).toFixed(2)}h`;
}
/**
 * Format byte size
 */
function formatBytes(bytes) {
    if (bytes === 0)
        return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
/**
 * Format timestamp
 */
function formatTimestamp(ts) {
    const date = typeof ts === 'string' ? new Date(ts) : ts;
    return date.toLocaleString();
}
/**
 * Print section header
 */
function printHeader(title) {
    if (globalFormat === 'json')
        return;
    console.log();
    console.log(chalk_1.default.bold.blue(`═══ ${title} ═══`));
    console.log();
}
/**
 * Print success message
 */
function printSuccess(message) {
    if (globalFormat === 'json')
        return;
    console.log(chalk_1.default.green('✓'), message);
}
/**
 * Print warning message
 */
function printWarning(message) {
    if (globalFormat === 'json')
        return;
    console.log(chalk_1.default.yellow('⚠'), message);
}
/**
 * Print error message
 */
function printError(message) {
    if (globalFormat === 'json') {
        console.error(JSON.stringify({ error: message }));
        return;
    }
    console.error(chalk_1.default.red('✗'), message);
}
/**
 * Print info message
 */
function printInfo(message) {
    if (globalFormat === 'json')
        return;
    console.log(chalk_1.default.blue('ℹ'), message);
}
/**
 * Print dry-run banner
 */
function printDryRunBanner() {
    if (globalFormat === 'json')
        return;
    console.log();
    console.log(chalk_1.default.bgYellow.black(' DRY RUN '), chalk_1.default.yellow('No changes will be made'));
    console.log();
}
