import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { SchemaValidator } from '../lib/config/schema-validator';
import { MigrationEngine, MigrationError } from '../lib/config/migration-engine';
import { ConfigWatcher } from '../lib/config/config-watcher';
import { SecretManager } from '../lib/secrets/secret-manager';
import { FeatureFlagService } from '../lib/config/feature-flags';

const TEST_CONFIG_DIR = path.join(__dirname, 'test_config');
const SCHEMA_DIR = path.join(__dirname, '../../config/schemas');

describe('Configuration System', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_CONFIG_DIR)) {
      fs.rmSync(TEST_CONFIG_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_CONFIG_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(SCHEMA_DIR, 'test.schema.json'),
      JSON.stringify({
        type: 'object',
        properties: {
          version: { type: 'integer' },
          foo: { type: 'string' },
          bar: { type: 'string' },
          secret: { type: 'string' },
          encrypted: { type: 'string' },
        },
        required: ['version', 'foo'],
      }),
    );
  });

  afterAll(() => {
    fs.rmSync(TEST_CONFIG_DIR, { recursive: true, force: true });
    fs.unlinkSync(path.join(SCHEMA_DIR, 'test.schema.json'));
  });

  describe('SchemaValidator', () => {
    it('rejects an invalid config', () => {
      const validator = new SchemaValidator();
      const invalidConfig = { version: 1, bar: 'baz' };
      expect(() => validator.validate(invalidConfig, 'test')).toThrow();
    });

    it('accepts and returns a valid config', () => {
      const validator = new SchemaValidator();
      const validConfig = { version: 1, foo: 'bar' };
      const resolved = validator.validate(validConfig, 'test');
      expect(resolved.foo).toBe('bar');
    });

    it('resolves environment and encrypted secrets', () => {
      process.env.TEST_SECRET_VALUE = 'resolved-from-env';
      process.env.CONFIG_ENCRYPTION_KEY = 'rotate-me';
      const encrypted = SecretManager.encrypt('cipher-text', 'rotate-me');
      const validator = new SchemaValidator();
      const configWithSecret = {
        version: 1,
        foo: 'bar',
        secret: 'env://TEST_SECRET_VALUE',
        encrypted,
      };
      const resolved = validator.validate(configWithSecret, 'test');
      expect(resolved.secret).toBe('resolved-from-env');
      expect(resolved.encrypted).toBe('cipher-text');
      delete process.env.TEST_SECRET_VALUE;
      delete process.env.CONFIG_ENCRYPTION_KEY;
    });
  });

  describe('MigrationEngine', () => {
    it('applies a migration and tracks history', () => {
      const MIGRATIONS_DIR = path.join(TEST_CONFIG_DIR, 'migrations_history');
      const HISTORY_FILE = path.join(MIGRATIONS_DIR, '.history.json');
      fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
      fs.writeFileSync(
        path.join(MIGRATIONS_DIR, '1.js'),
        `
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
      `,
      );

      const engine = new MigrationEngine(MIGRATIONS_DIR, HISTORY_FILE);
      const oldConfig = { version: 0, foo: 'bar' };
      const newConfig = engine.migrate(oldConfig);
      expect(newConfig.version).toBe(1);
      expect(newConfig.bar).toBe('baz');

      const history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
      expect(history).toContain(1);
    });

    it('rolls back a failing migration and exposes the rolled-back config', () => {
      const MIGRATIONS_DIR = path.join(TEST_CONFIG_DIR, 'migrations_rollback');
      const HISTORY_FILE = path.join(MIGRATIONS_DIR, '.history.json');
      fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
      fs.writeFileSync(
        path.join(MIGRATIONS_DIR, '1.js'),
        `
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
      `,
      );
      fs.writeFileSync(
        path.join(MIGRATIONS_DIR, '2.js'),
        `
        module.exports = {
          up: () => {
            throw new Error('Migration failed');
          },
          down: (config) => {
            return config;
          }
        };
      `,
      );

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
    it('detects a config change', (done) => {
      const CONFIG_FILE = path.join(TEST_CONFIG_DIR, 'watch_config.yaml');
      const initialConfig = { version: 1, foo: 'bar' };
      fs.writeFileSync(CONFIG_FILE, yaml.dump(initialConfig));
      const validator = new SchemaValidator();

      const watcher = new ConfigWatcher(CONFIG_FILE, 'test', validator, (newConfig) => {
        expect((newConfig as any).foo).toBe('baz');
        watcher.stop();
        done();
      });

      setTimeout(() => {
        const updatedConfig = { version: 1, foo: 'baz' };
        fs.writeFileSync(CONFIG_FILE, yaml.dump(updatedConfig));
      }, 100);
    });
  });

  describe('FeatureFlagService', () => {
    it('respects environment overrides and rollout defaults', () => {
      const config = {
        flags: {
          stableFeature: {
            enabled: true,
            environments: { production: false, development: true },
            rolloutPercentage: 100,
          },
          gatedFeature: {
            enabled: true,
            rolloutPercentage: 0,
          },
        },
      };

      const prodFlags = new FeatureFlagService(config, 'production');
      const devFlags = new FeatureFlagService(config, 'development');

      expect(prodFlags.isEnabled('stableFeature')).toBe(false);
      expect(devFlags.isEnabled('stableFeature', { userId: 'user-a' })).toBe(true);
      expect(devFlags.isEnabled('gatedFeature', { userId: 'user-b' })).toBe(false);
    });
  });
});
