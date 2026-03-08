#!/usr/bin/env node
"use strict";
/**
 * Claude Code CLI
 *
 * Deterministic, CI-friendly CLI for Claude Code agent operations.
 * Provides schema-stable JSON output suitable for automation.
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProgram = createProgram;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_url_1 = require("node:url");
const index_js_1 = require("./commands/index.js");
const env_js_1 = require("./utils/env.js");
const output_js_1 = require("./utils/output.js");
const __filename = (0, node_url_1.fileURLToPath)(import.meta.url);
const __dirname = (0, node_path_1.dirname)(__filename);
/**
 * Get CLI version from package.json
 */
function getVersion() {
    try {
        const packageJson = (0, node_fs_1.readFileSync)((0, node_path_1.resolve)(__dirname, '../package.json'), 'utf8');
        return JSON.parse(packageJson).version;
    }
    catch {
        return '1.0.0';
    }
}
/**
 * ASCII banner (shown in pretty mode only)
 */
const BANNER = `
  ╔════════════════════════════════════════════════════╗
  ║                                                    ║
  ║    ██████╗██╗      █████╗ ██╗   ██╗██████╗ ███████╗║
  ║   ██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██╔════╝║
  ║   ██║     ██║     ███████║██║   ██║██║  ██║█████╗  ║
  ║   ██║     ██║     ██╔══██║██║   ██║██║  ██║██╔══╝  ║
  ║   ╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝███████╗║
  ║    ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝║
  ║                                                    ║
  ║           Claude Code CLI                          ║
  ║           Deterministic Agent Runner               ║
  ║                                                    ║
  ╚════════════════════════════════════════════════════╝
`;
/**
 * Create main CLI program
 */
function createProgram() {
    const program = new commander_1.Command();
    program
        .name('claude-code')
        .description('Deterministic, CI-friendly CLI for Claude Code agent operations')
        .version(getVersion(), '-V, --version', 'Output the version number')
        // Output format options
        .option('-o, --output <format>', 'Output format (pretty, json)', 'pretty')
        .option('--no-color', 'Disable colored output')
        .option('-v, --verbose', 'Enable verbose output')
        .option('-q, --quiet', 'Suppress non-essential output')
        .option('--include-timestamps', 'Include timestamps in JSON output')
        // Environment normalization options
        .option('--tz <timezone>', 'Override timezone', env_js_1.ENV_DEFAULTS.TZ)
        .option('--locale <locale>', 'Override locale', env_js_1.ENV_DEFAULTS.LOCALE)
        // Pre-action hook for global configuration
        .hook('preAction', (thisCommand, _actionCommand) => {
        const opts = thisCommand.opts();
        // Normalize environment FIRST
        (0, env_js_1.normalizeEnvironment)({ tz: opts.tz, locale: opts.locale });
        // Configure output settings
        (0, output_js_1.configureOutput)({
            output: opts.output,
            noColor: opts.noColor,
            verbose: opts.verbose,
            quiet: opts.quiet,
            includeTimestamps: opts.includeTimestamps,
        });
        // Disable colors if requested or in JSON mode
        if (opts.noColor || opts.output === 'json') {
            chalk_1.default.level = 0;
        }
    });
    // Register commands
    (0, index_js_1.registerRunCommand)(program);
    // Help text (only in pretty mode)
    program.addHelpText('before', (context) => {
        // Don't show banner if JSON output requested via env or early parsing
        if (process.env.CLAUDE_OUTPUT === 'json')
            return '';
        return chalk_1.default.cyan(BANNER);
    });
    program.addHelpText('after', `
${chalk_1.default.bold('Examples:')}
  ${chalk_1.default.gray('# Analyze current directory (pretty output)')}
  $ claude-code run analyze

  ${chalk_1.default.gray('# Analyze with JSON output (for CI)')}
  $ claude-code --output json run analyze ./src

  ${chalk_1.default.gray('# Include timestamps in JSON output')}
  $ claude-code --output json --include-timestamps run analyze

  ${chalk_1.default.gray('# Override timezone/locale')}
  $ claude-code --tz America/New_York --locale en_US run analyze

  ${chalk_1.default.gray('# Verbose mode')}
  $ claude-code -v run analyze

${chalk_1.default.bold('Output Modes:')}
  ${chalk_1.default.cyan('pretty')}  Human-readable output with colors (default)
  ${chalk_1.default.cyan('json')}    Schema-stable JSON for CI/automation

${chalk_1.default.bold('Exit Codes:')}
  0  Success
  1  Unexpected error
  2  User error (bad input, validation failure)
  3  Provider/model error

${chalk_1.default.bold('Environment Variables:')}
  CLAUDE_OUTPUT    Default output format (pretty|json)
  TZ               Timezone (default: UTC)
  LC_ALL           Locale (default: C)

${chalk_1.default.bold('JSON Output Schema:')}
  See: https://docs.intelgraph.com/claude-code-cli/schema

${chalk_1.default.bold('More Information:')}
  Documentation: https://docs.intelgraph.com/claude-code-cli
  Issues:        https://github.com/BrianCLong/summit/issues
`);
    return program;
}
/**
 * Main entry point
 */
async function main() {
    const program = createProgram();
    // Global error handlers
    process.on('unhandledRejection', (reason) => {
        if ((0, output_js_1.isJsonOutput)()) {
            const diagnostics = [
                {
                    level: 'error',
                    message: reason instanceof Error ? reason.message : String(reason),
                    code: 'UNHANDLED_REJECTION',
                },
            ];
            const output = (0, output_js_1.buildJsonOutput)('unknown', [], (0, env_js_1.getNormalizedEnv)(), 'error', null, diagnostics);
            (0, output_js_1.outputResult)(output);
        }
        else {
            console.error(chalk_1.default.red('Unhandled Rejection:'), reason);
        }
        process.exit(1);
    });
    process.on('uncaughtException', (error) => {
        if ((0, output_js_1.isJsonOutput)()) {
            const diagnostics = [
                {
                    level: 'error',
                    message: error.message,
                    code: 'UNCAUGHT_EXCEPTION',
                },
            ];
            const output = (0, output_js_1.buildJsonOutput)('unknown', [], (0, env_js_1.getNormalizedEnv)(), 'error', null, diagnostics);
            (0, output_js_1.outputResult)(output);
        }
        else {
            console.error(chalk_1.default.red('Uncaught Exception:'), error.message);
            if (process.env.VERBOSE === 'true') {
                console.error(error.stack);
            }
        }
        process.exit(1);
    });
    // Handle SIGINT gracefully
    process.on('SIGINT', () => {
        if (!(0, output_js_1.isJsonOutput)()) {
            console.log();
            console.log(chalk_1.default.yellow('Operation cancelled.'));
        }
        process.exit(0);
    });
    try {
        await program.parseAsync(process.argv);
    }
    catch (error) {
        if (error instanceof Error) {
            if ((0, output_js_1.isJsonOutput)()) {
                const diagnostics = [
                    {
                        level: 'error',
                        message: error.message,
                        code: 'CLI_ERROR',
                    },
                ];
                const output = (0, output_js_1.buildJsonOutput)('unknown', [], (0, env_js_1.getNormalizedEnv)(), 'error', null, diagnostics);
                (0, output_js_1.outputResult)(output);
            }
            else {
                console.error(chalk_1.default.red('Error:'), error.message);
                if (process.env.VERBOSE === 'true') {
                    console.error(error.stack);
                }
            }
        }
        process.exit(1);
    }
}
// Run CLI
main();
