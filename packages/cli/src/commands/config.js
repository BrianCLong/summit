"use strict";
/**
 * Summit CLI Config Commands
 *
 * Configuration management commands.
 *
 * @module @summit/cli/commands/config
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
exports.configCommands = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const config_js_1 = require("../config.js");
/**
 * Initialize configuration
 */
const init = new commander_1.Command('init')
    .description('Initialize CLI configuration')
    .option('--url <url>', 'Summit API URL')
    .option('--tenant <tenantId>', 'Default tenant ID')
    .option('--format <format>', 'Default output format (table, json)')
    .action(async (options) => {
    console.log(chalk_1.default.bold('\nSummit CLI Configuration\n'));
    const readline = await Promise.resolve().then(() => __importStar(require('readline')));
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const question = (prompt, defaultValue) => {
        return new Promise((resolve) => {
            const fullPrompt = defaultValue ? `${prompt} [${defaultValue}]: ` : `${prompt}: `;
            rl.question(fullPrompt, (answer) => {
                resolve(answer || defaultValue || '');
            });
        });
    };
    try {
        await (0, config_js_1.loadConfig)();
        const current = (0, config_js_1.getConfig)();
        const baseUrl = options.url || await question('API URL', current.baseUrl || 'https://api.summit.example.com');
        const tenantId = options.tenant || await question('Tenant ID', current.tenantId);
        const outputFormat = options.format || await question('Output format (table/json)', current.outputFormat || 'table');
        await (0, config_js_1.saveConfig)({
            baseUrl,
            tenantId: tenantId || undefined,
            outputFormat: outputFormat,
        });
        console.log(chalk_1.default.green('\nConfiguration saved successfully!'));
        console.log(`\nConfiguration stored in: ~/.summit/config.json`);
        console.log(`\nRun 'summit login' to authenticate.`);
    }
    finally {
        rl.close();
    }
});
/**
 * Set configuration value
 */
const set = new commander_1.Command('set')
    .description('Set a configuration value')
    .argument('<key>', 'Configuration key')
    .argument('<value>', 'Configuration value')
    .action(async (key, value) => {
    await (0, config_js_1.loadConfig)();
    const validKeys = ['baseUrl', 'tenantId', 'outputFormat', 'apiKey'];
    if (!validKeys.includes(key)) {
        console.error(chalk_1.default.red(`Invalid key: ${key}`));
        console.log(`Valid keys: ${validKeys.join(', ')}`);
        process.exit(1);
    }
    await (0, config_js_1.setConfigValue)(key, value);
    console.log(chalk_1.default.green(`Set ${key} = ${value}`));
});
/**
 * Get configuration value
 */
const getCmd = new commander_1.Command('get')
    .description('Get a configuration value')
    .argument('<key>', 'Configuration key')
    .action(async (key) => {
    await (0, config_js_1.loadConfig)();
    const value = (0, config_js_1.getConfigValue)(key);
    if (value === undefined) {
        console.log(chalk_1.default.yellow(`${key} is not set`));
    }
    else {
        // Mask sensitive values
        if (key === 'token' || key === 'apiKey') {
            console.log(`${key} = ${value.substring(0, 8)}...`);
        }
        else {
            console.log(`${key} = ${value}`);
        }
    }
});
/**
 * List all configuration
 */
const list = new commander_1.Command('list')
    .description('List all configuration values')
    .option('--show-secrets', 'Show sensitive values')
    .action(async (options) => {
    await (0, config_js_1.loadConfig)();
    const config = (0, config_js_1.getConfig)();
    console.log(chalk_1.default.bold('\nCurrent Configuration\n'));
    const entries = Object.entries(config);
    if (entries.length === 0) {
        console.log(chalk_1.default.yellow('No configuration set. Run `summit config init` to configure.'));
        return;
    }
    entries.forEach(([key, value]) => {
        if (!value)
            return;
        // Mask sensitive values unless --show-secrets is set
        if ((key === 'token' || key === 'apiKey') && !options.showSecrets) {
            console.log(`${key.padEnd(15)} = ${String(value).substring(0, 8)}...`);
        }
        else {
            console.log(`${key.padEnd(15)} = ${value}`);
        }
    });
    // Show environment variable overrides
    const envOverrides = [];
    if (process.env.SUMMIT_API_URL)
        envOverrides.push('SUMMIT_API_URL');
    if (process.env.SUMMIT_API_KEY)
        envOverrides.push('SUMMIT_API_KEY');
    if (process.env.SUMMIT_TENANT_ID)
        envOverrides.push('SUMMIT_TENANT_ID');
    if (process.env.SUMMIT_TOKEN)
        envOverrides.push('SUMMIT_TOKEN');
    if (envOverrides.length > 0) {
        console.log(chalk_1.default.dim(`\nEnvironment overrides: ${envOverrides.join(', ')}`));
    }
});
/**
 * Clear configuration
 */
const clear = new commander_1.Command('clear')
    .description('Clear all configuration')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (options) => {
    if (!options.yes) {
        const readline = await Promise.resolve().then(() => __importStar(require('readline')));
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        const answer = await new Promise((resolve) => {
            rl.question(chalk_1.default.yellow('Clear all configuration? (y/N) '), resolve);
        });
        rl.close();
        if (answer.toLowerCase() !== 'y') {
            console.log('Cancelled.');
            return;
        }
    }
    await (0, config_js_1.clearConfig)();
    console.log(chalk_1.default.green('Configuration cleared.'));
});
exports.configCommands = {
    init,
    set,
    get: getCmd,
    list,
    clear,
};
