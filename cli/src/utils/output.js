"use strict";
/**
 * Output Formatting Utilities
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatOutput = formatOutput;
exports.formatTable = formatTable;
exports.formatCSV = formatCSV;
exports.formatPlain = formatPlain;
exports.success = success;
exports.error = error;
exports.warning = warning;
exports.info = info;
exports.debug = debug;
exports.progress = progress;
exports.spinner = spinner;
const chalk_1 = __importDefault(require("chalk"));
function formatOutput(data, options = {}) {
    const { format = 'plain', color = true } = options;
    switch (format) {
        case 'json':
            return JSON.stringify(data, null, 2);
        case 'csv':
            return formatCSV(data);
        case 'table':
            return formatTable(data, color);
        case 'plain':
        default:
            return formatPlain(data, color);
    }
}
function formatTable(data, color = true) {
    if (!Array.isArray(data) || data.length === 0) {
        return 'No data';
    }
    const rows = data;
    const headers = Object.keys(rows[0]);
    // Calculate column widths
    const widths = {};
    for (const header of headers) {
        widths[header] = header.length;
        for (const row of rows) {
            const value = String(row[header] ?? '');
            widths[header] = Math.max(widths[header], value.length);
        }
    }
    // Build header row
    const headerRow = headers
        .map((h) => (color ? chalk_1.default.bold(h.padEnd(widths[h])) : h.padEnd(widths[h])))
        .join(' | ');
    // Build separator
    const separator = headers.map((h) => '-'.repeat(widths[h])).join('-+-');
    // Build data rows
    const dataRows = rows.map((row) => headers.map((h) => String(row[h] ?? '').padEnd(widths[h])).join(' | '));
    return [headerRow, separator, ...dataRows].join('\n');
}
function formatCSV(data) {
    if (!Array.isArray(data) || data.length === 0) {
        return '';
    }
    const rows = data;
    const headers = Object.keys(rows[0]);
    const escapeCSV = (value) => {
        const str = String(value ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };
    const headerLine = headers.map(escapeCSV).join(',');
    const dataLines = rows.map((row) => headers.map((h) => escapeCSV(row[h])).join(','));
    return [headerLine, ...dataLines].join('\n');
}
function formatPlain(data, color = true) {
    if (data === null || data === undefined) {
        return '';
    }
    if (typeof data === 'string') {
        return data;
    }
    if (typeof data === 'number' || typeof data === 'boolean') {
        return String(data);
    }
    if (Array.isArray(data)) {
        return data.map((item) => formatPlain(item, color)).join('\n');
    }
    if (typeof data === 'object') {
        return formatObject(data, color);
    }
    return String(data);
}
function formatObject(obj, color = true, indent = 0) {
    const lines = [];
    const prefix = '  '.repeat(indent);
    for (const [key, value] of Object.entries(obj)) {
        const formattedKey = color ? chalk_1.default.cyan(key) : key;
        if (value === null || value === undefined) {
            lines.push(`${prefix}${formattedKey}: null`);
        }
        else if (typeof value === 'object' && !Array.isArray(value)) {
            lines.push(`${prefix}${formattedKey}:`);
            lines.push(formatObject(value, color, indent + 1));
        }
        else if (Array.isArray(value)) {
            lines.push(`${prefix}${formattedKey}: [${value.length} items]`);
            if (value.length <= 5) {
                for (const item of value) {
                    if (typeof item === 'object') {
                        lines.push(formatObject(item, color, indent + 1));
                    }
                    else {
                        lines.push(`${prefix}  - ${item}`);
                    }
                }
            }
        }
        else {
            const formattedValue = formatValue(value, color);
            lines.push(`${prefix}${formattedKey}: ${formattedValue}`);
        }
    }
    return lines.join('\n');
}
function formatValue(value, color = true) {
    if (typeof value === 'string') {
        return color ? chalk_1.default.green(`"${value}"`) : `"${value}"`;
    }
    if (typeof value === 'number') {
        return color ? chalk_1.default.yellow(String(value)) : String(value);
    }
    if (typeof value === 'boolean') {
        return color ? chalk_1.default.magenta(String(value)) : String(value);
    }
    return String(value);
}
function success(message) {
    console.log(chalk_1.default.green('✓'), message);
}
function error(message) {
    console.error(chalk_1.default.red('✗'), message);
}
function warning(message) {
    console.warn(chalk_1.default.yellow('⚠'), message);
}
function info(message) {
    console.log(chalk_1.default.blue('ℹ'), message);
}
function debug(message) {
    if (process.env.DEBUG) {
        console.log(chalk_1.default.gray('[debug]'), message);
    }
}
function progress(current, total, label = '') {
    const percentage = Math.round((current / total) * 100);
    const barLength = 30;
    const filled = Math.round((current / total) * barLength);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
    process.stdout.write(`\r${bar} ${percentage}% ${label}`);
    if (current === total) {
        process.stdout.write('\n');
    }
}
function spinner(message) {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;
    let currentMessage = message;
    const interval = setInterval(() => {
        process.stdout.write(`\r${chalk_1.default.cyan(frames[i])} ${currentMessage}`);
        i = (i + 1) % frames.length;
    }, 80);
    return {
        stop: (success = true) => {
            clearInterval(interval);
            const icon = success ? chalk_1.default.green('✓') : chalk_1.default.red('✗');
            process.stdout.write(`\r${icon} ${currentMessage}\n`);
        },
        update: (newMessage) => {
            currentMessage = newMessage;
        },
    };
}
