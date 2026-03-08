"use strict";
/**
 * Summit CLI Utilities
 *
 * Shared utility functions for the CLI.
 *
 * @module @summit/cli/utils
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
exports.formatOutput = formatOutput;
exports.formatDate = formatDate;
exports.truncate = truncate;
exports.parseKeyValue = parseKeyValue;
exports.createSpinner = createSpinner;
exports.confirm = confirm;
exports.exitWithError = exitWithError;
exports.success = success;
exports.warn = warn;
exports.info = info;
/* eslint-disable no-console */
const chalk_1 = __importDefault(require("chalk"));
/**
 * Format data as a table
 */
function formatOutput(data, columns) {
    if (data.length === 0) {
        return '';
    }
    // Calculate column widths
    const widths = {};
    columns.forEach((col) => {
        widths[col] = Math.max(col.length, ...data.map((row) => String(row[col] || '').length));
    });
    // Header
    const headerRow = columns
        .map((col) => col.toUpperCase().padEnd(widths[col]))
        .join('  ');
    const separator = columns
        .map((col) => '─'.repeat(widths[col]))
        .join('──');
    // Data rows
    const dataRows = data.map((row) => columns
        .map((col) => {
        const value = String(row[col] || '');
        return value.padEnd(widths[col]);
    })
        .join('  '));
    return [chalk_1.default.bold(headerRow), separator, ...dataRows].join('\n');
}
/**
 * Format a date string
 */
function formatDate(dateStr) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        return dateStr;
    }
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
/**
 * Truncate string to max length
 */
function truncate(str, maxLength) {
    if (str.length <= maxLength) {
        return str;
    }
    return `${str.substring(0, maxLength - 3)}...`;
}
/**
 * Parse key=value pairs from string array
 */
function parseKeyValue(pairs) {
    const result = {};
    pairs.forEach((pair) => {
        const [key, ...valueParts] = pair.split('=');
        if (key && valueParts.length > 0) {
            result[key] = valueParts.join('=');
        }
    });
    return result;
}
/**
 * Create progress indicator
 */
function createSpinner(message) {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let frameIndex = 0;
    let interval = null;
    let currentMessage = message;
    return {
        start() {
            process.stdout.write('\x1B[?25l'); // Hide cursor
            interval = setInterval(() => {
                process.stdout.write(`\r${chalk_1.default.blue(frames[frameIndex])} ${currentMessage}`);
                frameIndex = (frameIndex + 1) % frames.length;
            }, 80);
        },
        stop(success = true) {
            if (interval) {
                clearInterval(interval);
                interval = null;
            }
            const icon = success ? chalk_1.default.green('✓') : chalk_1.default.red('✗');
            process.stdout.write(`\r${icon} ${currentMessage}\n`);
            process.stdout.write('\x1B[?25h'); // Show cursor
        },
        update(msg) {
            currentMessage = msg;
        },
    };
}
/**
 * Confirm action with user
 */
async function confirm(message, defaultValue = false) {
    const readline = await Promise.resolve().then(() => __importStar(require('readline')));
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const defaultHint = defaultValue ? '(Y/n)' : '(y/N)';
    return new Promise((resolve) => {
        rl.question(`${message} ${defaultHint} `, (answer) => {
            rl.close();
            const normalized = answer.toLowerCase().trim();
            if (normalized === '') {
                resolve(defaultValue);
            }
            else {
                resolve(normalized === 'y' || normalized === 'yes');
            }
        });
    });
}
/**
 * Print error and exit
 */
function exitWithError(message, code = 1) {
    console.error(chalk_1.default.red(`Error: ${message}`));
    process.exit(code);
}
/**
 * Print success message
 */
function success(message) {
    console.log(chalk_1.default.green(`✓ ${message}`));
}
/**
 * Print warning message
 */
function warn(message) {
    console.log(chalk_1.default.yellow(`⚠ ${message}`));
}
/**
 * Print info message
 */
function info(message) {
    console.log(chalk_1.default.blue(`ℹ ${message}`));
}
