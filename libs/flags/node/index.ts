import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type FlagPrimitive = boolean | number | string;

export interface FlagContext {
  env: string;
  tenant?: string;
  userId?: string;
  userRole?: string;
  region?: string;
  canaryWeight?: number;
  prNumber?: string | number;
}

export interface FlagDefinition {
  key: string;
  type: "boolean" | "number" | "string";
  default: FlagPrimitive;
  kill_switch?: boolean;
}

interface FlagResolution {
  key: string;
  value: FlagPrimitive;
  source: string;
  etag?: string;
}

interface Provider {
  name: string;
  get(key: string, ctx: FlagContext): Promise<FlagResolution | null>;
}

class EnvProvider implements Provider {
  name = "env";
  async get(key: string, _ctx: FlagContext): Promise<FlagResolution | null> {
    const envKey = this.envKey(key);
    if (process.env[envKey] !== undefined) {
      const raw = process.env[envKey] as string;
      const value = this.parseValue(raw);
      return { key, value, source: this.name };
    }
    return null;
  }

  private envKey(key: string): string {
    return `FLAG_${key.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase()}`;
  }

  private parseValue(raw: string): FlagPrimitive {
    if (raw === "true" || raw === "false") return raw === "true";
    if (!Number.isNaN(Number(raw))) return Number(raw);
    return raw;
  }
}

class FileProvider implements Provider {
  name = "file";
  private cache: Record<string, { mtime: number; data: any }> = {};
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  async get(key: string, ctx: FlagContext): Promise<FlagResolution | null> {
    const filePath = path.join(this.baseDir, `${ctx.env}.yaml`);
    if (!fs.existsSync(filePath)) return null;
    const stat = fs.statSync(filePath);
    const cached = this.cache[filePath];
    if (!cached || cached.mtime < stat.mtimeMs) {
      const content = fs.readFileSync(filePath, "utf8");
      this.cache[filePath] = {
        mtime: stat.mtimeMs,
        data: safeLoadYaml(content),
      };
    }
    const targets = this.cache[filePath].data?.flags ?? {};
    const entry = targets[key];
    if (!entry) return null;

    if (entry.kill === true) {
      return { key, value: false, source: `${this.name}:kill` };
    }

    if (Array.isArray(entry.tenants?.deny) && ctx.tenant) {
      if (entry.tenants.deny.includes(ctx.tenant))
        return { key, value: false, source: `${this.name}:deny` };
    }

    if (Array.isArray(entry.tenants?.allow) && ctx.tenant) {
      if (entry.tenants.allow.includes(ctx.tenant))
        return { key, value: entry.value ?? true, source: `${this.name}:allow` };
    }

    if (typeof entry.percentage === "number" && entry.percentage >= 0) {
      const seed = ctx.tenant || ctx.userId || ctx.region || "global";
      const hash = percentageHash(seed, entry.salt || key);
      if (hash < entry.percentage) {
        return {
          key,
          value: entry.value ?? true,
          source: `${this.name}:percentage`,
        };
      }
      return { key, value: false, source: `${this.name}:percentage_off` };
    }

    if (entry.environments && !entry.environments.includes(ctx.env)) return null;

    if (typeof entry.value !== "undefined") return { key, value: entry.value, source: this.name };

    return null;
  }
}

class RemoteProvider implements Provider {
  name = "remote";
  private endpoint?: string;
  private etag?: string;
  private cached?: FlagResolution;

  constructor(endpoint?: string) {
    this.endpoint = endpoint;
  }

  async get(key: string, ctx: FlagContext): Promise<FlagResolution | null> {
    if (!this.endpoint) return null;
    const url = new URL("/flags/evaluate", this.endpoint);
    url.searchParams.set("key", key);
    url.searchParams.set("env", ctx.env);
    if (ctx.tenant) url.searchParams.set("tenant", ctx.tenant);
    if (ctx.userRole) url.searchParams.set("role", ctx.userRole);

    const headers: Record<string, string> = {};
    if (this.etag) headers["If-None-Match"] = this.etag;

    try {
      const res = await fetch(url, { headers });
      if (res.status === 304 && this.cached) {
        return this.cached;
      }
      if (!res.ok) return null;
      this.etag = res.headers.get("etag") ?? undefined;
      const data = (await res.json()) as { value: FlagPrimitive };
      this.cached = { key, value: data.value, source: this.name, etag: this.etag };
      return this.cached;
    } catch (err) {
      void err;
      return this.cached ?? null;
    }
  }
}

interface CacheEntry {
  value: FlagPrimitive;
  source: string;
  etag?: string;
  expiresAt: number;
}

function percentageHash(seed: string, salt: string): number {
  const digest = crypto.createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  const int = parseInt(digest.slice(0, 8), 16);
  return (int % 10000) / 100;
}

