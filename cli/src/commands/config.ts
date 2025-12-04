/**
 * Config Commands
 */

import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import yaml from 'yaml';
import type { CLIConfig } from '../lib/config.js';
import {
  getProfile,
  saveConfig,
  setProfileValue,
  getConfigPath,
} from '../lib/config.js';
import { formatOutput, success, error, info } from '../utils/output.js';
import { handleError, ValidationError } from '../utils/errors.js';
import { CONFIG_DIR, CONFIG_FILE_NAME } from '../lib/constants.js';

export function registerConfigCommands(program: Command, config: CLIConfig): void {
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
          const profile = getProfile(config, options.profile);
          if (program.opts().json) {
            console.log(JSON.stringify(profile, null, 2));
          } else {
            console.log(`\nProfile: ${options.profile}`);
            console.log(formatOutput(profile, { format: 'plain' }));
          }
        } else {
          if (program.opts().json) {
            console.log(JSON.stringify(config, null, 2));
          } else {
            console.log('\nConfiguration:');
            console.log(formatOutput(config, { format: 'plain' }));
          }
        }
      } catch (err) {
        handleError(err);
      }
    });

  configCmd
    .command('set <key> <value>')
    .description('Set a configuration value')
    .option('--profile <name>', 'Target profile', 'default')
    .action((key: string, value: string, options) => {
      try {
        // Parse value
        let parsedValue: unknown = value;
        if (value === 'true') parsedValue = true;
        else if (value === 'false') parsedValue = false;
        else if (!isNaN(Number(value))) parsedValue = Number(value);

        setProfileValue(options.profile, key, parsedValue);

        success(`Set ${options.profile}.${key} = ${value}`);
      } catch (err) {
        handleError(err);
      }
    });

  configCmd
    .command('get <key>')
    .description('Get a configuration value')
    .option('--profile <name>', 'Target profile', 'default')
    .action((key: string, options) => {
      try {
        const profile = getProfile(config, options.profile);
        const keys = key.split('.');

        let value: unknown = profile;
        for (const k of keys) {
          if (value && typeof value === 'object' && k in value) {
            value = (value as Record<string, unknown>)[k];
          } else {
            console.log('undefined');
            return;
          }
        }

        if (program.opts().json) {
          console.log(JSON.stringify(value, null, 2));
        } else {
          console.log(String(value));
        }
      } catch (err) {
        handleError(err);
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
          ? path.join(os.homedir(), CONFIG_DIR, 'config.yaml')
          : path.join(process.cwd(), `${CONFIG_FILE_NAME}.yaml`);

        if (fs.existsSync(configPath) && !options.force) {
          error(`Configuration file already exists: ${configPath}`);
          info('Use --force to overwrite');
          return;
        }

        const defaultConfig: CLIConfig = {
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
        const dir = path.dirname(configPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(configPath, yaml.stringify(defaultConfig));

        success(`Configuration file created: ${configPath}`);
        info('Edit this file to configure your connections');
      } catch (err) {
        handleError(err);
      }
    });

  configCmd
    .command('path')
    .description('Show configuration file path')
    .action(() => {
      console.log(getConfigPath());
    });

  configCmd
    .command('profiles')
    .description('List available profiles')
    .action(() => {
      try {
        const profiles = Object.keys(config.profiles);

        if (program.opts().json) {
          console.log(JSON.stringify(profiles, null, 2));
        } else {
          console.log('\nAvailable Profiles:');
          for (const name of profiles) {
            const isDefault = name === config.defaultProfile;
            console.log(`  ${isDefault ? '* ' : '  '}${name}`);
          }
        }
      } catch (err) {
        handleError(err);
      }
    });

  configCmd
    .command('add-profile <name>')
    .description('Add a new profile')
    .option('--copy-from <profile>', 'Copy settings from existing profile')
    .action((name: string, options) => {
      try {
        if (config.profiles[name]) {
          throw new ValidationError(`Profile ${name} already exists`);
        }

        let newProfile = {};
        if (options.copyFrom) {
          const source = config.profiles[options.copyFrom];
          if (!source) {
            throw new ValidationError(`Source profile ${options.copyFrom} not found`);
          }
          newProfile = JSON.parse(JSON.stringify(source));
        }

        config.profiles[name] = newProfile;
        saveConfig(config);

        success(`Profile ${name} created`);
      } catch (err) {
        handleError(err);
      }
    });

  configCmd
    .command('remove-profile <name>')
    .description('Remove a profile')
    .action((name: string) => {
      try {
        if (!config.profiles[name]) {
          throw new ValidationError(`Profile ${name} not found`);
        }

        if (name === config.defaultProfile) {
          throw new ValidationError('Cannot remove default profile');
        }

        delete config.profiles[name];
        saveConfig(config);

        success(`Profile ${name} removed`);
      } catch (err) {
        handleError(err);
      }
    });

  configCmd
    .command('set-default <name>')
    .description('Set default profile')
    .action((name: string) => {
      try {
        if (!config.profiles[name]) {
          throw new ValidationError(`Profile ${name} not found`);
        }

        config.defaultProfile = name;
        saveConfig(config);

        success(`Default profile set to ${name}`);
      } catch (err) {
        handleError(err);
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
            error(`Profile ${name} not found`);
            hasErrors = true;
            continue;
          }

          console.log(`\nValidating profile: ${name}`);

          // Validate Neo4j config
          if (profile.neo4j) {
            if (!profile.neo4j.uri) {
              error('  neo4j.uri is required');
              hasErrors = true;
            } else {
              success('  neo4j.uri: valid');
            }
          } else {
            info('  neo4j: not configured');
          }

          // Validate PostgreSQL config
          if (profile.postgres) {
            if (!profile.postgres.host) {
              error('  postgres.host is required');
              hasErrors = true;
            } else {
              success('  postgres.host: valid');
            }
          } else {
            info('  postgres: not configured');
          }

          // Validate export config
          if (profile.export) {
            if (!profile.export.outputDir) {
              error('  export.outputDir is required');
              hasErrors = true;
            } else {
              success('  export.outputDir: valid');
            }
          } else {
            info('  export: not configured');
          }
        }

        if (!hasErrors) {
          console.log('\n');
          success('Configuration is valid');
        } else {
          console.log('\n');
          error('Configuration has errors');
          process.exit(1);
        }
      } catch (err) {
        handleError(err);
      }
    });
}
