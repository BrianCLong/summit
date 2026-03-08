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
const globals_1 = require("@jest/globals");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const schema_validator_js_1 = require("../lib/config/schema-validator.js");
const migration_engine_js_1 = require("../lib/config/migration-engine.js");
const config_watcher_js_1 = require("../lib/config/config-watcher.js");
const yaml = __importStar(require("js-yaml"));
// Use process.cwd() since tests run from server directory
const TEST_CONFIG_DIR = path.join(process.cwd(), 'tests/test_config');
const SCHEMA_DIR = path.join(process.cwd(), 'config/schema');
(0, globals_1.describe)('Configuration System', () => {
    (0, globals_1.beforeEach)(() => {
        if (fs.existsSync(TEST_CONFIG_DIR)) {
            fs.rmSync(TEST_CONFIG_DIR, { recursive: true, force: true });
        }
        fs.mkdirSync(TEST_CONFIG_DIR, { recursive: true });
        fs.mkdirSync(SCHEMA_DIR, { recursive: true });
        // Create a dummy schema for testing
        fs.writeFileSync(path.join(SCHEMA_DIR, 'test.schema.json'), JSON.stringify({
            type: 'object',
            properties: {
                version: { type: 'integer' },
                foo: { type: 'string' },
                bar: { type: 'string' },
                secret: { type: 'string' }
            },
            required: ['version', 'foo']
        }));
    });
    (0, globals_1.afterAll)(() => {
        fs.rmSync(TEST_CONFIG_DIR, { recursive: true, force: true });
        fs.unlinkSync(path.join(SCHEMA_DIR, 'test.schema.json'));
    });
    (0, globals_1.describe)('SchemaValidator', () => {
        (0, globals_1.it)('should reject an invalid config', () => {
            const validator = new schema_validator_js_1.SchemaValidator();
            const invalidConfig = { version: 1, bar: 'baz' }; // Missing 'foo'
            (0, globals_1.expect)(() => validator.validate(invalidConfig, 'test')).toThrow();
        });
        (0, globals_1.it)('should accept a valid config', () => {
            const validator = new schema_validator_js_1.SchemaValidator();
            const validConfig = { version: 1, foo: 'bar' };
            (0, globals_1.expect)(() => validator.validate(validConfig, 'test')).not.toThrow();
        });
        (0, globals_1.it)('should resolve secrets', () => {
            const validator = new schema_validator_js_1.SchemaValidator();
            const configWithSecret = { version: 1, foo: 'bar', secret: 'aws-ssm:/path/to/secret' };
            // A bit of a hack to test the private method
            const resolvedConfig = validator.resolveSecrets(configWithSecret);
            (0, globals_1.expect)(resolvedConfig.secret).toBe('resolved-secret');
        });
    });
    (0, globals_1.describe)('MigrationEngine', () => {
        (0, globals_1.it)('should apply a migration and track history', () => {
            const MIGRATIONS_DIR = path.join(TEST_CONFIG_DIR, 'migrations_history');
            const HISTORY_FILE = path.join(MIGRATIONS_DIR, '.history.json');
            fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
            fs.writeFileSync(path.join(MIGRATIONS_DIR, '1.js'), `
        module.exports = {
          up: (config) => {
            config.bar = 'baz';
            return config;
          },
          down: (config) => {
            delete config.bar;
            return config;
          }
        };
      `);
            const engine = new migration_engine_js_1.MigrationEngine(MIGRATIONS_DIR, HISTORY_FILE);
            const oldConfig = { version: 0, foo: 'bar' };
            const newConfig = engine.migrate(oldConfig);
            (0, globals_1.expect)(newConfig.version).toBe(1);
            (0, globals_1.expect)(newConfig.bar).toBe('baz');
            const history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
            (0, globals_1.expect)(history).toContain(1);
        });
        (0, globals_1.it)('should roll back a failing migration and expose the rolled-back config', () => {
            const MIGRATIONS_DIR = path.join(TEST_CONFIG_DIR, 'migrations_rollback');
            const HISTORY_FILE = path.join(MIGRATIONS_DIR, '.history.json');
            fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
            fs.writeFileSync(path.join(MIGRATIONS_DIR, '1.js'), `
        module.exports = {
          up: (config) => {
            config.bar = 'baz'; // This should be rolled back
            return config;
          },
          down: (config) => {
            delete config.bar;
            return config;
          }
        };
      `);
            fs.writeFileSync(path.join(MIGRATIONS_DIR, '2.js'), `
        module.exports = {
          up: (config) => {
            throw new Error('Migration failed');
          },
          down: (config) => {
            return config;
          }
        };
      `);
            const engine = new migration_engine_js_1.MigrationEngine(MIGRATIONS_DIR, HISTORY_FILE);
            const oldConfig = { version: 0, foo: 'bar' };
            try {
                engine.migrate(oldConfig);
            }
            catch (error) {
                (0, globals_1.expect)(error).toBeInstanceOf(migration_engine_js_1.MigrationError);
                const migrationError = error;
                (0, globals_1.expect)(migrationError.rolledBackConfig.bar).toBeUndefined();
                (0, globals_1.expect)(migrationError.rolledBackConfig.version).toBe(0);
            }
        });
    });
    (0, globals_1.describe)('ConfigWatcher', () => {
        (0, globals_1.it)('should detect a config change', async () => {
            const CONFIG_FILE = path.join(TEST_CONFIG_DIR, 'watch_config.yaml');
            const initialConfig = { version: 1, foo: 'bar' };
            fs.writeFileSync(CONFIG_FILE, yaml.dump(initialConfig));
            const validator = new schema_validator_js_1.SchemaValidator();
            let watcher;
            try {
                await new Promise((resolve, reject) => {
                    watcher = new config_watcher_js_1.ConfigWatcher(CONFIG_FILE, 'test', validator, (newConfig) => {
                        try {
                            (0, globals_1.expect)(newConfig.foo).toBe('baz');
                            resolve();
                        }
                        catch (error) {
                            reject(error);
                        }
                    });
                    setImmediate(() => {
                        const updatedConfig = { version: 1, foo: 'baz' };
                        fs.writeFileSync(CONFIG_FILE, yaml.dump(updatedConfig));
                    });
                });
            }
            finally {
                watcher?.stop();
            }
        }, 1000); // Added a reasonable timeout for the async test
    });
});
