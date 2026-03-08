"use strict";
/**
 * Configuration management commands for Admin CLI
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerConfigCommands = registerConfigCommands;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const output_js_1 = require("../utils/output.js");
const config_js_1 = require("../utils/config.js");
const confirm_js_1 = require("../utils/confirm.js");
/**
 * Register config commands
 */
function registerConfigCommands(program) {
    const configCmd = new commander_1.Command('config')
        .description('Manage CLI configuration and profiles');
    // Show config
    configCmd
        .command('show')
        .description('Show current configuration')
        .action(async (_options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await showConfig(globalOpts);
    });
    // Get specific value
    configCmd
        .command('get <key>')
        .description('Get a configuration value')
        .action(async (key, _options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await getConfigValue(key, globalOpts);
    });
    // Set value
    configCmd
        .command('set <key> <value>')
        .description('Set a configuration value')
        .action(async (key, value, _options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await setConfigValue(key, value, globalOpts);
    });
    // List profiles
    configCmd
        .command('profiles')
        .description('List configured profiles')
        .action(async (_options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await listConfigProfiles(globalOpts);
    });
    // Add/update profile
    configCmd
        .command('profile <name>')
        .description('Add or update a profile')
        .option('-e, --endpoint <url>', 'API endpoint URL')
        .option('-t, --token <token>', 'Authentication token')
        .option('--default', 'Set as default profile')
        .option('--interactive', 'Use interactive prompts')
        .action(async (name, options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await configureProfile(name, options, globalOpts);
    });
    // Delete profile
    configCmd
        .command('delete-profile <name>')
        .description('Delete a profile')
        .option('--force', 'Skip confirmation')
        .action(async (name, options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await removeProfile(name, options.force, globalOpts);
    });
    // Use profile as default
    configCmd
        .command('use <profile>')
        .description('Set default profile')
        .action(async (profile, _options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await useProfile(profile, globalOpts);
    });
    // Init/setup wizard
    configCmd
        .command('init')
        .description('Initialize CLI configuration with setup wizard')
        .action(async (_options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await initConfig(globalOpts);
    });
    // Reset config
    configCmd
        .command('reset')
        .description('Reset configuration to defaults')
        .option('--force', 'Skip confirmation')
        .action(async (options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await resetConfiguration(options.force, globalOpts);
    });
    // Show config path
    configCmd
        .command('path')
        .description('Show configuration file path')
        .action(() => {
        console.log((0, config_js_1.getConfigPath)());
    });
    program.addCommand(configCmd);
}
/**
 * Show full configuration
 */
async function showConfig(_options) {
    const config = (0, config_js_1.getConfig)();
    if ((0, output_js_1.getOutputFormat)() === 'json') {
        // Redact tokens in JSON output
        const redactedConfig = {
            ...config,
            profiles: Object.fromEntries(Object.entries(config.profiles).map(([name, profile]) => [
                name,
                {
                    ...profile,
                    token: profile.token ? '[REDACTED]' : undefined,
                },
            ])),
        };
        (0, output_js_1.output)(redactedConfig);
        return;
    }
    (0, output_js_1.printHeader)('CLI Configuration');
    console.log(chalk_1.default.bold('Default Profile:'), config.defaultProfile);
    console.log(chalk_1.default.bold('Default Endpoint:'), config.defaultEndpoint);
    console.log(chalk_1.default.bold('Config File:'), (0, config_js_1.getConfigPath)());
    console.log();
    console.log(chalk_1.default.bold('Profiles:'));
    const profileRows = Object.entries(config.profiles).map(([name, profile]) => ({
        name,
        endpoint: profile.endpoint,
        token: profile.token ? '****' : '-',
        format: profile.defaultFormat ?? 'table',
        default: name === config.defaultProfile ? '✓' : '',
    }));
    (0, output_js_1.outputTable)(profileRows);
}
/**
 * Get a specific config value
 */
