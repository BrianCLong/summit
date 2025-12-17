/**
 * CLI Configuration Management
 */

import Conf from 'conf';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import yaml from 'yaml';
import {
  DEFAULT_NEO4J_URI,
  DEFAULT_NEO4J_USER,
  DEFAULT_POSTGRES_HOST,
  DEFAULT_POSTGRES_PORT,
  DEFAULT_POSTGRES_DB,
  CONFIG_FILE_NAME,
  CONFIG_DIR,
} from './constants.js';

const Neo4jConfigSchema = z.object({
  uri: z.string().default(DEFAULT_NEO4J_URI),
  user: z.string().default(DEFAULT_NEO4J_USER),
  password: z.string().optional(),
  database: z.string().default('neo4j'),
  encrypted: z.boolean().default(false),
});

const PostgresConfigSchema = z.object({
  host: z.string().default(DEFAULT_POSTGRES_HOST),
  port: z.number().default(DEFAULT_POSTGRES_PORT),
  database: z.string().default(DEFAULT_POSTGRES_DB),
  user: z.string().optional(),
  password: z.string().optional(),
  ssl: z.boolean().default(false),
});

const AgentConfigSchema = z.object({
  endpoint: z.string().optional(),
  apiKey: z.string().optional(),
  timeout: z.number().default(30000),
  maxConcurrent: z.number().default(5),
});

const ExportConfigSchema = z.object({
  outputDir: z.string().default('./exports'),
  compression: z.boolean().default(true),
  signExports: z.boolean().default(false),
  privateKeyPath: z.string().optional(),
});

const ProfileSchema = z.object({
  neo4j: Neo4jConfigSchema.optional(),
  postgres: PostgresConfigSchema.optional(),
  agent: AgentConfigSchema.optional(),
  export: ExportConfigSchema.optional(),
});

const CLIConfigSchema = z.object({
  defaultProfile: z.string().default('default'),
  profiles: z.record(z.string(), ProfileSchema).default({}),
  telemetry: z.boolean().default(false),
});

export type Neo4jConfig = z.infer<typeof Neo4jConfigSchema>;
export type PostgresConfig = z.infer<typeof PostgresConfigSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type ExportConfig = z.infer<typeof ExportConfigSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type CLIConfig = z.infer<typeof CLIConfigSchema>;

const configStore = new Conf<CLIConfig>({
  projectName: 'intelgraph-cli',
  defaults: {
    defaultProfile: 'default',
    profiles: {
      default: {
        neo4j: Neo4jConfigSchema.parse({}),
        postgres: PostgresConfigSchema.parse({}),
        agent: AgentConfigSchema.parse({}),
        export: ExportConfigSchema.parse({}),
      },
    },
    telemetry: false,
  },
});

export async function loadConfig(configPath?: string): Promise<CLIConfig> {
  // Priority: CLI arg > env var > local file > home dir > defaults
  const paths = [
    configPath,
    process.env.INTELGRAPH_CONFIG,
    path.join(process.cwd(), CONFIG_FILE_NAME),
    path.join(process.cwd(), `${CONFIG_FILE_NAME}.yaml`),
    path.join(process.cwd(), `${CONFIG_FILE_NAME}.yml`),
    path.join(os.homedir(), CONFIG_DIR, 'config.yaml'),
    path.join(os.homedir(), CONFIG_DIR, 'config.yml'),
    path.join(os.homedir(), CONFIG_FILE_NAME),
  ].filter(Boolean) as string[];

  for (const filePath of paths) {
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed = filePath.endsWith('.json')
          ? JSON.parse(content)
          : yaml.parse(content);
        return CLIConfigSchema.parse(parsed);
      } catch {
        // Continue to next path
      }
    }
  }

  // Load from environment variables
  const envConfig = loadEnvConfig();
  if (Object.keys(envConfig).length > 0) {
    const merged = mergeConfigs(configStore.store, envConfig);
    return CLIConfigSchema.parse(merged);
  }

  return configStore.store;
}

function loadEnvConfig(): Partial<CLIConfig> {
  const config: Partial<CLIConfig> = {
    profiles: {
      default: {},
    },
  };

  // Neo4j from environment
  if (process.env.NEO4J_URI || process.env.NEO4J_USER || process.env.NEO4J_PASSWORD) {
    config.profiles!.default.neo4j = {
      uri: process.env.NEO4J_URI || DEFAULT_NEO4J_URI,
      user: process.env.NEO4J_USER || DEFAULT_NEO4J_USER,
      password: process.env.NEO4J_PASSWORD,
      database: process.env.NEO4J_DATABASE || 'neo4j',
      encrypted: process.env.NEO4J_ENCRYPTED === 'true',
    };
  }

  // PostgreSQL from environment
  if (
    process.env.PGHOST ||
    process.env.PGUSER ||
    process.env.PGPASSWORD ||
    process.env.DATABASE_URL
  ) {
    if (process.env.DATABASE_URL) {
      const url = new URL(process.env.DATABASE_URL);
      config.profiles!.default.postgres = {
        host: url.hostname,
        port: parseInt(url.port || '5432'),
        database: url.pathname.slice(1),
        user: url.username,
        password: url.password,
        ssl: url.searchParams.get('sslmode') === 'require',
      };
    } else {
      config.profiles!.default.postgres = {
        host: process.env.PGHOST || DEFAULT_POSTGRES_HOST,
        port: parseInt(process.env.PGPORT || String(DEFAULT_POSTGRES_PORT)),
        database: process.env.PGDATABASE || DEFAULT_POSTGRES_DB,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        ssl: process.env.PGSSLMODE === 'require',
      };
    }
  }

  // Agent from environment
  if (process.env.AGENT_ENDPOINT || process.env.AGENT_API_KEY) {
    config.profiles!.default.agent = {
      endpoint: process.env.AGENT_ENDPOINT,
      apiKey: process.env.AGENT_API_KEY,
      timeout: parseInt(process.env.AGENT_TIMEOUT || '30000'),
      maxConcurrent: parseInt(process.env.AGENT_MAX_CONCURRENT || '5'),
    };
  }

  return config;
}

function mergeConfigs(base: CLIConfig, override: Partial<CLIConfig>): CLIConfig {
  return {
    ...base,
    ...override,
    profiles: {
      ...base.profiles,
      ...override.profiles,
    },
  };
}

export function getProfile(config: CLIConfig, profileName?: string): Profile {
  const name = profileName || config.defaultProfile;
  return config.profiles[name] || config.profiles.default || {};
}

export function saveConfig(config: CLIConfig): void {
  configStore.set(config);
}

export function setProfileValue(
  profileName: string,
  key: string,
  value: unknown
): void {
  const profiles = configStore.get('profiles') || {};
  const profile = profiles[profileName] || {};

  const keys = key.split('.');
  let current: Record<string, unknown> = profile;

  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in current)) {
      current[keys[i]] = {};
    }
    current = current[keys[i]] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
  profiles[profileName] = profile;
  configStore.set('profiles', profiles);
}

export function getConfigPath(): string {
  return configStore.path;
}
