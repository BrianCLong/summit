import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { SchemaValidator } from './lib/config/schema-validator';
import { MigrationEngine, MigrationError } from './lib/config/migration-engine';
import { ConfigWatcher } from './lib/config/config-watcher';
import { ApplicationConfiguration } from './lib/config/config.d';

const CONFIG_FILE_PATH = path.join(__dirname, '../config/app.yaml');
const MIGRATIONS_DIR = path.join(__dirname, '../config/migrations');
const MIGRATION_HISTORY_FILE = path.join(__dirname, '../.migration_history.json');

class ConfigManager {
  private config: ApplicationConfiguration;
  private validator: SchemaValidator;
  private migrationEngine: MigrationEngine;
  private watcher: ConfigWatcher;

  constructor() {
    this.validator = new SchemaValidator();
    this.migrationEngine = new MigrationEngine(MIGRATIONS_DIR, MIGRATION_HISTORY_FILE);

    this.loadConfig();

    this.watcher = new ConfigWatcher(CONFIG_FILE_PATH, 'app', this.validator, (newConfig) => {
      this.config = newConfig as ApplicationConfiguration;
    });
  }

  private loadConfig() {
    try {
      const configString = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
      let loadedConfig = yaml.load(configString);

      // Run migrations
      const migratedConfig = this.migrationEngine.migrate(loadedConfig);
      if (migratedConfig.version > (loadedConfig.version || 0)) {
        console.log('Successfully migrated configuration. Writing new configuration to file...');
        fs.writeFileSync(CONFIG_FILE_PATH, yaml.dump(migratedConfig), 'utf8');
      }

      // Validate the final config
      this.validator.validate(migratedConfig, 'app');

      this.config = migratedConfig as ApplicationConfiguration;
      console.log('Configuration loaded and validated successfully.');

    } catch (error) {
      if (error instanceof MigrationError) {
        console.error('A migration failed. The configuration has been rolled back to a safe state.');
        console.error('Please resolve the failed migration and restart the application.');
        // Optionally, write the rolled-back config to a recovery file
        // fs.writeFileSync(`${CONFIG_FILE_PATH}.recovery`, yaml.dump(error.rolledBackConfig), 'utf8');
      } else {
        console.error('Failed to load configuration:', (error as Error).message);
      }
      process.exit(1);
    }
  }

  public getConfig(): ApplicationConfiguration {
    return this.config;
  }
}

const configManager = new ConfigManager();

export const getConfig = () => configManager.getConfig();