async function getConfigValue(key, _options) {
    const config = (0, config_js_1.getConfig)();
    // Handle nested keys like "profiles.production.endpoint"
    const keys = key.split('.');
    let value = config;
    for (const k of keys) {
        if (typeof value === 'object' && value !== null && k in value) {
            value = value[k];
        }
        else {
            (0, output_js_1.printError)(`Configuration key not found: ${key}`);
            process.exit(1);
        }
    }
    // Redact token values
    if (key.toLowerCase().includes('token') && typeof value === 'string') {
        console.log('[REDACTED]');
    }
    else if (typeof value === 'object') {
        (0, output_js_1.output)(value);
    }
    else {
        console.log(String(value));
    }
}
/**
 * Set a config value
 */
async function setConfigValue(key, value, _options) {
    const keys = key.split('.');
    if (keys[0] === 'defaultProfile') {
        (0, config_js_1.setDefaultProfile)(value);
        (0, output_js_1.printSuccess)(`Default profile set to: ${value}`);
    }
    else if (keys[0] === 'profiles' && keys.length >= 3) {
        const profileName = keys[1];
        const profileKey = keys[2];
        const profile = (0, config_js_1.getProfile)(profileName);
        (0, config_js_1.setProfile)(profileName, { ...profile, [profileKey]: value });
        (0, output_js_1.printSuccess)(`Updated ${profileName}.${profileKey}`);
    }
    else {
        (0, output_js_1.printError)('Invalid configuration key. Use "defaultProfile" or "profiles.<name>.<key>"');
        process.exit(1);
    }
}
/**
 * List profiles
 */
async function listConfigProfiles(_options) {
    const config = (0, config_js_1.getConfig)();
    const profiles = (0, config_js_1.listProfiles)();
    if ((0, output_js_1.getOutputFormat)() === 'json') {
        (0, output_js_1.output)(profiles.map((name) => ({
            name,
            ...config.profiles[name],
            token: config.profiles[name].token ? '[REDACTED]' : undefined,
            isDefault: name === config.defaultProfile,
        })));
        return;
    }
    (0, output_js_1.printHeader)('Profiles');
    const profileRows = profiles.map((name) => {
        const profile = config.profiles[name];
        return {
            name,
            endpoint: profile.endpoint,
            hasToken: profile.token ? 'Yes' : 'No',
            default: name === config.defaultProfile ? '✓' : '',
        };
    });
    (0, output_js_1.outputTable)(profileRows);
}
/**
 * Configure a profile
 */
async function configureProfile(name, options, _globalOpts) {
    let profileConfig = {};
    if (options.interactive) {
        const currentProfile = (0, config_js_1.getProfile)(name);
        const answers = await inquirer_1.default.prompt([
            {
                type: 'input',
                name: 'endpoint',
                message: 'API endpoint URL:',
                default: currentProfile?.endpoint ?? 'http://localhost:4000',
                validate: (input) => {
                    try {
                        new URL(input);
                        return true;
                    }
                    catch {
                        return 'Please enter a valid URL';
                    }
                },
            },
            {
                type: 'password',
                name: 'token',
                message: 'Authentication token (leave empty to keep existing):',
                mask: '*',
            },
            {
                type: 'list',
                name: 'defaultFormat',
                message: 'Default output format:',
                choices: ['table', 'json', 'yaml'],
                default: currentProfile?.defaultFormat ?? 'table',
            },
        ]);
        profileConfig = {
            endpoint: answers.endpoint,
            defaultFormat: answers.defaultFormat,
        };
        if (answers.token) {
            profileConfig.token = answers.token;
        }
    }
    else {
        if (options.endpoint) {
            try {
                new URL(options.endpoint);
                profileConfig.endpoint = options.endpoint;
            }
            catch {
                (0, output_js_1.printError)('Invalid endpoint URL');
                process.exit(1);
            }
        }
        if (options.token) {
            profileConfig.token = options.token;
        }
    }
    if (Object.keys(profileConfig).length === 0) {
        (0, output_js_1.printError)('No configuration provided. Use --endpoint, --token, or --interactive');
        process.exit(1);
    }
    (0, config_js_1.setProfile)(name, profileConfig);
    (0, output_js_1.printSuccess)(`Profile "${name}" configured`);
    if (options.default) {
        (0, config_js_1.setDefaultProfile)(name);
        (0, output_js_1.printInfo)(`Set as default profile`);
    }
}
/**
 * Remove a profile
 */