function safeLoadYaml(content: string): any {
  try {
    // Lazy load to avoid dependency for non-YAML consumers
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const yaml = require("js-yaml");
    return yaml.load(content);
  } catch (err) {
    try {
      return JSON.parse(content);
    } catch (jsonErr) {
      void jsonErr;
    }
    // Fallback to a minimal parser for simple YAML subsets
    const parsed = simpleYaml(content);
    if (parsed) return parsed;
    throw new Error(`Failed to parse flag targets: ${String(err)}`);
  }
}

function simpleYaml(content: string): Record<string, unknown> | null {
  const root: Record<string, unknown> = {};
  const stack: Array<{ indent: number; node: Record<string, unknown> }> = [
    { indent: 0, node: root },
  ];
  const parseVal = (raw: string): unknown => {
    if (raw === "true") return true;
    if (raw === "false") return false;
    if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
    if (raw.startsWith("[") && raw.endsWith("]")) {
      return raw
        .slice(1, -1)
        .split(",")
        .map((v) => parseVal(v.trim()))
        .filter((v) => v !== "");
    }
    if (raw.startsWith('"') && raw.endsWith('"')) return raw.slice(1, -1);
    return raw;
  };
  for (const line of content.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const indent = line.match(/^\s*/)![0].length;
    const [keyPart, ...rest] = line.trim().split(":");
    const valueRaw = rest.join(":").trim();
    while (stack.length && indent < stack[stack.length - 1].indent) stack.pop();
    const current = stack[stack.length - 1].node;
    if (!valueRaw) {
      const child: Record<string, unknown> = {};
      current[keyPart] = child;
      stack.push({ indent: indent + 2, node: child });
    } else {
      current[keyPart] = parseVal(valueRaw);
    }
  }
  return root;
}

export interface FlagSDKOptions {
  env: string;
  targetsDir?: string;
  remoteEndpoint?: string;
  cacheTtlMs?: number;
  catalogPath?: string;
}

export class FlagClient {
  private options: FlagSDKOptions;
  private providers: Provider[];
  private cache = new Map<string, CacheEntry>();
  private lastKnownGood = new Map<string, CacheEntry>();
  private catalog: Record<string, FlagDefinition> = {};

  constructor(options: FlagSDKOptions) {
    this.options = {
      cacheTtlMs: 60_000,
      targetsDir: path.join(process.cwd(), "flags/targets"),
      ...options,
    };
    this.providers = [
      new EnvProvider(),
      new FileProvider(this.options.targetsDir!),
      new RemoteProvider(this.options.remoteEndpoint),
    ];
    this.loadCatalog();
  }

  catalogKey<T extends string>(key: T): T {
    return key;
  }

  kill(key: string): void {
    this.cache.set(key, {
      value: false,
      source: "kill-switch",
      expiresAt: Date.now() + (this.options.cacheTtlMs ?? 60_000),
    });
  }

  async get<T extends FlagPrimitive>(
    key: string,
    defaultValue?: T,
    ctxOverrides?: Partial<FlagContext>
  ): Promise<T> {
    const ctx: FlagContext = { env: this.options.env, ...ctxOverrides } as FlagContext;
    const cached = this.fromCache(key);
    if (cached) return cached.value as T;

    for (const provider of this.providers) {
      const result = await provider.get(key, ctx);
      if (result) {
        this.toCache(result);
        return result.value as T;
      }
    }

    const fallback = this.catalog[key]?.default ?? defaultValue;
    if (typeof fallback === "undefined") throw new Error(`Flag ${key} missing default value`);

    this.toCache({ key, value: fallback, source: "default" });
    return fallback as T;
  }

  private toCache(resolution: FlagResolution): void {
    const expiresAt = Date.now() + (this.options.cacheTtlMs ?? 60_000);
    const entry: CacheEntry = {
      value: resolution.value,
      source: resolution.source,
      etag: resolution.etag,
      expiresAt,
    };
    this.cache.set(resolution.key, entry);
    this.lastKnownGood.set(resolution.key, entry);
  }

  private fromCache(key: string): CacheEntry | null {
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit;
    return null;
  }

  private loadCatalog(): void {
    const catalogPath = this.options.catalogPath ?? path.join(process.cwd(), "flags/catalog.yaml");
    if (!fs.existsSync(catalogPath)) return;
    try {
      const content = fs.readFileSync(catalogPath, "utf8");
      const doc = safeLoadYaml(content) as { flags?: FlagDefinition[] };
      if (Array.isArray(doc?.flags)) {
        for (const f of doc.flags) {
          this.catalog[f.key] = f;
        }
      }
    } catch (err) {
      void err;
    }
  }
}

export const defaultClient = new FlagClient({ env: process.env.NODE_ENV ?? "dev" });

export function withFlags<T extends FlagPrimitive>(
  key: string,
  ctx: Partial<FlagContext> = {}
): Promise<T> {
  return defaultClient.get<T>(key, undefined, ctx);
}
