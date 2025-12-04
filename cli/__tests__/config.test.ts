/**
 * Config Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
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
  });
});
