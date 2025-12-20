/**
 * Configuration management commands for Admin CLI
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import type { GlobalOptions, ProfileConfig } from '../types/index.js';
import {
  output,
  outputTable,
  outputKeyValue,
  printHeader,
  printError,
  printSuccess,
  printInfo,
  getOutputFormat,
} from '../utils/output.js';
import {
  getConfig,
  getProfile,
  setProfile,
  deleteProfile,
  setDefaultProfile,
  listProfiles,
  getConfigPath,
  resetConfig,
} from '../utils/config.js';
import { confirm, abort } from '../utils/confirm.js';

/**
 * Register config commands
 */
export function registerConfigCommands(program: Command): void {
  const configCmd = new Command('config')
    .description('Manage CLI configuration and profiles');

  // Show config
  configCmd
    .command('show')
    .description('Show current configuration')
    .action(async (_options, cmd) => {
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
      await showConfig(globalOpts);
    });

  // Get specific value
  configCmd
    .command('get <key>')
    .description('Get a configuration value')
    .action(async (key, _options, cmd) => {
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
      await getConfigValue(key, globalOpts);
    });

  // Set value
  configCmd
    .command('set <key> <value>')
    .description('Set a configuration value')
    .action(async (key, value, _options, cmd) => {
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
      await setConfigValue(key, value, globalOpts);
    });

  // List profiles
  configCmd
    .command('profiles')
    .description('List configured profiles')
    .action(async (_options, cmd) => {
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
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
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
      await configureProfile(name, options, globalOpts);
    });

  // Delete profile
  configCmd
    .command('delete-profile <name>')
    .description('Delete a profile')
    .option('--force', 'Skip confirmation')
    .action(async (name, options, cmd) => {
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
      await removeProfile(name, options.force, globalOpts);
    });

  // Use profile as default
  configCmd
    .command('use <profile>')
    .description('Set default profile')
    .action(async (profile, _options, cmd) => {
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
      await useProfile(profile, globalOpts);
    });

  // Init/setup wizard
  configCmd
    .command('init')
    .description('Initialize CLI configuration with setup wizard')
    .action(async (_options, cmd) => {
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
      await initConfig(globalOpts);
    });

  // Reset config
  configCmd
    .command('reset')
    .description('Reset configuration to defaults')
    .option('--force', 'Skip confirmation')
    .action(async (options, cmd) => {
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
      await resetConfiguration(options.force, globalOpts);
    });

  // Show config path
  configCmd
    .command('path')
    .description('Show configuration file path')
    .action(() => {
      console.log(getConfigPath());
    });

  program.addCommand(configCmd);
}

/**
 * Show full configuration
 */
async function showConfig(_options: GlobalOptions): Promise<void> {
  const config = getConfig();

  if (getOutputFormat() === 'json') {
    // Redact tokens in JSON output
    const redactedConfig = {
      ...config,
      profiles: Object.fromEntries(
        Object.entries(config.profiles).map(([name, profile]) => [
          name,
          {
            ...profile,
            token: profile.token ? '[REDACTED]' : undefined,
          },
        ])
      ),
    };
    output(redactedConfig);
    return;
  }

  printHeader('CLI Configuration');

  console.log(chalk.bold('Default Profile:'), config.defaultProfile);
  console.log(chalk.bold('Default Endpoint:'), config.defaultEndpoint);
  console.log(chalk.bold('Config File:'), getConfigPath());
  console.log();

  console.log(chalk.bold('Profiles:'));
  const profileRows = Object.entries(config.profiles).map(([name, profile]) => ({
    name,
    endpoint: profile.endpoint,
    token: profile.token ? '****' : '-',
    format: profile.defaultFormat ?? 'table',
    default: name === config.defaultProfile ? '✓' : '',
  }));

  outputTable(profileRows);
}

/**
 * Get a specific config value
 */
async function getConfigValue(key: string, _options: GlobalOptions): Promise<void> {
  const config = getConfig();

  // Handle nested keys like "profiles.production.endpoint"
  const keys = key.split('.');
  let value: unknown = config;

  for (const k of keys) {
    if (typeof value === 'object' && value !== null && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      printError(`Configuration key not found: ${key}`);
      process.exit(1);
    }
  }

  // Redact token values
  if (key.toLowerCase().includes('token') && typeof value === 'string') {
    console.log('[REDACTED]');
  } else if (typeof value === 'object') {
    output(value);
  } else {
    console.log(String(value));
  }
}

/**
 * Set a config value
 */
async function setConfigValue(key: string, value: string, _options: GlobalOptions): Promise<void> {
  const keys = key.split('.');

  if (keys[0] === 'defaultProfile') {
    setDefaultProfile(value);
    printSuccess(`Default profile set to: ${value}`);
  } else if (keys[0] === 'profiles' && keys.length >= 3) {
    const profileName = keys[1];
    const profileKey = keys[2] as keyof ProfileConfig;

    const profile = getProfile(profileName);
    setProfile(profileName, { ...profile, [profileKey]: value });
    printSuccess(`Updated ${profileName}.${profileKey}`);
  } else {
    printError('Invalid configuration key. Use "defaultProfile" or "profiles.<name>.<key>"');
    process.exit(1);
  }
}

