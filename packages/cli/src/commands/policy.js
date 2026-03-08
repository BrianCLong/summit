"use strict";
/**
 * Summit CLI Policy Commands
 *
 * Policy management commands.
 *
 * SOC 2 Controls: CC6.1 (Access Control)
 *
 * @module @summit/cli/commands/policy
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
exports.policyCommands = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const client_js_1 = require("../client.js");
const utils_js_1 = require("../utils.js");
/**
 * List policies
 */
const list = new commander_1.Command('list')
    .description('List all policies')
    .option('-s, --status <status>', 'Filter by status (active, draft, archived)')
    .option('-f, --format <format>', 'Output format (table, json)', 'table')
    .action(async (options) => {
    const params = {};
    if (options.status)
        params.status = options.status;
    const response = await (0, client_js_1.get)('/policies', params);
    if (options.format === 'json') {
        console.log(JSON.stringify(response.data, null, 2));
        return;
    }
    if (response.data.length === 0) {
        console.log(chalk_1.default.yellow('No policies found.'));
        return;
    }
    console.log(chalk_1.default.bold('\nPolicies\n'));
    console.log((0, utils_js_1.formatOutput)(response.data, ['id', 'name', 'status', 'version', 'updatedAt']));
});
/**
 * Get policy details
 */
const getPolicy = new commander_1.Command('get')
    .description('Get policy details')
    .argument('<id>', 'Policy ID')
    .option('-f, --format <format>', 'Output format (table, json)', 'table')
    .action(async (id, options) => {
    const response = await (0, client_js_1.get)(`/policies/${id}`);
    if (options.format === 'json') {
        console.log(JSON.stringify(response.data, null, 2));
        return;
    }
    const policy = response.data;
    console.log(chalk_1.default.bold(`\nPolicy: ${policy.name}\n`));
    console.log(`ID:          ${policy.id}`);
    console.log(`Description: ${policy.description}`);
    console.log(`Status:      ${policy.status}`);
    console.log(`Version:     ${policy.version}`);
    console.log(`Created:     ${policy.createdAt}`);
    console.log(`Updated:     ${policy.updatedAt}`);
    console.log(chalk_1.default.bold('\nRules:\n'));
    policy.rules.forEach((rule, i) => {
        console.log(`  ${i + 1}. [${rule.action.toUpperCase()}] ${rule.condition}`);
        console.log(`     Priority: ${rule.priority}`);
    });
});
/**
 * Create policy
 */
const create = new commander_1.Command('create')
    .description('Create a new policy')
    .requiredOption('-n, --name <name>', 'Policy name')
    .option('-d, --description <desc>', 'Policy description')
    .option('-r, --rules <json>', 'Rules as JSON array')
    .option('--file <path>', 'Load policy from JSON file')
    .action(async (options) => {
    let policyData;
    if (options.file) {
        const { readFileSync } = await Promise.resolve().then(() => __importStar(require('fs')));
        policyData = JSON.parse(readFileSync(options.file, 'utf-8'));
    }
    else {
        policyData = {
            name: options.name,
            description: options.description || '',
            rules: options.rules ? JSON.parse(options.rules) : [],
        };
    }
    const response = await (0, client_js_1.post)('/policies', policyData);
    console.log(chalk_1.default.green(`\nPolicy created: ${response.data.id}`));
});
/**
 * Update policy
 */
const update = new commander_1.Command('update')
    .description('Update a policy')
    .argument('<id>', 'Policy ID')
    .option('-n, --name <name>', 'Policy name')
    .option('-d, --description <desc>', 'Policy description')
    .option('-r, --rules <json>', 'Rules as JSON array')
    .action(async (id, options) => {
    const updates = {};
    if (options.name)
        updates.name = options.name;
    if (options.description)
        updates.description = options.description;
    if (options.rules)
        updates.rules = JSON.parse(options.rules);
    const response = await (0, client_js_1.put)(`/policies/${id}`, updates);
    console.log(chalk_1.default.green(`\nPolicy updated: ${response.data.id} (version ${response.data.version})`));
});
/**
 * Delete policy
 */
const deletePolicy = new commander_1.Command('delete')
    .description('Delete a policy')
    .argument('<id>', 'Policy ID')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (id, options) => {
    if (!options.yes) {
        const readline = await Promise.resolve().then(() => __importStar(require('readline')));
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        const answer = await new Promise((resolve) => {
            rl.question(chalk_1.default.yellow(`Delete policy ${id}? (y/N) `), resolve);
        });
        rl.close();
        if (answer.toLowerCase() !== 'y') {
            console.log('Cancelled.');
            return;
        }
    }
    await (0, client_js_1.del)(`/policies/${id}`);
    console.log(chalk_1.default.green(`\nPolicy deleted: ${id}`));
});
/**
 * Simulate policy
 */
const simulate = new commander_1.Command('simulate')
    .description('Simulate policy evaluation')
    .option('-p, --policy <id>', 'Policy ID to simulate')
    .option('-c, --context <json>', 'Evaluation context as JSON')
    .option('-r, --resource <json>', 'Resource to evaluate as JSON')
    .option('--rules <json>', 'Ad-hoc rules to test')
    .action(async (options) => {
    const request = {};
    if (options.policy) {
        request.policyId = options.policy;
    }
    if (options.rules) {
        request.rules = JSON.parse(options.rules);
    }
    if (options.context) {
        request.context = JSON.parse(options.context);
    }
    if (options.resource) {
        request.resource = JSON.parse(options.resource);
    }
    const response = await (0, client_js_1.post)('/policies/simulate', request);
    const result = response.data;
    console.log(chalk_1.default.bold('\nSimulation Result\n'));
    const verdictColor = result.verdict === 'ALLOW' ? chalk_1.default.green :
        result.verdict === 'DENY' ? chalk_1.default.red : chalk_1.default.yellow;
    console.log(`Verdict:        ${verdictColor(result.verdict)}`);
    console.log(`Execution Time: ${result.executionTime}ms`);
    if (result.matchedRules.length > 0) {
        console.log(chalk_1.default.bold('\nMatched Rules:'));
        result.matchedRules.forEach((rule) => console.log(`  - ${rule}`));
    }
    if (result.evaluationPath.length > 0) {
        console.log(chalk_1.default.bold('\nEvaluation Path:'));
        result.evaluationPath.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));
    }
});
/**
 * Activate policy
 */
const activate = new commander_1.Command('activate')
    .description('Activate a policy')
    .argument('<id>', 'Policy ID')
    .action(async (id) => {
    const response = await (0, client_js_1.post)(`/policies/${id}/activate`, {});
    console.log(chalk_1.default.green(`\nPolicy activated: ${response.data.id}`));
});
/**
 * Archive policy
 */
const archive = new commander_1.Command('archive')
    .description('Archive a policy')
    .argument('<id>', 'Policy ID')
    .action(async (id) => {
    const response = await (0, client_js_1.post)(`/policies/${id}/archive`, {});
    console.log(chalk_1.default.green(`\nPolicy archived: ${response.data.id}`));
});
exports.policyCommands = {
    list,
    get: getPolicy,
    create,
    update,
    delete: deletePolicy,
    simulate,
    activate,
    archive,
};