async function removeProfile(name, force, _options) {
    if (name === 'default') {
        (0, output_js_1.printError)('Cannot delete the default profile');
        process.exit(1);
    }
    if (!force) {
        const confirmed = await (0, confirm_js_1.confirm)(`Delete profile "${name}"?`);
        if (!confirmed) {
            (0, confirm_js_1.abort)();
        }
    }
    const deleted = (0, config_js_1.deleteProfile)(name);
    if (deleted) {
        (0, output_js_1.printSuccess)(`Profile "${name}" deleted`);
    }
    else {
        (0, output_js_1.printError)(`Profile "${name}" not found`);
        process.exit(1);
    }
}
/**
 * Set default profile
 */
async function useProfile(profile, _options) {
    const profiles = (0, config_js_1.listProfiles)();
    if (!profiles.includes(profile)) {
        (0, output_js_1.printError)(`Profile "${profile}" not found`);
        console.log(chalk_1.default.gray(`Available profiles: ${profiles.join(', ')}`));
        process.exit(1);
    }
    (0, config_js_1.setDefaultProfile)(profile);
    (0, output_js_1.printSuccess)(`Now using profile: ${profile}`);
}
/**
 * Initialize configuration
 */
async function initConfig(_options) {
    (0, output_js_1.printHeader)('CLI Configuration Setup');
    console.log('This wizard will help you set up the Admin CLI.');
    console.log();
    const answers = await inquirer_1.default.prompt([
        {
            type: 'input',
            name: 'endpoint',
            message: 'Default API endpoint:',
            default: 'http://localhost:4000',
            validate: (input) => {
                try {
                    new URL(input);
                    return true;
                }
                catch {
                    return 'Please enter a valid URL';
                }
            },
        },
        {
            type: 'password',
            name: 'token',
            message: 'Authentication token (optional, can set later):',
            mask: '*',
        },
        {
            type: 'confirm',
            name: 'setupProduction',
            message: 'Set up production profile?',
            default: false,
        },
    ]);
    // Configure default profile
    (0, config_js_1.setProfile)('default', {
        endpoint: answers.endpoint,
        token: answers.token || undefined,
        defaultFormat: 'table',
    });
    if (answers.setupProduction) {
        const prodAnswers = await inquirer_1.default.prompt([
            {
                type: 'input',
                name: 'prodEndpoint',
                message: 'Production API endpoint:',
                default: 'https://api.intelgraph.com',
            },
            {
                type: 'password',
                name: 'prodToken',
                message: 'Production token (optional):',
                mask: '*',
            },
        ]);
        (0, config_js_1.setProfile)('production', {
            endpoint: prodAnswers.prodEndpoint,
            token: prodAnswers.prodToken || undefined,
            defaultFormat: 'table',
        });
    }
    (0, output_js_1.printSuccess)('Configuration initialized!');
    console.log();
    console.log(chalk_1.default.bold('Configuration saved to:'), (0, config_js_1.getConfigPath)());
    console.log();
    console.log('Next steps:');
    console.log(chalk_1.default.cyan('  summit-admin env status    # Check environment status'));
    console.log(chalk_1.default.cyan('  summit-admin tenant list   # List tenants'));
    console.log(chalk_1.default.cyan('  summit-admin --help        # See all commands'));
}
/**
 * Reset configuration
 */
async function resetConfiguration(force, _options) {
    if (!force) {
        const confirmed = await (0, confirm_js_1.confirm)('This will reset all configuration to defaults. Continue?');
        if (!confirmed) {
            (0, confirm_js_1.abort)();
        }
    }
    (0, config_js_1.resetConfig)();
    (0, output_js_1.printSuccess)('Configuration reset to defaults');
}