/**
 * List profiles
 */
async function listConfigProfiles(_options: GlobalOptions): Promise<void> {
  const config = getConfig();
  const profiles = listProfiles();

  if (getOutputFormat() === 'json') {
    output(
      profiles.map((name) => ({
        name,
        ...config.profiles[name],
        token: config.profiles[name].token ? '[REDACTED]' : undefined,
        isDefault: name === config.defaultProfile,
      }))
    );
    return;
  }

  printHeader('Profiles');

  const profileRows = profiles.map((name) => {
    const profile = config.profiles[name];
    return {
      name,
      endpoint: profile.endpoint,
      hasToken: profile.token ? 'Yes' : 'No',
      default: name === config.defaultProfile ? '✓' : '',
    };
  });

  outputTable(profileRows);
}

/**
 * Configure a profile
 */
async function configureProfile(
  name: string,
  options: {
    endpoint?: string;
    token?: string;
    default?: boolean;
    interactive?: boolean;
  },
  _globalOpts: GlobalOptions
): Promise<void> {
  let profileConfig: Partial<ProfileConfig> = {};

  if (options.interactive) {
    const currentProfile = getProfile(name);

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'endpoint',
        message: 'API endpoint URL:',
        default: currentProfile?.endpoint ?? 'http://localhost:4000',
        validate: (input: string) => {
          try {
            new URL(input);
            return true;
          } catch {
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
  } else {
    if (options.endpoint) {
      try {
        new URL(options.endpoint);
        profileConfig.endpoint = options.endpoint;
      } catch {
        printError('Invalid endpoint URL');
        process.exit(1);
      }
    }

    if (options.token) {
      profileConfig.token = options.token;
    }
  }

  if (Object.keys(profileConfig).length === 0) {
    printError('No configuration provided. Use --endpoint, --token, or --interactive');
    process.exit(1);
  }

  setProfile(name, profileConfig);
  printSuccess(`Profile "${name}" configured`);

  if (options.default) {
    setDefaultProfile(name);
    printInfo(`Set as default profile`);
  }
}

/**
 * Remove a profile
 */
async function removeProfile(
  name: string,
  force: boolean,
  _options: GlobalOptions
): Promise<void> {
  if (name === 'default') {
    printError('Cannot delete the default profile');
    process.exit(1);
  }

  if (!force) {
    const confirmed = await confirm(`Delete profile "${name}"?`);
    if (!confirmed) {
      abort();
    }
  }

  const deleted = deleteProfile(name);

  if (deleted) {
    printSuccess(`Profile "${name}" deleted`);
  } else {
    printError(`Profile "${name}" not found`);
    process.exit(1);
  }
}

/**
 * Set default profile
 */
async function useProfile(profile: string, _options: GlobalOptions): Promise<void> {
  const profiles = listProfiles();

  if (!profiles.includes(profile)) {
    printError(`Profile "${profile}" not found`);
    console.log(chalk.gray(`Available profiles: ${profiles.join(', ')}`));
    process.exit(1);
  }

  setDefaultProfile(profile);
  printSuccess(`Now using profile: ${profile}`);
}

/**
 * Initialize configuration
 */
async function initConfig(_options: GlobalOptions): Promise<void> {
  printHeader('CLI Configuration Setup');

  console.log('This wizard will help you set up the Admin CLI.');
  console.log();

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'endpoint',
      message: 'Default API endpoint:',
      default: 'http://localhost:4000',
      validate: (input: string) => {
        try {
          new URL(input);
          return true;
        } catch {
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
  setProfile('default', {
    endpoint: answers.endpoint,
    token: answers.token || undefined,
    defaultFormat: 'table',
  });

  if (answers.setupProduction) {
    const prodAnswers = await inquirer.prompt([
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

    setProfile('production', {
      endpoint: prodAnswers.prodEndpoint,
      token: prodAnswers.prodToken || undefined,
      defaultFormat: 'table',
    });
  }

  printSuccess('Configuration initialized!');
  console.log();
  console.log(chalk.bold('Configuration saved to:'), getConfigPath());
  console.log();
  console.log('Next steps:');
  console.log(chalk.cyan('  summit-admin env status    # Check environment status'));
  console.log(chalk.cyan('  summit-admin tenant list   # List tenants'));
  console.log(chalk.cyan('  summit-admin --help        # See all commands'));
}

/**
 * Reset configuration
 */
async function resetConfiguration(force: boolean, _options: GlobalOptions): Promise<void> {
  if (!force) {
    const confirmed = await confirm(
      'This will reset all configuration to defaults. Continue?'
    );
    if (!confirmed) {
      abort();
    }
  }

  resetConfig();
  printSuccess('Configuration reset to defaults');
}
