#!/usr/bin/env node
"use strict";
/**
 * IntelGraph CLI
 * Cross-platform command-line interface for graph queries, agent spins, and air-gapped exports
 */
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const config_js_1 = require("./lib/config.js");
const graph_js_1 = require("./commands/graph.js");
const agent_js_1 = require("./commands/agent.js");
const export_js_1 = require("./commands/export.js");
const sync_js_1 = require("./commands/sync.js");
const config_js_2 = require("./commands/config.js");
const audit_js_1 = require("./commands/audit.js");
const run_js_1 = require("./commands/run.js");
const determinism_js_1 = require("./commands/determinism.js");
const switchboard_js_1 = require("./commands/switchboard.js");
const constants_js_1 = require("./lib/constants.js");
const errors_js_1 = require("./utils/errors.js");
async function main() {
    (0, errors_js_1.setupErrorHandling)();
    const program = new commander_1.Command();
    program
        .name('intelgraph')
        .description('IntelGraph CLI - Graph queries, agent spins, and air-gapped exports')
        .version(constants_js_1.VERSION, '-v, --version', 'Display version number')
        .option('-c, --config <path>', 'Path to config file')
        .option('--profile <name>', 'Use named profile from config', 'default')
        .option('--json', 'Output results as JSON')
        .option('--quiet', 'Suppress non-essential output')
        .option('--verbose', 'Enable verbose output');
    // Load configuration
    const config = await (0, config_js_1.loadConfig)(program.opts().config);
    // Register command groups
    (0, graph_js_1.registerGraphCommands)(program, config);
    (0, agent_js_1.registerAgentCommands)(program, config);
    (0, export_js_1.registerExportCommands)(program, config);
    (0, sync_js_1.registerSyncCommands)(program, config);
    (0, config_js_2.registerConfigCommands)(program, config);
    (0, audit_js_1.registerAuditCommands)(program);
    (0, run_js_1.registerRunCommands)(program);
    (0, determinism_js_1.registerDeterminismCommands)(program);
    (0, switchboard_js_1.registerSwitchboardCommands)(program);
    // Parse and execute
    await program.parseAsync(process.argv);
    // Show help if no command provided
    if (process.argv.length <= 2) {
        program.help();
    }
}
main().catch((error) => {
    console.error('Fatal error:', error.message);
    process.exit(1);
});
