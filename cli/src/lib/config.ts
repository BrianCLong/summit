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

const SwitchboardConfigSchema = z.object({
  tenantId: z.string().optional(),
  registryPath: z.string().optional(),
  policyPath: z.string().optional(),
  secretsNamespace: z.string().optional(),
});

const ProfileSchema = z.object({
  neo4j: Neo4jConfigSchema.optional(),
  postgres: PostgresConfigSchema.optional(),
  agent: AgentConfigSchema.optional(),
  export: ExportConfigSchema.optional(),
  switchboard: SwitchboardConfigSchema.optional(),
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
export type SwitchboardConfig = z.infer<typeof SwitchboardConfigSchema>;
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
        switchboard: {
          tenantId: 'default',
          registryPath: '.switchboard/registry',
          policyPath: 'policies',
          secretsNamespace: 'default',
        },
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

  return configStore.store;
}

function mergeProfileWithEnv(profile: Profile): Profile {
  const merged = JSON.parse(JSON.stringify(profile)) as Profile;

  // Neo4j from environment
  if (process.env.NEO4J_URI || process.env.NEO4J_USER || process.env.NEO4J_PASSWORD) {
    merged.neo4j = {
      ...(merged.neo4j || {}),
      uri: process.env.NEO4J_URI || merged.neo4j?.uri || DEFAULT_NEO4J_URI,
      user: process.env.NEO4J_USER || merged.neo4j?.user || DEFAULT_NEO4J_USER,
      password: process.env.NEO4J_PASSWORD || merged.neo4j?.password,
      database: process.env.NEO4J_DATABASE || merged.neo4j?.database || 'neo4j',
      encrypted: process.env.NEO4J_ENCRYPTED ? process.env.NEO4J_ENCRYPTED === 'true' : merged.neo4j?.encrypted || false,
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
      merged.postgres = {
        host: url.hostname,
        port: parseInt(url.port || '5432'),
        database: url.pathname.slice(1),
        user: url.username,
        password: url.password,
        ssl: url.searchParams.get('sslmode') === 'require',
      };
    } else {
      merged.postgres = {
        ...(merged.postgres || {}),
        host: process.env.PGHOST || merged.postgres?.host || DEFAULT_POSTGRES_HOST,
        port: parseInt(process.env.PGPORT || String(merged.postgres?.port || DEFAULT_POSTGRES_PORT)),
        database: process.env.PGDATABASE || merged.postgres?.database || DEFAULT_POSTGRES_DB,
        user: process.env.PGUSER || merged.postgres?.user,
        password: process.env.PGPASSWORD || merged.postgres?.password,
        ssl: process.env.PGSSLMODE ? process.env.PGSSLMODE === 'require' : merged.postgres?.ssl || false,
      };
    }
  }

  // Agent from environment
  if (process.env.AGENT_ENDPOINT || process.env.AGENT_API_KEY) {
    merged.agent = {
      ...(merged.agent || { timeout: 30000, maxConcurrent: 5 }),
      endpoint: process.env.AGENT_ENDPOINT || merged.agent?.endpoint,
      apiKey: process.env.AGENT_API_KEY || merged.agent?.apiKey,
      timeout: parseInt(process.env.AGENT_TIMEOUT || String(merged.agent?.timeout || 30000)),
      maxConcurrent: parseInt(process.env.AGENT_MAX_CONCURRENT || String(merged.agent?.maxConcurrent || 5)),
    };
  }

  // Switchboard from environment
  if (
    process.env.SWITCHBOARD_TENANT_ID ||
    process.env.SWITCHBOARD_REGISTRY_PATH ||
    process.env.SWITCHBOARD_POLICY_PATH ||
    process.env.SWITCHBOARD_SECRETS_NAMESPACE
  ) {
    merged.switchboard = {
      ...(merged.switchboard || {}),
      tenantId: process.env.SWITCHBOARD_TENANT_ID || merged.switchboard?.tenantId,
      registryPath: process.env.SWITCHBOARD_REGISTRY_PATH || merged.switchboard?.registryPath,
      policyPath: process.env.SWITCHBOARD_POLICY_PATH || merged.switchboard?.policyPath,
      secretsNamespace: process.env.SWITCHBOARD_SECRETS_NAMESPACE || merged.switchboard?.secretsNamespace,
    };
  }

  return merged;
}

export function getProfile(config: CLIConfig, profileName?: string): Profile {
  const name = profileName || config.defaultProfile;
  const profile = config.profiles[name] || config.profiles.default || {};
  return mergeProfileWithEnv(profile);
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
