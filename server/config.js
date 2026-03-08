"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFeatureFlags = exports.getConfig = void 0;
// @ts-nocheck
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
const schema_validator_js_1 = require("./lib/config/schema-validator.js");
const migration_engine_js_1 = require("./lib/config/migration-engine.js");
const config_watcher_js_1 = require("./lib/config/config-watcher.js");
const secret_manager_js_1 = require("./lib/secrets/secret-manager.js");
const feature_flags_js_1 = require("./lib/config/feature-flags.js");
const CONFIG_FILE_PATH = path.join(__dirname, '../config/app.yaml');
const MIGRATIONS_DIR = path.join(__dirname, '../config/migrations');
const MIGRATION_HISTORY_FILE = path.join(__dirname, '../.migration_history.json');
class ConfigManager {
    config;
    validator;
    migrationEngine;
    watcher;
    secretManager;
    featureFlags;
    environment;
    constructor() {
        this.environment = process.env.APP_ENV || process.env.NODE_ENV || 'development';
        this.secretManager = new secret_manager_js_1.SecretManager();
        this.validator = new schema_validator_js_1.SchemaValidator(this.secretManager);
        this.migrationEngine = new migration_engine_js_1.MigrationEngine(MIGRATIONS_DIR, MIGRATION_HISTORY_FILE);
        this.config = this.loadConfig();
        this.watcher = new config_watcher_js_1.ConfigWatcher(CONFIG_FILE_PATH, 'app', this.validator, (newConfig) => {
            this.config = this.processConfig(newConfig);
        });
    }
    loadConfig() {
        try {
            const loadedConfig = this.readRawConfig();
            const finalConfig = this.processConfig(loadedConfig);
            console.log('Configuration loaded and validated successfully.');
            return finalConfig;
        }
        catch (error) {
            if (error instanceof migration_engine_js_1.MigrationError) {
                console.error('A migration failed. The configuration has been rolled back to a safe state.');
                console.error('Please resolve the failed migration and restart the application.');
            }
            else {
                console.error('Failed to load configuration:', error.message);
            }
            process.exit(1);
            throw new Error('Configuration failed to load.');
        }
    }
    readRawConfig() {
        if (!fs.existsSync(CONFIG_FILE_PATH)) {
            throw new Error(`Configuration file not found at ${CONFIG_FILE_PATH}`);
        }
        const configString = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
        return yaml.load(configString);
    }
    processConfig(loadedConfig) {
        const migratedConfig = this.migrateConfig(loadedConfig);
        const environmentApplied = this.applyEnvironmentOverrides(migratedConfig);
        this.applySecretOptions(environmentApplied);
        const validated = this.validator.validate(environmentApplied, 'app');
        this.featureFlags = new feature_flags_js_1.FeatureFlagService(validated.features, this.environment);
        return validated;
    }
    migrateConfig(config) {
        const migratedConfig = this.migrationEngine.migrate(config);
        if (migratedConfig.version > (config.version || 0)) {
            console.log('Successfully migrated configuration. Writing new configuration to file...');
            fs.writeFileSync(CONFIG_FILE_PATH, yaml.dump(migratedConfig), 'utf8');
        }
        return migratedConfig;
    }
    applyEnvironmentOverrides(config) {
        const overrides = config.environments?.[this.environment] || {};
        const fileOverrides = this.readEnvironmentFile();
        const merged = this.deepMerge(config, overrides, fileOverrides);
        delete merged.environments;
        return merged;
    }
    readEnvironmentFile() {
        const envConfigPath = path.join(__dirname, '../config/environments', `${this.environment}.yaml`);
        if (!fs.existsSync(envConfigPath)) {
            return {};
        }
        const envConfigString = fs.readFileSync(envConfigPath, 'utf8');
        return yaml.load(envConfigString) || {};
    }
    deepMerge(...configs) {
        return configs.reduce((acc, current) => {
            Object.entries(current || {}).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                    acc[key] = [...value];
                }
                else if (value && typeof value === 'object') {
                    acc[key] = this.deepMerge(acc[key] || {}, value);
                }
                else if (value !== undefined) {
                    acc[key] = value;
                }
            });
            return acc;
        }, {});
    }
    applySecretOptions(config) {
        const secrets = config.security?.secrets;
        if (!secrets)
            return;
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
    getConfig() {
        return this.config;
    }
    getFeatureFlags() {
        return this.featureFlags || new feature_flags_js_1.FeatureFlagService(this.config?.features, this.environment);
    }
}
const configManager = new ConfigManager();
const getConfig = () => configManager.getConfig();
exports.getConfig = getConfig;
const getFeatureFlags = () => configManager.getFeatureFlags();
exports.getFeatureFlags = getFeatureFlags;
