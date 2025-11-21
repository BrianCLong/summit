import { z } from 'zod';
import 'dotenv/config';
import { secretsManager } from './SecretsManager.js';

// --- Feature Flag Types ---

export type TargetingRuleOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'in'
  | 'not_in'
  | 'percentage_rollout';

export interface TargetingRule {
  attribute: string;
  operator: TargetingRuleOperator;
  value: any;
  percentage?: number; // 0-100 for percentage_rollout
}

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description?: string;
  rules?: TargetingRule[];
}

// --- Configuration Schema ---

const EnvironmentSchema = z.enum(['development', 'test', 'production', 'staging']);

const DatabaseConfigSchema = z.object({
  url: z.string().min(1, "Database URL is required"),
  host: z.string().optional(),
  port: z.coerce.number().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  database: z.string().optional(),
});

const RedisConfigSchema = z.object({
  host: z.string().default('localhost'),
  port: z.coerce.number().default(6379),
  password: z.string().optional(),
  db: z.coerce.number().default(0),
});

const Neo4jConfigSchema = z.object({
  uri: z.string().min(1, "Neo4j URI is required"),
  username: z.string().min(1, "Neo4j username is required"),
  password: z.string().min(1, "Neo4j password is required"),
  database: z.string().default('neo4j'),
});

const AuthConfigSchema = z.object({
  jwtSecret: z.string().min(32, "JWT secret must be at least 32 characters"),
  jwtExpiresIn: z.string().default('24h'),
  refreshSecret: z.string().min(32, "Refresh secret must be at least 32 characters"),
  refreshExpiresIn: z.string().default('7d'),
  bcryptRounds: z.coerce.number().default(12),
});

