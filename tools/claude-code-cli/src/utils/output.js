"use strict";
/**
 * Output Formatting
 *
 * Handles pretty and JSON output modes with schema-stable structure.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureOutput = configureOutput;
exports.isJsonOutput = isJsonOutput;
exports.isQuiet = isQuiet;
exports.isVerbose = isVerbose;
exports.buildJsonOutput = buildJsonOutput;
exports.outputResult = outputResult;
exports.log = log;
exports.logError = logError;
const chalk_1 = __importDefault(require("chalk"));
const env_js_1 = require("./env.js");
/**
 * Global output configuration
 */
let outputConfig = {
    format: 'pretty',
    noColor: false,
    verbose: false,
    includeTimestamps: false,
    quiet: false,
};
/**
 * Configure output settings
 */
function configureOutput(options) {
    if (options.output)
        outputConfig.format = options.output;
    if (options.noColor !== undefined) {
        outputConfig.noColor = options.noColor;
        if (options.noColor) {
            chalk_1.default.level = 0;
        }
    }
    if (options.verbose !== undefined)
        outputConfig.verbose = options.verbose;
    if (options.includeTimestamps !== undefined)
        outputConfig.includeTimestamps = options.includeTimestamps;
    if (options.quiet !== undefined)
        outputConfig.quiet = options.quiet;
}
/**
 * Check if JSON output mode is enabled
 */
function isJsonOutput() {
    return outputConfig.format === 'json';
}
/**
 * Check if quiet mode is enabled
 */
function isQuiet() {
    return outputConfig.quiet;
}
/**
 * Check if verbose mode is enabled
 */
function isVerbose() {
    return outputConfig.verbose;
}
/**
 * Build schema-stable JSON output
 */
function buildJsonOutput(command, args, normalizedEnv, status, result, diagnostics, startTime) {
    const output = {
        version: '1.0.0',
        command,
        args,
        normalized_env: normalizedEnv,
        status,
        result,
        diagnostics,
    };
    if (outputConfig.includeTimestamps) {
        output.timestamp = new Date().toISOString();
        if (startTime) {
            output.duration_ms = Date.now() - startTime;
        }
    }
    return output;
}
/**
 * Output the final result
 */
function outputResult(output) {
    if (outputConfig.format === 'json') {
        // JSON mode: single JSON object, no ANSI, deterministic ordering
        console.log((0, env_js_1.deterministicStringify)(output, 2));
    }
    else {
        // Pretty mode: human-readable output
        outputPretty(output);
    }
}
/**
 * Pretty-print output for humans
 */
function outputPretty(output) {
    if (isQuiet() && output.status === 'success') {
        return;
    }
    // Status indicator
    const statusIcon = output.status === 'success'
        ? chalk_1.default.green('✓')
        : output.status === 'error'
            ? chalk_1.default.red('✗')
            : chalk_1.default.yellow('○');
    console.log(`${statusIcon} ${chalk_1.default.bold(output.command)} ${output.args.join(' ')}`);
    // Environment info (verbose only)
    if (isVerbose()) {
        console.log(chalk_1.default.gray(`  TZ: ${output.normalized_env.tz}`));
        console.log(chalk_1.default.gray(`  Locale: ${output.normalized_env.locale}`));
        console.log(chalk_1.default.gray(`  Node: ${output.normalized_env.nodeVersion}`));
    }
    // Result
    if (output.result !== undefined && output.result !== null) {
        if (typeof output.result === 'string') {
            console.log(output.result);
        }
        else {
            console.log(JSON.stringify(output.result, null, 2));
        }
    }
    // Diagnostics
    for (const diag of output.diagnostics) {
        const prefix = diag.level === 'error'
            ? chalk_1.default.red('ERROR')
            : diag.level === 'warning'
                ? chalk_1.default.yellow('WARN')
                : chalk_1.default.blue('INFO');
        const location = diag.file ? ` ${diag.file}${diag.line ? `:${diag.line}` : ''}` : '';
        console.log(`${prefix}${location}: ${diag.message}`);
    }
    // Timing (if enabled)
    if (output.duration_ms !== undefined) {
        console.log(chalk_1.default.gray(`  Duration: ${output.duration_ms}ms`));
    }
}
/**
 * Log message (respects quiet mode and format)
 */
function log(message, level = 'info') {
    if (isJsonOutput())
        return; // JSON mode suppresses logs
    if (isQuiet())
        return;
    if (level === 'verbose' && !isVerbose())
        return;
    console.log(message);
}
/**
 * Log error (always shown except in JSON mode)
 */
function logError(message) {
    if (isJsonOutput())
        return;
    console.error(chalk_1.default.red(message));
}
