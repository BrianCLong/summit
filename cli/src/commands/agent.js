"use strict";
/**
 * Agent Commands
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
exports.registerAgentCommands = registerAgentCommands;
const ora_1 = __importDefault(require("ora"));
const config_js_1 = require("../lib/config.js");
const agent_client_js_1 = require("../lib/agent-client.js");
const output_js_1 = require("../utils/output.js");
const errors_js_1 = require("../utils/errors.js");
const constants_js_1 = require("../lib/constants.js");
function registerAgentCommands(program, config) {
    const agent = program
        .command('agent')
        .alias('a')
        .description('Agent management operations');
    agent
        .command('spin <type> <name>')
        .description('Spin up a new agent')
        .option('-p, --params <json>', 'Agent parameters as JSON', '{}')
        .option('--async', 'Run agent asynchronously')
        .option('--timeout <ms>', 'Execution timeout in milliseconds', '30000')
        .option('--profile <name>', 'Use named profile')
        .action(async (type, name, options) => {
        if (!constants_js_1.AGENT_TYPES.includes(type)) {
            (0, output_js_1.error)(`Invalid agent type. Must be one of: ${constants_js_1.AGENT_TYPES.join(', ')}`);
            process.exit(1);
        }
        const spinner = (0, ora_1.default)(`Spinning up ${type} agent: ${name}...`).start();
        try {
            const profile = (0, config_js_1.getProfile)(config, options.profile);
            const agentConfig = profile.agent || { timeout: 30000, maxConcurrent: 5 };
            const client = new agent_client_js_1.AgentClient(agentConfig);
            const params = JSON.parse(options.params);
            const status = await client.spin({
                name,
                type: type,
                parameters: params,
                timeout: parseInt(options.timeout),
            }, {
                async: options.async,
                onProgress: (s) => {
                    spinner.text = `${name}: ${s.status} (${s.progress}%)`;
                },
            });
            spinner.stop();
            if (program.opts().json) {
                console.log(JSON.stringify(status, null, 2));
            }
            else {
                if (status.status === 'completed') {
                    (0, output_js_1.success)(`Agent ${name} completed successfully`);
                    console.log(`  ID: ${status.id}`);
                    console.log(`  Duration: ${status.completedAt && status.startedAt
                        ? (status.completedAt.getTime() - status.startedAt.getTime()) / 1000
                        : 'N/A'}s`);
                    if (status.result) {
                        console.log('\nResult:');
                        console.log((0, output_js_1.formatOutput)(status.result, { format: 'plain' }));
                    }
                }
                else if (status.status === 'failed') {
                    (0, output_js_1.error)(`Agent ${name} failed: ${status.error}`);
                }
                else if (options.async) {
                    (0, output_js_1.success)(`Agent ${name} started asynchronously`);
                    console.log(`  ID: ${status.id}`);
                    console.log(`  Status: ${status.status}`);
                }
            }
        }
        catch (err) {
            spinner.stop();
            (0, errors_js_1.handleError)(err);
        }
    });
    agent
        .command('spin-batch')
        .description('Spin up multiple agents from a config file')
        .requiredOption('-f, --file <path>', 'Path to agents config file (JSON/YAML)')
        .option('--parallel', 'Run agents in parallel')
        .option('--max-concurrent <number>', 'Maximum concurrent agents', '5')
        .option('--profile <name>', 'Use named profile')
        .action(async (options) => {
        const spinner = (0, ora_1.default)('Loading agent configurations...').start();
        try {
            const fs = await Promise.resolve().then(() => __importStar(require('node:fs')));
            const yaml = await Promise.resolve().then(() => __importStar(require('yaml')));
            const content = fs.readFileSync(options.file, 'utf-8');
            const configs = options.file.endsWith('.yaml') || options.file.endsWith('.yml')
                ? yaml.parse(content)
                : JSON.parse(content);
            if (!Array.isArray(configs)) {
                throw new errors_js_1.ValidationError('Config file must contain an array of agent configurations');
            }
            spinner.text = `Spinning up ${configs.length} agents...`;
            const profile = (0, config_js_1.getProfile)(config, options.profile);
            const agentConfig = profile.agent || { timeout: 30000, maxConcurrent: 5 };
            const client = new agent_client_js_1.AgentClient(agentConfig);
            const results = await client.spinBatch(configs, {
                parallel: options.parallel,
                maxConcurrent: parseInt(options.maxConcurrent),
                onProgress: (s) => {
                    spinner.text = `${s.name}: ${s.status} (${s.progress}%)`;
                },
            });
            spinner.stop();
            const completed = results.filter((r) => r.status === 'completed').length;
            const failed = results.filter((r) => r.status === 'failed').length;
            if (program.opts().json) {
                console.log(JSON.stringify(results, null, 2));
            }
            else {
                console.log(`\nBatch Results:`);
                console.log(`  Completed: ${completed}`);
                console.log(`  Failed: ${failed}`);
                console.log(`  Total: ${results.length}`);
                if (failed > 0) {
                    console.log('\nFailed agents:');
                    for (const r of results.filter((r) => r.status === 'failed')) {
                        console.log(`  - ${r.name}: ${r.error}`);
                    }
                }
            }
        }
        catch (err) {
            spinner.stop();
            (0, errors_js_1.handleError)(err);
        }
    });
    agent
        .command('status <agentId>')
        .description('Get status of an agent')
        .option('--profile <name>', 'Use named profile')
        .action(async (agentId, options) => {
        try {
            const profile = (0, config_js_1.getProfile)(config, options.profile);
            const agentConfig = profile.agent || { timeout: 30000, maxConcurrent: 5 };
            const client = new agent_client_js_1.AgentClient(agentConfig);
            const status = await client.getStatus(agentId);
            if (!status) {
                (0, output_js_1.error)(`Agent ${agentId} not found`);
                process.exit(1);
            }
            if (program.opts().json) {
                console.log(JSON.stringify(status, null, 2));
            }
            else {
                console.log(`\nAgent: ${status.name}`);
                console.log(`  ID: ${status.id}`);
                console.log(`  Type: ${status.type}`);
                console.log(`  Status: ${status.status}`);
                console.log(`  Progress: ${status.progress}%`);
                if (status.startedAt) {
                    console.log(`  Started: ${status.startedAt.toISOString()}`);
                }
                if (status.completedAt) {
                    console.log(`  Completed: ${status.completedAt.toISOString()}`);
                }
                if (status.error) {
                    console.log(`  Error: ${status.error}`);
                }
            }
        }
        catch (err) {
            (0, errors_js_1.handleError)(err);
        }
    });
    agent
        .command('cancel <agentId>')
        .description('Cancel a running agent')
        .option('--profile <name>', 'Use named profile')
        .action(async (agentId, options) => {
        try {
            const profile = (0, config_js_1.getProfile)(config, options.profile);
            const agentConfig = profile.agent || { timeout: 30000, maxConcurrent: 5 };
            const client = new agent_client_js_1.AgentClient(agentConfig);
            const cancelled = await client.cancel(agentId);
            if (cancelled) {
                (0, output_js_1.success)(`Agent ${agentId} cancelled`);
            }
            else {
                (0, output_js_1.error)(`Could not cancel agent ${agentId}`);
            }
        }
        catch (err) {
            (0, errors_js_1.handleError)(err);
        }
    });
    agent
        .command('list')
        .alias('ls')
        .description('List agents')
        .option('-t, --type <type>', 'Filter by agent type')
        .option('-s, --status <status>', 'Filter by status')
        .option('--profile <name>', 'Use named profile')
        .action(async (options) => {
        try {
            const profile = (0, config_js_1.getProfile)(config, options.profile);
            const agentConfig = profile.agent || { timeout: 30000, maxConcurrent: 5 };
            const client = new agent_client_js_1.AgentClient(agentConfig);
            const agents = await client.list({
                type: options.type,
                status: options.status,
            });
            if (program.opts().json) {
                console.log(JSON.stringify(agents, null, 2));
            }
            else {
                if (agents.length === 0) {
                    console.log('No agents found');
                }
                else {
                    const tableData = agents.map((a) => ({
                        id: a.id.substring(0, 8) + '...',
                        name: a.name,
                        type: a.type,
                        status: a.status,
                        progress: `${a.progress}%`,
                    }));
                    console.log((0, output_js_1.formatTable)(tableData));
                }
            }
        }
        catch (err) {
            (0, errors_js_1.handleError)(err);
        }
    });
    agent
        .command('logs <agentId>')
        .description('Get logs for an agent')
        .option('-n, --lines <number>', 'Number of log lines', '50')
        .option('-f, --follow', 'Follow log output')
        .option('--level <level>', 'Filter by log level')
        .option('--profile <name>', 'Use named profile')
        .action(async (agentId, options) => {
        try {
            const profile = (0, config_js_1.getProfile)(config, options.profile);
            const agentConfig = profile.agent || { timeout: 30000, maxConcurrent: 5 };
            const client = new agent_client_js_1.AgentClient(agentConfig);
            const status = await client.getStatus(agentId);
            if (!status) {
                (0, output_js_1.error)(`Agent ${agentId} not found`);
                process.exit(1);
            }
            let logs = status.logs;
            if (options.level) {
                logs = logs.filter((l) => l.level === options.level);
            }
            logs = logs.slice(-parseInt(options.lines));
            if (program.opts().json) {
                console.log(JSON.stringify(logs, null, 2));
            }
            else {
                for (const log of logs) {
                    const timestamp = log.timestamp.toISOString().substring(11, 23);
                    const level = log.level.toUpperCase().padEnd(5);
                    console.log(`[${timestamp}] ${level} ${log.message}`);
                }
            }
            if (options.follow && status.status === 'running') {
                console.log('\n--- Following logs (Ctrl+C to stop) ---\n');
                const unsubscribe = client.onStatusChange(agentId, (s) => {
                    const newLogs = s.logs.slice(logs.length);
                    for (const log of newLogs) {
                        const timestamp = log.timestamp.toISOString().substring(11, 23);
                        const level = log.level.toUpperCase().padEnd(5);
                        console.log(`[${timestamp}] ${level} ${log.message}`);
                    }
                    logs = s.logs;
                });
                process.on('SIGINT', () => {
                    unsubscribe();
                    process.exit(0);
                });
                // Keep process alive
                await new Promise(() => { });
            }
        }
        catch (err) {
            (0, errors_js_1.handleError)(err);
        }
    });
    agent
        .command('types')
        .description('List available agent types')
        .action(() => {
        if (program.opts().json) {
            console.log(JSON.stringify(constants_js_1.AGENT_TYPES, null, 2));
        }
        else {
            console.log('\nAvailable Agent Types:');
            for (const type of constants_js_1.AGENT_TYPES) {
                console.log(`  - ${type}`);
            }
        }
    });
}