const AppConfigSchema = z.object({
  env: EnvironmentSchema.default('development'),
  port: z.coerce.number().default(4000),
  corsOrigin: z.string().default('http://localhost:3000'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  requireRealDbs: z.boolean().default(false),
});

const FeaturesSchema = z.record(z.string(), z.boolean());

export const ConfigSchema = z.object({
  app: AppConfigSchema,
  postgres: DatabaseConfigSchema,
  redis: RedisConfigSchema,
  neo4j: Neo4jConfigSchema,
  auth: AuthConfigSchema,
  features: FeaturesSchema,
});

// Manually define types since zod version is behaving weirdly
export type Config = {
  app: {
    env: "development" | "test" | "production" | "staging";
    port: number;
    corsOrigin: string;
    logLevel: "debug" | "info" | "warn" | "error";
    requireRealDbs: boolean;
  };
  postgres: {
    url: string;
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    database?: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  neo4j: {
    uri: string;
    username: string;
    password: string;
    database: string;
  };
  auth: {
    jwtSecret: string;
    jwtExpiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
    bcryptRounds: number;
  };
  features: Record<string, boolean>;
};

// --- Config Service ---

export class ConfigService {
  private static instance: ConfigService;
  private config: Config;
  private featureFlags: Map<string, FeatureFlag>;
  private featureOverrides: Map<string, boolean>; // For runtime overrides

  private constructor() {
    this.featureFlags = new Map();
    this.featureOverrides = new Map();
    this.config = this.loadConfig();
    this.validateProductionReadiness();
    this.initializeDefaultFlags();
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  private loadConfig(): Config {
    const env = process.env;

    const rawConfig = {
      app: {
        env: env.NODE_ENV,
        port: env.PORT,
        corsOrigin: env.CORS_ORIGIN,
        logLevel: env.LOG_LEVEL,
        requireRealDbs: env.REQUIRE_REAL_DBS === 'true',
      },
      postgres: {
        url: env.DATABASE_URL || `postgres://${env.POSTGRES_USER || 'intelgraph'}:${env.POSTGRES_PASSWORD || 'devpassword'}@${env.POSTGRES_HOST || 'localhost'}:${env.POSTGRES_PORT || 5432}/${env.POSTGRES_DB || 'intelgraph_dev'}`,
        host: env.POSTGRES_HOST,
        port: env.POSTGRES_PORT,
        username: env.POSTGRES_USER,
        password: env.POSTGRES_PASSWORD,
        database: env.POSTGRES_DB,
      },
      redis: {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        password: env.REDIS_PASSWORD,
        db: env.REDIS_DB,
      },
      neo4j: {
        uri: env.NEO4J_URI || 'bolt://localhost:7687',
        username: env.NEO4J_USERNAME || 'neo4j',
        password: env.NEO4J_PASSWORD || 'devpassword',
        database: env.NEO4J_DATABASE,
      },
      auth: {
        jwtSecret: env.JWT_SECRET || 'dev_jwt_secret_12345_must_be_long_enough',
        jwtExpiresIn: env.JWT_EXPIRES_IN,
        refreshSecret: env.JWT_REFRESH_SECRET || 'dev_refresh_secret_67890_must_be_long_enough',
        refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
        bcryptRounds: env.BCRYPT_ROUNDS,
      },
      features: {
        // Initial feature flags from env
        GRAPH_EXPAND_CACHE: env.GRAPH_EXPAND_CACHE !== '0',
        AI_REQUEST_ENABLED: env.AI_REQUEST_ENABLED !== '0',
        RBAC_FINE_GRAINED: env.FEATURE_RBAC_FINE_GRAINED !== 'false',
        AUDIT_TRAIL: env.FEATURE_AUDIT_TRAIL !== 'false',
        COPILOT_SERVICE: env.FEATURE_COPILOT_SERVICE !== 'false',
        ANALYTICS_PANEL: env.FEATURE_ANALYTICS_PANEL !== 'false',
        PDF_EXPORT: env.FEATURE_PDF_EXPORT !== 'false',
        OPENTELEMETRY: env.FEATURE_OPENTELEMETRY !== 'false',
      },
    };

    const parsed = ConfigSchema.safeParse(rawConfig);

    if (!parsed.success) {
      console.error('❌ Invalid configuration:', JSON.stringify(parsed.error.format(), null, 2));
      process.exit(1);
    }

    return parsed.data as Config;
  }

  private validateProductionReadiness() {
    if (this.config.app.env === 'production') {
      const insecureTokens = ['devpassword', 'changeme', 'secret', 'localhost'];
      const fail = (key: string, reason: string) => {
        console.error(`[STARTUP] ${key} is not production safe: ${reason}`);
        process.exit(1);
      };

      const guardSecret = (key: string, value: string) => {
        const normalized = value.toLowerCase();
        if (value.length < 32) {
          fail(key, 'value too short (need >= 32 chars)');
        }
        const hit = insecureTokens.find((token) => normalized.includes(token));
        if (hit) {
          fail(key, `contains insecure token (${hit})`);
        }
      };

      guardSecret('JWT_SECRET', this.config.auth.jwtSecret);
      guardSecret('JWT_REFRESH_SECRET', this.config.auth.refreshSecret);

      const corsOrigins = this.config.app.corsOrigin.split(',').map((origin) => origin.trim());
      if (
        corsOrigins.length === 0 ||
        corsOrigins.some(
          (origin) =>
            origin === '*' ||
            origin.startsWith('http://') ||
            origin.includes('localhost'),
        )
      ) {
        fail('CORS_ORIGIN', 'must list explicit https origins');
      }

      const dbSecrets = [
        ['DATABASE_URL', this.config.postgres.url],
        ['NEO4J_PASSWORD', this.config.neo4j.password],
        ['REDIS_PASSWORD', this.config.redis.password],
      ] as const;

      dbSecrets.forEach(([key, value]) => {
        if (!value) {
          fail(key, 'missing value');
        }
        const normalized = value!.toLowerCase();
        if (
          normalized.includes('localhost') ||
          normalized.includes('devpassword')
        ) {
          fail(key, 'contains localhost/devpassword; set a production secret');
        }
      });
    }
  }

  private initializeDefaultFlags() {
    // Initialize flags based on MVP1 features and Agent features
    // This could be loaded from a database or file later
    const defaultFlags: FeatureFlag[] = [
      { key: 'GRAPH_EXPAND_CACHE', enabled: !!this.config.features.GRAPH_EXPAND_CACHE, description: 'Cache graph expansions' },
      { key: 'AI_REQUEST_ENABLED', enabled: !!this.config.features.AI_REQUEST_ENABLED, description: 'Enable AI requests' },
      { key: 'RBAC_FINE_GRAINED', enabled: !!this.config.features.RBAC_FINE_GRAINED, description: 'Fine-grained RBAC' },
      { key: 'AUDIT_TRAIL', enabled: !!this.config.features.AUDIT_TRAIL, description: 'Audit logging' },
      { key: 'COPILOT_SERVICE', enabled: !!this.config.features.COPILOT_SERVICE, description: 'AI Copilot' },
      { key: 'ANALYTICS_PANEL', enabled: !!this.config.features.ANALYTICS_PANEL, description: 'Analytics Dashboard' },
      { key: 'PDF_EXPORT', enabled: !!this.config.features.PDF_EXPORT, description: 'PDF Export functionality' },
      { key: 'OPENTELEMETRY', enabled: !!this.config.features.OPENTELEMETRY, description: 'OpenTelemetry Tracing' },
      // Agent flags
      { key: 'AGENT_SINGLAUB', enabled: true, description: 'Agent Singlaub' },
      { key: 'AGENT_LEMAY', enabled: true, description: 'Agent Lemay' },
      { key: 'AGENT_ANGLETON', enabled: true, description: 'Agent Angleton' },
      { key: 'AGENT_BUDANOV', enabled: true, description: 'Agent Budanov' },
      { key: 'AGENT_WOLF', enabled: true, description: 'Agent Wolf' },
      { key: 'AGENT_HAREL', enabled: true, description: 'Agent Harel' },
      { key: 'AGENT_GEHLEN', enabled: true, description: 'Agent Gehlen' },
    ];

    defaultFlags.forEach(flag => {
      // Check for env override
      const envKey = `FEATURE_${flag.key}`;
      if (process.env[envKey] !== undefined) {
        flag.enabled = process.env[envKey]!.toLowerCase() === 'true';
      }
      this.featureFlags.set(flag.key, flag);
    });
  }

  // --- Public API ---

  public get<K extends keyof Config>(key: K): Config[K] {
    return this.config[key];
  }

  public async getSecret(key: string): Promise<string | undefined> {
      return secretsManager.getSecret(key);
  }

  public isFeatureEnabled(key: string, context?: Record<string, any>): boolean {
    // 1. Check runtime overrides first
    if (this.featureOverrides.has(key)) {
      return this.featureOverrides.get(key)!;
    }

    // 2. Check registered flags
    const flag = this.featureFlags.get(key);
    if (!flag) {
      // Default to false if unknown, or maybe check config.features generic bag
      // For backward compatibility with strict `features` object in config
      if (key in this.config.features) {
        return !!this.config.features[key as keyof typeof this.config.features];
      }
      return false;
    }

    // 3. Evaluate rules if any
    if (flag.rules && flag.rules.length > 0 && context) {
      for (const rule of flag.rules) {
        if (this.evaluateRule(rule, context)) {
            // If a rule matches, it enables the feature (or we could have rule-specific outcomes)
            // For this simple implementation, rule match = enabled.
            // But wait, rules usually define *when* it is enabled.
            // If the flag is globally disabled, rules might not matter, or rules might override.
            // Standard practice: If global is false, rules can enable it for specific targets.
            // If global is true, rules might restrict it?
            // Let's assume: Flag Global Enabled determines baseline.
            // Actually, usually:
            // If disabled, returns false (unless rule overrides?)
            // Usually rules are "Enable for X".
            return true;
        }
      }
      // If rules exist but none match, fall back to global enabled state?
      // Or does having rules imply it's restricted?
      // Let's go with: If rules exist, ONLY those matching rules get it, PLUS the global enabled state.
      // Actually, let's stick to a simpler model:
      // If flag.enabled is true -> everyone gets it.
      // If flag.enabled is false -> check rules.

      if (flag.enabled) return true;
      return false;
    }

    return flag.enabled;
  }

  private evaluateRule(rule: TargetingRule, context: Record<string, any>): boolean {
    const { attribute, operator, value, percentage } = rule;
    const contextValue = context[attribute];

    switch (operator) {
      case 'equals':
        return contextValue === value;
      case 'not_equals':
        return contextValue !== value;
      case 'contains':
        return Array.isArray(contextValue) && contextValue.includes(value) || String(contextValue).includes(value);
      case 'not_contains':
        return !String(contextValue).includes(value);
      case 'in':
        return Array.isArray(value) && value.includes(contextValue);
      case 'not_in':
        return Array.isArray(value) && !value.includes(contextValue);
      case 'percentage_rollout':
        // Simple deterministic hashing for percentage rollout based on attribute (e.g. user_id)
        if (!percentage) return false;
        if (!contextValue) return false; // Need a seed
        const hash = this.simpleHash(String(contextValue));
        return (hash % 100) < percentage;
      default:
        return false;
    }
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  public setFeatureFlag(key: string, enabled: boolean) {
    const flag = this.featureFlags.get(key);
    if (flag) {
      flag.enabled = enabled;
    } else {
      this.featureFlags.set(key, { key, enabled });
    }
  }

  public addTargetingRule(key: string, rule: TargetingRule) {
      const flag = this.featureFlags.get(key);
      if (flag) {
          if (!flag.rules) flag.rules = [];
          flag.rules.push(rule);
      }
  }

  public getAllFlags(): Record<string, boolean> {
    const flags: Record<string, boolean> = {};
    this.featureFlags.forEach((value, key) => {
      flags[key] = value.enabled;
    });
    return flags;
  }
}

export const configService = ConfigService.getInstance();
