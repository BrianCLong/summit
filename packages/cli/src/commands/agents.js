"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentsCommands = void 0;
const path_1 = __importDefault(require("path"));
const commander_1 = require("commander");
const agent_registry_1 = require("@summit/agent-registry");
const utils_js_1 = require("../utils.js");
function defaultRegistryPath() {
    return path_1.default.resolve(process.cwd(), 'docs/agents/registry');
}
function formatErrors(errors) {
    return errors
        .map((error) => {
        const pathSuffix = error.path ? ` (${error.path})` : '';
        return `- ${error.file}${pathSuffix}: ${error.message}`;
    })
        .join('\n');
}
exports.agentsCommands = new commander_1.Command('agents')
    .description('Agent registry commands')
    .addCommand(new commander_1.Command('list')
    .description('List registered agents')
    .option('-p, --path <path>', 'Registry directory or glob', defaultRegistryPath())
    .option('--json', 'Output JSON instead of a table', false)
    .action(async (options) => {
    const { agents, errors } = await (0, agent_registry_1.loadAgentRegistry)(options.path);
    if (errors.length > 0) {
        (0, utils_js_1.exitWithError)(`Agent registry validation failed:\n${formatErrors(errors)}`);
    }
    if (agents.length === 0) {
        (0, utils_js_1.warn)('No agents found in the registry.');
        return;
    }
    if (options.json) {
        console.log((0, agent_registry_1.stableStringify)(agents));
        return;
    }
    console.log((0, utils_js_1.formatOutput)(agents, ['id', 'name', 'version', 'role', 'data_access']));
}))
    .addCommand(new commander_1.Command('validate')
    .description('Validate agent registry files')
    .option('-p, --path <path>', 'Registry directory or glob', defaultRegistryPath())
    .action(async (options) => {
    const { errors } = await (0, agent_registry_1.loadAgentRegistry)(options.path);
    if (errors.length > 0) {
        (0, utils_js_1.exitWithError)(`Agent registry validation failed:\n${formatErrors(errors)}`);
    }
    (0, utils_js_1.success)('Agent registry validation succeeded.');
}));
