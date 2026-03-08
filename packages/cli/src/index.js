#!/usr/bin/env node
"use strict";
/**
 * Summit CLI
 *
 * Command-line interface for the Summit platform.
 *
 * SOC 2 Controls: CC6.1 (Access Control), CC7.1 (System Operations)
 *
 * @module @summit/cli
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
/* eslint-disable no-console */
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const policy_js_1 = require("./commands/policy.js");
const tenant_js_1 = require("./commands/tenant.js");
const audit_js_1 = require("./commands/audit.js");
const compliance_js_1 = require("./commands/compliance.js");
const config_js_1 = require("./commands/config.js");
const plugin_js_1 = require("./commands/plugin.js");
const agents_js_1 = require("./commands/agents.js");
const doctor_js_1 = require("./commands/doctor.js");
const orch_js_1 = require("./commands/orch.js");
const replay_js_1 = require("./commands/replay.js");
const config_js_2 = require("./config.js");
const dev_up_js_1 = require("./commands/dev-up.js");
const dev_check_js_1 = require("./commands/dev-check.js");
const agent_js_1 = require("./commands/agent.js");
const graph_search_js_1 = require("./commands/graph-search.js");
const graph_explain_js_1 = require("./commands/graph-explain.js");
const program = new commander_1.Command();
program
    .name('summit')
    .description('Summit Platform CLI - Governance, compliance, and policy management')
    .version('1.0.0')
    .hook('preAction', async () => {
    try {
        await (0, config_js_2.loadConfig)();
    }
    catch (_error) {
        // Config loading is optional for some commands
    }
});
// Configuration commands
program
    .command('config')
    .description('Manage CLI configuration')
    .addCommand(config_js_1.configCommands.set)
    .addCommand(config_js_1.configCommands.get)
    .addCommand(config_js_1.configCommands.list)
    .addCommand(config_js_1.configCommands.init);
program.addCommand(doctor_js_1.doctor);
// Policy commands
program
    .command('policy')
    .description('Policy management commands')
    .addCommand(policy_js_1.policyCommands.list)
    .addCommand(policy_js_1.policyCommands.get)
    .addCommand(policy_js_1.policyCommands.create)
    .addCommand(policy_js_1.policyCommands.update)
    .addCommand(policy_js_1.policyCommands.delete)
    .addCommand(policy_js_1.policyCommands.simulate)
    .addCommand(policy_js_1.policyCommands.activate)
    .addCommand(policy_js_1.policyCommands.archive);
// Tenant commands
program
    .command('tenant')
    .description('Tenant management commands')
    .addCommand(tenant_js_1.tenantCommands.info)
    .addCommand(tenant_js_1.tenantCommands.users)
    .addCommand(tenant_js_1.tenantCommands.settings);
// Audit commands
program
    .command('audit')
    .description('Audit log commands')
    .addCommand(audit_js_1.auditCommands.logs)
    .addCommand(audit_js_1.auditCommands.export);
// Compliance commands
program
    .command('compliance')
    .description('Compliance management commands')
    .addCommand(compliance_js_1.complianceCommands.summary)
    .addCommand(compliance_js_1.complianceCommands.controls)
    .addCommand(compliance_js_1.complianceCommands.assess)
    .addCommand(compliance_js_1.complianceCommands.evidence)
    .addCommand(compliance_js_1.complianceCommands.report);
// Plugin commands
program
    .command('plugin')
    .description('Plugin development commands')
    .addCommand(plugin_js_1.pluginCommands.create)
    .addCommand(plugin_js_1.pluginCommands.validate)
    .addCommand(plugin_js_1.pluginCommands.test)
    .addCommand(plugin_js_1.pluginCommands.build)
    .addCommand(plugin_js_1.pluginCommands.publish)
    .addCommand(plugin_js_1.pluginCommands.list);
// Agent registry commands
program.addCommand(agents_js_1.agentsCommands);
// Orchestration commands
program.addCommand(orch_js_1.orchCommands.root);
// Replay command
program.addCommand(replay_js_1.replayCommand);
// Login command
program
    .command('login')
    .description('Authenticate with Summit platform')
    .option('-e, --email <email>', 'User email')
    .option('-k, --api-key <key>', 'API key for authentication')
    .option('--url <url>', 'Summit API URL')
    .action(async (options) => {
    const { login } = await Promise.resolve().then(() => __importStar(require('./commands/auth.js')));
    await login(options);
});
// Logout command
program
    .command('logout')
    .description('Log out from Summit platform')
    .action(async () => {
    const { logout } = await Promise.resolve().then(() => __importStar(require('./commands/auth.js')));
    await logout();
});
// Status command
program
    .command('status')
    .description('Show current connection status')
    .action(() => {
    const config = (0, config_js_2.getConfig)();
    if (!config.baseUrl) {
        console.log(chalk_1.default.yellow('Not configured. Run `summit config init` to set up.'));
        return;
    }
    console.log(chalk_1.default.bold('\nSummit CLI Status\n'));
    console.log(`API URL:    ${config.baseUrl}`);
    console.log(`Tenant ID:  ${config.tenantId || 'Not set'}`);
    console.log(`Auth:       ${config.token ? chalk_1.default.green('Authenticated') : chalk_1.default.yellow('Not authenticated')}`);
});
// Dev commands
program
    .command('dev')
    .description('Developer commands')
    .addCommand(dev_up_js_1.devUpCommand)
    .addCommand(dev_check_js_1.devCheckCommand);
// Agent commands
program.addCommand(agent_js_1.agentCommand);
// Graph commands
program
    .command('graph')
    .description('Graph commands')
    .addCommand(graph_search_js_1.graphSearchCommand)
    .addCommand(graph_explain_js_1.graphExplainCommand);
// Parse and execute
program.parse();
