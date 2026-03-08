"use strict";
/**
 * Config Commands
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerConfigCommands = registerConfigCommands;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_os_1 = __importDefault(require("node:os"));
const yaml_1 = __importDefault(require("yaml"));
const config_js_1 = require("../lib/config.js");
const output_js_1 = require("../utils/output.js");
const errors_js_1 = require("../utils/errors.js");
const constants_js_1 = require("../lib/constants.js");
function registerConfigCommands(program, config) {
    const configCmd = program
        .command('config')
        .alias('c')
        .description('Configuration management');
    configCmd
        .command('show')
        .description('Show current configuration')
        .option('--profile <name>', 'Show specific profile')
        .action((options) => {
        try {
            if (options.profile) {
                const profile = (0, config_js_1.getProfile)(config, options.profile);
                if (program.opts().json) {
                    console.log(JSON.stringify(profile, null, 2));
                }
                else {
                    console.log(`\nProfile: ${options.profile}`);
                    console.log((0, output_js_1.formatOutput)(profile, { format: 'plain' }));
                }
            }
            else {
                if (program.opts().json) {
                    console.log(JSON.stringify(config, null, 2));
                }
                else {
                    console.log('\nConfiguration:');
                    console.log((0, output_js_1.formatOutput)(config, { format: 'plain' }));
                }
            }
        }
        catch (err) {
            (0, errors_js_1.handleError)(err);
        }
    });
    configCmd
        .command('set <key> <value>')
        .description('Set a configuration value')
        .option('--profile <name>', 'Target profile', 'default')
        .action((key, value, options) => {
        try {
            // Parse value
            let parsedValue = value;
            if (value === 'true')
                parsedValue = true;
            else if (value === 'false')
                parsedValue = false;
            else if (!isNaN(Number(value)))
                parsedValue = Number(value);
            (0, config_js_1.setProfileValue)(options.profile, key, parsedValue);
            (0, output_js_1.success)(`Set ${options.profile}.${key} = ${value}`);
        }
        catch (err) {
            (0, errors_js_1.handleError)(err);
        }
    });
    configCmd
        .command('get <key>')
        .description('Get a configuration value')
        .option('--profile <name>', 'Target profile', 'default')
        .action((key, options) => {
        try {
            const profile = (0, config_js_1.getProfile)(config, options.profile);
            const keys = key.split('.');
            let value = profile;
            for (const k of keys) {
                if (value && typeof value === 'object' && k in value) {
                    value = value[k];
                }
                else {
                    console.log('undefined');
                    return;
                }
            }
            if (program.opts().json) {
                console.log(JSON.stringify(value, null, 2));
            }
            else {
                console.log(String(value));
            }
        }
        catch (err) {
            (0, errors_js_1.handleError)(err);
        }
    });
    configCmd
        .command('init')
        .description('Initialize configuration file')
        .option('--global', 'Create in home directory')
        .option('--force', 'Overwrite existing config')
        .action(async (options) => {
        try {
            const configPath = options.global
                ? node_path_1.default.join(node_os_1.default.homedir(), constants_js_1.CONFIG_DIR, 'config.yaml')
                : node_path_1.default.join(process.cwd(), `${constants_js_1.CONFIG_FILE_NAME}.yaml`);
            if (node_fs_1.default.existsSync(configPath) && !options.force) {
                (0, output_js_1.error)(`Configuration file already exists: ${configPath}`);
                (0, output_js_1.info)('Use --force to overwrite');
                return;
            }
            const defaultConfig = {
                defaultProfile: 'default',
                profiles: {
                    default: {
                        neo4j: {
                            uri: 'bolt://localhost:7687',
                            user: 'neo4j',
                            password: '',
                            database: 'neo4j',
                            encrypted: false,
                        },
                        postgres: {
                            host: 'localhost',
                            port: 5432,
                            database: 'intelgraph',
                            user: 'postgres',
                            password: '',
                            ssl: false,
                        },
                        agent: {
                            endpoint: undefined,
                            apiKey: undefined,
                            timeout: 30000,
                            maxConcurrent: 5,
                        },
                        export: {
                            outputDir: './exports',
                            compression: true,
                            signExports: false,
                        },
                    },
                },
                telemetry: false,
            };
            // Ensure directory exists
            const dir = node_path_1.default.dirname(configPath);
            if (!node_fs_1.default.existsSync(dir)) {
                node_fs_1.default.mkdirSync(dir, { recursive: true });
            }
            node_fs_1.default.writeFileSync(configPath, yaml_1.default.stringify(defaultConfig));
            (0, output_js_1.success)(`Configuration file created: ${configPath}`);
            (0, output_js_1.info)('Edit this file to configure your connections');
        }
        catch (err) {
            (0, errors_js_1.handleError)(err);
        }
    });
    configCmd
        .command('path')
        .description('Show configuration file path')
        .action(() => {
        console.log((0, config_js_1.getConfigPath)());
    });
    configCmd
        .command('profiles')
        .description('List available profiles')
        .action(() => {
        try {
            const profiles = Object.keys(config.profiles);
            if (program.opts().json) {
                console.log(JSON.stringify(profiles, null, 2));
            }
            else {
                console.log('\nAvailable Profiles:');
                for (const name of profiles) {
                    const isDefault = name === config.defaultProfile;
                    console.log(`  ${isDefault ? '* ' : '  '}${name}`);
                }
            }
        }
        catch (err) {
            (0, errors_js_1.handleError)(err);
        }
    });
    configCmd
        .command('add-profile <name>')
        .description('Add a new profile')
        .option('--copy-from <profile>', 'Copy settings from existing profile')
        .action((name, options) => {
        try {
            if (config.profiles[name]) {
                throw new errors_js_1.ValidationError(`Profile ${name} already exists`);
            }
            let newProfile = {};
            if (options.copyFrom) {
                const source = config.profiles[options.copyFrom];
                if (!source) {
                    throw new errors_js_1.ValidationError(`Source profile ${options.copyFrom} not found`);
                }
                newProfile = JSON.parse(JSON.stringify(source));
            }
            config.profiles[name] = newProfile;
            (0, config_js_1.saveConfig)(config);
            (0, output_js_1.success)(`Profile ${name} created`);
        }
        catch (err) {
            (0, errors_js_1.handleError)(err);
        }
    });
    configCmd
        .command('remove-profile <name>')
        .description('Remove a profile')
        .action((name) => {
        try {
            if (!config.profiles[name]) {
                throw new errors_js_1.ValidationError(`Profile ${name} not found`);
            }
            if (name === config.defaultProfile) {
                throw new errors_js_1.ValidationError('Cannot remove default profile');
            }
            delete config.profiles[name];
            (0, config_js_1.saveConfig)(config);
            (0, output_js_1.success)(`Profile ${name} removed`);
        }
        catch (err) {
            (0, errors_js_1.handleError)(err);
        }
    });
    configCmd
        .command('set-default <name>')
        .description('Set default profile')
        .action((name) => {
        try {
            if (!config.profiles[name]) {
                throw new errors_js_1.ValidationError(`Profile ${name} not found`);
            }
            config.defaultProfile = name;
            (0, config_js_1.saveConfig)(config);
            (0, output_js_1.success)(`Default profile set to ${name}`);
        }
        catch (err) {
            (0, errors_js_1.handleError)(err);
        }
    });
    configCmd
        .command('validate')
        .description('Validate configuration')
        .option('--profile <name>', 'Validate specific profile')
        .action(async (options) => {
        try {
            const profiles = options.profile
                ? [options.profile]
                : Object.keys(config.profiles);
            let hasErrors = false;
            for (const name of profiles) {
                const profile = config.profiles[name];
                if (!profile) {
                    (0, output_js_1.error)(`Profile ${name} not found`);
                    hasErrors = true;
                    continue;
                }
                console.log(`\nValidating profile: ${name}`);
                // Validate Neo4j config
                if (profile.neo4j) {
                    if (!profile.neo4j.uri) {
                        (0, output_js_1.error)('  neo4j.uri is required');
                        hasErrors = true;
                    }
                    else {
                        (0, output_js_1.success)('  neo4j.uri: valid');
                    }
                }
                else {
                    (0, output_js_1.info)('  neo4j: not configured');
                }
                // Validate PostgreSQL config
                if (profile.postgres) {
                    if (!profile.postgres.host) {
                        (0, output_js_1.error)('  postgres.host is required');
                        hasErrors = true;
                    }
                    else {
                        (0, output_js_1.success)('  postgres.host: valid');
                    }
                }
                else {
                    (0, output_js_1.info)('  postgres: not configured');
                }
                // Validate export config
                if (profile.export) {
                    if (!profile.export.outputDir) {
                        (0, output_js_1.error)('  export.outputDir is required');
                        hasErrors = true;
                    }
                    else {
                        (0, output_js_1.success)('  export.outputDir: valid');
                    }
                }
                else {
                    (0, output_js_1.info)('  export: not configured');
                }
            }
            if (!hasErrors) {
                console.log('\n');
                (0, output_js_1.success)('Configuration is valid');
            }
            else {
                console.log('\n');
                (0, output_js_1.error)('Configuration has errors');
                process.exit(1);
            }
        }
        catch (err) {
            (0, errors_js_1.handleError)(err);
        }
    });
}
