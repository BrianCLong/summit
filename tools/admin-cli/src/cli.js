#!/usr/bin/env node
"use strict";
/**
 * Summit Admin CLI
 * Unified Admin & SRE CLI for IntelGraph platform operations
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
const index_js_2 = require("./utils/index.js");
const audit_js_1 = require("./utils/audit.js");
const api_client_js_1 = require("./utils/api-client.js");
const config_js_1 = require("./utils/config.js");
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
 * ASCII banner
 */
const BANNER = `
  ╔═══════════════════════════════════════════════════╗
  ║                                                   ║
  ║   █████╗ ██████╗ ███╗   ███╗██╗███╗   ██╗        ║
  ║  ██╔══██╗██╔══██╗████╗ ████║██║████╗  ██║        ║
  ║  ███████║██║  ██║██╔████╔██║██║██╔██╗ ██║        ║
  ║  ██╔══██║██║  ██║██║╚██╔╝██║██║██║╚██╗██║        ║
  ║  ██║  ██║██████╔╝██║ ╚═╝ ██║██║██║ ╚████║        ║
  ║  ╚═╝  ╚═╝╚═════╝ ╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝        ║
  ║                                                   ║
  ║           IntelGraph Admin CLI                    ║
  ║                                                   ║
  ╚═══════════════════════════════════════════════════╝
`;
/**
 * Create main CLI program
 */
function createProgram() {
    const program = new commander_1.Command();
    program
        .name('summit-admin')
        .description('Unified Admin & SRE CLI for IntelGraph platform operations')
        .version(getVersion(), '-V, --version', 'Output the version number')
        // Global options
        .option('-e, --endpoint <url>', 'API endpoint URL')
        .option('-t, --token <token>', 'Authentication token')
        .option('-p, --profile <name>', 'Configuration profile to use')
        .option('-f, --format <format>', 'Output format (json, table, yaml)', 'table')
        .option('-v, --verbose', 'Enable verbose output')
        .option('--no-color', 'Disable colored output')
        .option('--dry-run', 'Show what would be done without making changes')
        // Pre-action hook for global configuration
        .hook('preAction', (thisCommand, actionCommand) => {
        const opts = thisCommand.opts();
        // Configure output format
        if (opts.format) {
            (0, index_js_2.setOutputFormat)(opts.format);
            if (opts.format === 'json') {
                (0, index_js_2.setJsonOutput)(true);
            }
        }
        // Configure verbosity
        if (opts.verbose) {
            (0, index_js_2.setVerbose)(true);
            (0, index_js_2.configureLogger)({ level: 'verbose' });
        }
        // Disable colors if requested
        if (opts.noColor) {
            chalk_1.default.level = 0;
        }
        // Set profile defaults
        const profile = (0, config_js_1.getProfile)(opts.profile);
        if (profile) {
            if (!opts.endpoint) {
                opts.endpoint = profile.endpoint;
            }
            if (!opts.token) {
                opts.token = profile.token;
            }
            if (!opts.format && profile.defaultFormat) {
                (0, index_js_2.setOutputFormat)(profile.defaultFormat);
            }
        }
        // Store resolved options
        thisCommand._resolvedOptions = opts;
    })
        // Post-action hook for audit logging
        .hook('postAction', async (thisCommand, actionCommand) => {
        const opts = thisCommand.opts();
        // Skip audit for config commands
        if (actionCommand.name() === 'config') {
            return;
        }
        try {
            const apiClient = (0, api_client_js_1.createApiClient)({
                endpoint: (0, config_js_1.getEndpoint)(opts.profile, opts.endpoint),
                token: (0, config_js_1.getToken)(opts.profile, opts.token),
            });
            const auditor = (0, audit_js_1.createAuditor)({
                enabled: true,
                apiClient,
            });
            const context = (0, audit_js_1.createAuditContext)(actionCommand.name(), actionCommand.args, actionCommand.opts());
            await auditor.record({
                action: `cli.${actionCommand.parent?.name() ?? 'root'}.${actionCommand.name()}`,
                ...context,
                userId: 'cli-user', // Would be extracted from token in real impl
                result: 'success',
            });
        }
        catch {
            // Silent failure for audit logging
        }
    });
    // Register command groups
    (0, index_js_1.registerEnvCommands)(program);
    (0, index_js_1.registerTenantCommands)(program);
    (0, index_js_1.registerDataCommands)(program);
    (0, index_js_1.registerSecurityCommands)(program);
    (0, index_js_1.registerGraphCommands)(program);
    (0, index_js_1.registerConfigCommands)(program);
    // Help command enhancement
    program.addHelpText('before', chalk_1.default.blue(BANNER));
    program.addHelpText('after', `
${chalk_1.default.bold('Examples:')}
  ${chalk_1.default.gray('# Check environment status')}
  $ summit-admin env status

  ${chalk_1.default.gray('# List tenants')}
  $ summit-admin tenant list

  ${chalk_1.default.gray('# Create tenant (interactive)')}
  $ summit-admin tenant create --interactive

  ${chalk_1.default.gray('# Check graph health')}
  $ summit-admin graph health

  ${chalk_1.default.gray('# Run security policy checks')}
  $ summit-admin security check-policies --all

  ${chalk_1.default.gray('# Use production profile')}
  $ summit-admin --profile production env status

  ${chalk_1.default.gray('# Output as JSON')}
  $ summit-admin --format json env status

  ${chalk_1.default.gray('# Dry-run mode')}
  $ summit-admin --dry-run tenant suspend acme-corp

${chalk_1.default.bold('Environment Variables:')}
  INTELGRAPH_TOKEN    Authentication token
  SUMMIT_ADMIN_TOKEN  Alternative token variable

${chalk_1.default.bold('More Information:')}
  Documentation: https://docs.intelgraph.com/admin-cli
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
    process.on('unhandledRejection', (reason, promise) => {
        console.error(chalk_1.default.red('Unhandled Rejection:'), reason);
        process.exit(1);
    });
    process.on('uncaughtException', (error) => {
        console.error(chalk_1.default.red('Uncaught Exception:'), error.message);
        if (process.env.VERBOSE === 'true') {
            console.error(error.stack);
        }
        process.exit(1);
    });
    // Handle SIGINT gracefully
    process.on('SIGINT', () => {
        console.log();
        console.log(chalk_1.default.yellow('Operation cancelled.'));
        process.exit(0);
    });
    try {
        await program.parseAsync(process.argv);
    }
    catch (error) {
        if (error instanceof Error) {
            console.error(chalk_1.default.red('Error:'), error.message);
            if (process.env.VERBOSE === 'true') {
                console.error(error.stack);
            }
        }
        process.exit(1);
    }
}
// Run CLI
main();
