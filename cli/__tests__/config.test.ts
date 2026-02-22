/**
 * Config Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Mock conf module (ESM-only package)
const mockStore = new Map<string, unknown>();
jest.mock('conf', () => {
  return {
    __esModule: true,
    default: class MockConf<T extends object> {
      private defaults: T;
      constructor(options: { projectName: string; defaults: T }) {
        this.defaults = options.defaults;
        mockStore.set('config', this.defaults);
      }
      get store(): T {
        return (mockStore.get('config') as T) ?? this.defaults;
      }
      set store(val: T) {
        mockStore.set('config', val);
      }
      get<K extends keyof T>(key: K): T[K] {
        return (this.store as T)[key];
      }
      set<K extends keyof T>(key: K, val: T[K]): void {
        const current = this.store;
        (current as T)[key] = val;
        mockStore.set('config', current);
      }
    },
  };
});

import { loadConfig, getProfile, type CLIConfig } from '../src/lib/config.js';

describe('Config', () => {
  let testDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-config-test-'));
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    it('should load default config when no file exists', async () => {
      const config = await loadConfig();

      expect(config).toHaveProperty('defaultProfile');
      expect(config).toHaveProperty('profiles');
      expect(config.profiles).toHaveProperty('default');
    });

    it('should load config from environment variables', async () => {
      process.env.NEO4J_URI = 'bolt://test:7687';
      process.env.NEO4J_USER = 'testuser';
      process.env.NEO4J_PASSWORD = 'testpass';

      const config = await loadConfig();
      const profile = getProfile(config);

      expect(profile.neo4j?.uri).toBe('bolt://test:7687');
      expect(profile.neo4j?.user).toBe('testuser');
      expect(profile.neo4j?.password).toBe('testpass');
    });

    it('should load config from DATABASE_URL', async () => {
      process.env.DATABASE_URL = 'postgres://user:pass@host:5433/dbname?sslmode=require';

      const config = await loadConfig();
      const profile = getProfile(config);

      expect(profile.postgres?.host).toBe('host');
      expect(profile.postgres?.port).toBe(5433);
      expect(profile.postgres?.database).toBe('dbname');
      expect(profile.postgres?.user).toBe('user');
      expect(profile.postgres?.password).toBe('pass');
      expect(profile.postgres?.ssl).toBe(true);
    });

    it('should load Switchboard config from environment variables', async () => {
      process.env.SWITCHBOARD_TENANT_ID = 'test-tenant';
      process.env.SWITCHBOARD_REGISTRY_PATH = '/tmp/registry';

      const config = await loadConfig();
      const profile = getProfile(config);

      expect(profile.switchboard?.tenantId).toBe('test-tenant');
      expect(profile.switchboard?.registryPath).toBe('/tmp/registry');
    });
  });

  describe('getProfile', () => {
    it('should return default profile when no name specified', () => {
      const config: CLIConfig = {
        defaultProfile: 'default',
        profiles: {
          default: {
            neo4j: {
              uri: 'bolt://localhost:7687',
              user: 'neo4j',
              database: 'neo4j',
              encrypted: false,
            },
          },
        },
        telemetry: false,
      };

      const profile = getProfile(config);

      expect(profile.neo4j?.uri).toBe('bolt://localhost:7687');
    });

    it('should return named profile', () => {
      const config: CLIConfig = {
        defaultProfile: 'default',
        profiles: {
          default: {
            neo4j: {
              uri: 'bolt://localhost:7687',
              user: 'neo4j',
              database: 'neo4j',
              encrypted: false,
            },
          },
          production: {
            neo4j: {
              uri: 'bolt://prod:7687',
              user: 'admin',
              database: 'neo4j',
              encrypted: true,
            },
          },
        },
        telemetry: false,
      };

      const profile = getProfile(config, 'production');

      expect(profile.neo4j?.uri).toBe('bolt://prod:7687');
      expect(profile.neo4j?.encrypted).toBe(true);
    });

    it('should return empty object for non-existent profile', () => {
      const config: CLIConfig = {
        defaultProfile: 'default',
        profiles: {},
        telemetry: false,
      };

      const profile = getProfile(config, 'nonexistent');

      expect(profile).toEqual({});
    });

    it('should prefer environment variables over profile values', () => {
      const config: CLIConfig = {
        defaultProfile: 'default',
        profiles: {
          default: {
            switchboard: {
              tenantId: 'profile-tenant',
            },
          },
        },
        telemetry: false,
      };

      process.env.SWITCHBOARD_TENANT_ID = 'env-tenant';

      const profile = getProfile(config);

      expect(profile.switchboard?.tenantId).toBe('env-tenant');
    });
  });
});
