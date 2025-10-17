import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
  BaseErrorTrackingConfig,
  BrowserErrorTrackingConfig,
  NodeErrorTrackingConfig
} from './types';

interface EnvSource {
  [key: string]: string | undefined;
}

function parseNumber(value: string | undefined, fallback: number | undefined): number | undefined {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value: string | undefined, fallback: boolean | undefined): boolean | undefined {
  if (value === undefined) {
    return fallback;
  }
  if (value === '1' || value === 'true') {
    return true;
  }
  if (value === '0' || value === 'false') {
    return false;
  }
  return fallback;
}

function loadEnvFile(): EnvSource {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    return {};
  }
  const content = readFileSync(envPath, 'utf8');
  const envLines = content.split(/\r?\n/);
  const env: EnvSource = {};
  for (const line of envLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const [key, ...rest] = trimmed.split('=');
    if (!key) {
      continue;
    }
    env[key] = rest.join('=').replace(/^"|"$/g, '');
  }
  return env;
}

const cachedEnv = loadEnvFile();

function getEnv(key: string): string | undefined {
  return process.env[key] ?? cachedEnv[key];
}

export function resolveBaseConfig(overrides: Partial<BaseErrorTrackingConfig> = {}): BaseErrorTrackingConfig {
  const dsn = overrides.dsn ?? getEnv('SENTRY_DSN');
  if (!dsn) {
    throw new Error('SENTRY_DSN is required to initialize error tracking');
  }

  const environment = overrides.environment ?? getEnv('SENTRY_ENVIRONMENT') ?? 'development';

  return {
    dsn,
    environment,
    release: overrides.release ?? getEnv('SENTRY_RELEASE'),
    dist: overrides.dist ?? getEnv('SENTRY_DIST'),
    debug: overrides.debug ?? parseBoolean(getEnv('SENTRY_DEBUG'), false),
    enabled: overrides.enabled ?? parseBoolean(getEnv('SENTRY_ENABLED'), true),
    tracesSampleRate:
      overrides.tracesSampleRate ?? parseNumber(getEnv('SENTRY_TRACES_SAMPLE_RATE'), undefined),
    profilesSampleRate:
      overrides.profilesSampleRate ?? parseNumber(getEnv('SENTRY_PROFILES_SAMPLE_RATE'), undefined),
    sampleRate: overrides.sampleRate ?? parseNumber(getEnv('SENTRY_SAMPLE_RATE'), undefined),
    attachStacktrace:
      overrides.attachStacktrace ?? parseBoolean(getEnv('SENTRY_ATTACH_STACKTRACE'), undefined),
    normalizeDepth:
      overrides.normalizeDepth ?? parseNumber(getEnv('SENTRY_NORMALIZE_DEPTH'), undefined),
    integrations: overrides.integrations,
    sendClientReports:
      overrides.sendClientReports ?? parseBoolean(getEnv('SENTRY_SEND_CLIENT_REPORTS'), undefined)
  };
}

export function resolveNodeConfig(overrides: Partial<NodeErrorTrackingConfig> = {}): NodeErrorTrackingConfig {
  const base = resolveBaseConfig(overrides);
  return {
    ...base,
    serverName: overrides.serverName ?? getEnv('SENTRY_SERVER_NAME'),
    autoSessionTracking:
      overrides.autoSessionTracking ?? parseBoolean(getEnv('SENTRY_AUTO_SESSION_TRACKING'), true),
    enableTracing: overrides.enableTracing ?? parseBoolean(getEnv('SENTRY_ENABLE_TRACING'), true)
  };
}

export function resolveBrowserConfig(
  overrides: Partial<BrowserErrorTrackingConfig> = {}
): BrowserErrorTrackingConfig {
  const base = resolveBaseConfig(overrides);
  return {
    ...base,
    replaysSessionSampleRate:
      overrides.replaysSessionSampleRate ?? parseNumber(getEnv('SENTRY_REPLAYS_SESSION_SAMPLE_RATE'), 0),
    replaysOnErrorSampleRate:
      overrides.replaysOnErrorSampleRate ?? parseNumber(getEnv('SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE'), 1),
    enableTracing: overrides.enableTracing ?? parseBoolean(getEnv('SENTRY_ENABLE_TRACING'), true)
  };
}
