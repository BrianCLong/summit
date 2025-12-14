import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { SchemaValidator } from './lib/config/schema-validator';
import { MigrationEngine, MigrationError } from './lib/config/migration-engine';
import { ConfigWatcher } from './lib/config/config-watcher';
import { ApplicationConfiguration } from './lib/config/config.d';
import { SecretManager } from './lib/secrets/secret-manager';
import { FeatureFlagService } from './lib/config/feature-flags';

const CONFIG_FILE_PATH = path.join(__dirname, '../config/app.yaml');
const MIGRATIONS_DIR = path.join(__dirname, '../config/migrations');
const MIGRATION_HISTORY_FILE = path.join(__dirname, '../.migration_history.json');

class ConfigManager {
  private config: ApplicationConfiguration;
  private validator: SchemaValidator;
  private migrationEngine: MigrationEngine;
  private watcher: ConfigWatcher;
  private secretManager: SecretManager;
  private featureFlags: FeatureFlagService;
  private environment: string;

  constructor() {
    this.environment = process.env.APP_ENV || process.env.NODE_ENV || 'development';
    this.secretManager = new SecretManager();
    this.validator = new SchemaValidator(this.secretManager);
    this.migrationEngine = new MigrationEngine(MIGRATIONS_DIR, MIGRATION_HISTORY_FILE);
    this.config = this.loadConfig();

    this.watcher = new ConfigWatcher(CONFIG_FILE_PATH, 'app', this.validator, (newConfig) => {
      this.config = this.processConfig(newConfig as ApplicationConfiguration);
    });
  }

  private loadConfig(): ApplicationConfiguration {
    try {
      const loadedConfig = this.readRawConfig();
      const finalConfig = this.processConfig(loadedConfig);
      console.log('Configuration loaded and validated successfully.');
      return finalConfig;
    } catch (error) {
      if (error instanceof MigrationError) {
        console.error('A migration failed. The configuration has been rolled back to a safe state.');
        console.error('Please resolve the failed migration and restart the application.');
      } else {
        console.error('Failed to load configuration:', (error as Error).message);
      }
      process.exit(1);
      throw new Error('Configuration failed to load.');
    }
  }

  private readRawConfig(): ApplicationConfiguration {
    if (!fs.existsSync(CONFIG_FILE_PATH)) {
      throw new Error(`Configuration file not found at ${CONFIG_FILE_PATH}`);
    }
    const configString = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
    return yaml.load(configString) as ApplicationConfiguration;
  }

  private processConfig(loadedConfig: ApplicationConfiguration): ApplicationConfiguration {
    const migratedConfig = this.migrateConfig(loadedConfig);
    const environmentApplied = this.applyEnvironmentOverrides(migratedConfig);
    this.applySecretOptions(environmentApplied);
    const validated = this.validator.validate(environmentApplied, 'app') as ApplicationConfiguration;
    this.featureFlags = new FeatureFlagService(validated.features, this.environment);
    return validated;
  }

  private migrateConfig(config: ApplicationConfiguration): ApplicationConfiguration {
    const migratedConfig = this.migrationEngine.migrate(config);
    if (migratedConfig.version > (config.version || 0)) {
      console.log('Successfully migrated configuration. Writing new configuration to file...');
      fs.writeFileSync(CONFIG_FILE_PATH, yaml.dump(migratedConfig), 'utf8');
    }
    return migratedConfig as ApplicationConfiguration;
  }

  private applyEnvironmentOverrides(config: ApplicationConfiguration): ApplicationConfiguration {
    const overrides = (config as any).environments?.[this.environment] || {};
    const fileOverrides = this.readEnvironmentFile();
    const merged = this.deepMerge(config, overrides, fileOverrides);
    delete (merged as any).environments;
    return merged;
  }

  private readEnvironmentFile(): Record<string, unknown> {
    const envConfigPath = path.join(__dirname, '../config/environments', `${this.environment}.yaml`);
    if (!fs.existsSync(envConfigPath)) {
      return {};
    }
    const envConfigString = fs.readFileSync(envConfigPath, 'utf8');
    return (yaml.load(envConfigString) as Record<string, unknown>) || {};
  }

  private deepMerge(...configs: any[]): any {
    return configs.reduce((acc, current) => {
      Object.entries(current || {}).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          acc[key] = [...value];
        } else if (value && typeof value === 'object') {
          acc[key] = this.deepMerge(acc[key] || {}, value);
        } else if (value !== undefined) {
          acc[key] = value;
        }
      });
      return acc;
    }, {} as any);
  }

  private applySecretOptions(config: ApplicationConfiguration) {
    const secrets = (config as any).security?.secrets;
    if (!secrets) return;
    const rotationIntervalSeconds = secrets.rotation?.enabled === false ? 0 : secrets.rotation?.intervalSeconds;
    this.secretManager.updateOptions({
      cacheTtlSeconds: secrets.cacheTtlSeconds,
      rotationIntervalSeconds,
      auditLogPath: secrets.auditLogPath,
      encryptionKeyEnv: secrets.encryptionKeyEnv,
      providerPreference: secrets.providerPreference,
      vaultConfig: secrets.vault,
      awsConfig: secrets.aws,
      fileBasePath: secrets.fileBasePath,
    });
    this.validator.configureSecrets({
      cacheTtlSeconds: secrets.cacheTtlSeconds,
      rotationIntervalSeconds,
      auditLogPath: secrets.auditLogPath,
      encryptionKeyEnv: secrets.encryptionKeyEnv,
      providerPreference: secrets.providerPreference,
      vaultConfig: secrets.vault,
      awsConfig: secrets.aws,
      fileBasePath: secrets.fileBasePath,
    });
  }

  public getConfig(): ApplicationConfiguration {
    return this.config;
  }

  public getFeatureFlags(): FeatureFlagService {
    return this.featureFlags || new FeatureFlagService(this.config?.features, this.environment);
  }
}

const configManager = new ConfigManager();

export const getConfig = () => configManager.getConfig();
export const getFeatureFlags = () => configManager.getFeatureFlags();
