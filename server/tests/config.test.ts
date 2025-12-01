import * as fs from 'fs';
import * as path from 'path';
import { SchemaValidator } from '../lib/config/schema-validator';
import { MigrationEngine, MigrationError } from '../lib/config/migration-engine';
import { ConfigWatcher } from '../lib/config/config-watcher';
import * as yaml from 'js-yaml';

const TEST_CONFIG_DIR = path.join(__dirname, 'test_config');
const SCHEMA_DIR = path.join(__dirname, '../../config/schemas');

describe('Configuration System', () => {

  beforeEach(() => {
    if (fs.existsSync(TEST_CONFIG_DIR)) {
        fs.rmSync(TEST_CONFIG_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_CONFIG_DIR, { recursive: true });
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

  afterAll(() => {
    fs.rmSync(TEST_CONFIG_DIR, { recursive: true, force: true });
    fs.unlinkSync(path.join(SCHEMA_DIR, 'test.schema.json'));
  });

  describe('SchemaValidator', () => {
    it('should reject an invalid config', () => {
      const validator = new SchemaValidator();
      const invalidConfig = { version: 1, bar: 'baz' }; // Missing 'foo'
      expect(() => validator.validate(invalidConfig, 'test')).toThrow();
    });

    it('should accept a valid config', () => {
      const validator = new SchemaValidator();
      const validConfig = { version: 1, foo: 'bar' };
      expect(() => validator.validate(validConfig, 'test')).not.toThrow();
    });

    it('should resolve secrets', () => {
      const validator = new SchemaValidator();
      const configWithSecret = { version: 1, foo: 'bar', secret: 'aws-ssm:/path/to/secret' };
      // A bit of a hack to test the private method
      const resolvedConfig = (validator as any).resolveSecrets(configWithSecret);
      expect(resolvedConfig.secret).toBe('resolved-secret');
    });
  });

  describe('MigrationEngine', () => {
    it('should apply a migration and track history', () => {
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

      const engine = new MigrationEngine(MIGRATIONS_DIR, HISTORY_FILE);
      const oldConfig = { version: 0, foo: 'bar' };
      const newConfig = engine.migrate(oldConfig);
      expect(newConfig.version).toBe(1);
      expect(newConfig.bar).toBe('baz');

      const history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
      expect(history).toContain(1);
    });

    it('should roll back a failing migration and expose the rolled-back config', () => {
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

      const engine = new MigrationEngine(MIGRATIONS_DIR, HISTORY_FILE);
      const oldConfig = { version: 0, foo: 'bar' };

      try {
        engine.migrate(oldConfig);
      } catch (error) {
        expect(error).toBeInstanceOf(MigrationError);
        const migrationError = error as MigrationError;
        expect(migrationError.rolledBackConfig.bar).toBeUndefined();
        expect(migrationError.rolledBackConfig.version).toBe(0);
      }
    });
  });

  describe('ConfigWatcher', () => {
    it('should detect a config change', (done) => {
      const CONFIG_FILE = path.join(TEST_CONFIG_DIR, 'watch_config.yaml');
      const initialConfig = { version: 1, foo: 'bar' };
      fs.writeFileSync(CONFIG_FILE, yaml.dump(initialConfig));
      const validator = new SchemaValidator();

      const watcher = new ConfigWatcher(CONFIG_FILE, 'test', validator, (newConfig) => {
        expect(newConfig.foo).toBe('baz');
        watcher.stop();
        done();
      });

      // Simulate a change
      setTimeout(() => {
        const updatedConfig = { version: 1, foo: 'baz' };
        fs.writeFileSync(CONFIG_FILE, yaml.dump(updatedConfig));
      }, 100);
    });
  });
});
