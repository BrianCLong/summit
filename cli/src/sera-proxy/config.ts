import * as path from 'path';
import { isIP } from 'net';

export interface SeraProxyConfig {
  endpoint: string;
  endpointHost: string;
  apiKey?: string;
  model?: string;
  port: number;
  allowHosts: string[];
  artifactDir: string;
  maxBodyBytes: number;
}

export interface SeraProxyConfigOverrides {
  endpoint?: string;
  apiKey?: string;
  model?: string;
  port?: number;
  allowHosts?: string[];
  artifactDir?: string;
  maxBodyBytes?: number;
}

const DEFAULT_ALLOW_HOSTS = ['localhost', '127.0.0.1'];
const DEFAULT_PORT = 18080;
const DEFAULT_MAX_BODY_BYTES = 2 * 1024 * 1024;

export function resolveSeraProxyConfig(
  overrides: SeraProxyConfigOverrides = {},
  env: NodeJS.ProcessEnv = process.env
): SeraProxyConfig {
  const endpoint = overrides.endpoint ?? env.SERA_ENDPOINT ?? '';
  if (!endpoint) {
    throw new Error('SERA endpoint is required (set --endpoint or SERA_ENDPOINT).');
  }

  const portRaw = overrides.port ?? parseInt(env.SERA_PORT ?? '', 10);
  const port = Number.isFinite(portRaw) ? portRaw : DEFAULT_PORT;

  const allowHosts =
    overrides.allowHosts && overrides.allowHosts.length > 0
      ? overrides.allowHosts
      : parseAllowHosts(env.SERA_ALLOW_HOSTS) ?? DEFAULT_ALLOW_HOSTS;

  const artifactDir =
    overrides.artifactDir ??
    env.SERA_ARTIFACT_DIR ??
    path.join(process.cwd(), 'artifacts', 'sera_proxy');

  const maxBodyBytesRaw = overrides.maxBodyBytes ?? parseInt(env.SERA_MAX_BODY_BYTES ?? '', 10);
  const maxBodyBytes = Number.isFinite(maxBodyBytesRaw) ? maxBodyBytesRaw : DEFAULT_MAX_BODY_BYTES;

  const host = validateEndpointHost(endpoint, allowHosts);

  return {
    endpoint,
    apiKey: overrides.apiKey ?? env.SERA_API_KEY ?? undefined,
    model: overrides.model ?? env.SERA_MODEL ?? undefined,
    port,
    allowHosts,
    artifactDir,
    maxBodyBytes,
    endpointHost: host,
  };
}

export function parseAllowHosts(raw?: string): string[] | undefined {
  if (!raw) return undefined;
  const values = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return values.length > 0 ? values : undefined;
}

export function validateEndpointHost(endpoint: string, allowHosts: string[]): string {
  const url = new URL(endpoint);
  const host = url.hostname.toLowerCase();
  const normalizedAllow = allowHosts.map((entry) => entry.toLowerCase());

  if (!normalizedAllow.includes(host)) {
    throw new Error(`SERA endpoint host "${host}" is not in the allowlist.`);
  }

  if (isIP(host) && isPrivateAddress(host) && !normalizedAllow.includes(host)) {
    throw new Error(`SERA endpoint host "${host}" is private and not explicitly allowed.`);
  }

  return host;
}

function isPrivateAddress(host: string): boolean {
  const ipVersion = isIP(host);
  if (ipVersion === 4) {
    const parts = host.split('.').map((part) => Number(part));
    if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;
    const [a, b] = parts;
    return (
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }

  if (ipVersion === 6) {
    const normalized = host.toLowerCase();
    return (
      normalized === '::1' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe80')
    );
  }

  return false;
}
