"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultClient = exports.FlagClient = void 0;
exports.withFlags = withFlags;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
class EnvProvider {
  name = "env";
  async get(key, _ctx) {
    const envKey = this.envKey(key);
    if (process.env[envKey] !== undefined) {
      const raw = process.env[envKey];
      const value = this.parseValue(raw);
      return { key, value, source: this.name };
    }
    return null;
  }
  envKey(key) {
    return `FLAG_${key.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase()}`;
  }
  parseValue(raw) {
    if (raw === "true" || raw === "false") return raw === "true";
    if (!Number.isNaN(Number(raw))) return Number(raw);
    return raw;
  }
}
class FileProvider {
  name = "file";
  cache = {};
  baseDir;
  constructor(baseDir) {
    this.baseDir = baseDir;
  }
  async get(key, ctx) {
    const filePath = node_path_1.default.join(this.baseDir, `${ctx.env}.yaml`);
    if (!node_fs_1.default.existsSync(filePath)) return null;
    const stat = node_fs_1.default.statSync(filePath);
    const cached = this.cache[filePath];
    if (!cached || cached.mtime < stat.mtimeMs) {
      const content = node_fs_1.default.readFileSync(filePath, "utf8");
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
class RemoteProvider {
  name = "remote";
  endpoint;
  etag;
  cached;
  constructor(endpoint) {
    this.endpoint = endpoint;
  }
  async get(key, ctx) {
    if (!this.endpoint) return null;
    const url = new URL("/flags/evaluate", this.endpoint);
    url.searchParams.set("key", key);
    url.searchParams.set("env", ctx.env);
    if (ctx.tenant) url.searchParams.set("tenant", ctx.tenant);
    if (ctx.userRole) url.searchParams.set("role", ctx.userRole);
    const headers = {};
    if (this.etag) headers["If-None-Match"] = this.etag;
    try {
      const res = await fetch(url, { headers });
      if (res.status === 304 && this.cached) {
        return this.cached;
      }
      if (!res.ok) return null;
      this.etag = res.headers.get("etag") ?? undefined;
      const data = await res.json();
      this.cached = { key, value: data.value, source: this.name, etag: this.etag };
      return this.cached;
    } catch (err) {
      void err;
      return this.cached ?? null;
    }
  }
}
function percentageHash(seed, salt) {
  const digest = node_crypto_1.default.createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  const int = parseInt(digest.slice(0, 8), 16);
  return (int % 10000) / 100;
}
function safeLoadYaml(content) {
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
function simpleYaml(content) {
  const root = {};
  const stack = [{ indent: 0, node: root }];
  const parseVal = (raw) => {
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
    const indent = line.match(/^\s*/)[0].length;
    const [keyPart, ...rest] = line.trim().split(":");
    const valueRaw = rest.join(":").trim();
    while (stack.length && indent < stack[stack.length - 1].indent) stack.pop();
    const current = stack[stack.length - 1].node;
    if (!valueRaw) {
      const child = {};
      current[keyPart] = child;
      stack.push({ indent: indent + 2, node: child });
    } else {
      current[keyPart] = parseVal(valueRaw);
    }
  }
  return root;
}
class FlagClient {
  options;
  providers;
  cache = new Map();
  lastKnownGood = new Map();
  catalog = {};
  constructor(options) {
    this.options = {
      cacheTtlMs: 60_000,
      targetsDir: node_path_1.default.join(process.cwd(), "flags/targets"),
      ...options,
    };
    this.providers = [
      new EnvProvider(),
      new FileProvider(this.options.targetsDir),
      new RemoteProvider(this.options.remoteEndpoint),
    ];
    this.loadCatalog();
  }
  catalogKey(key) {
    return key;
  }
  kill(key) {
    this.cache.set(key, {
      value: false,
      source: "kill-switch",
      expiresAt: Date.now() + (this.options.cacheTtlMs ?? 60_000),
    });
  }
  async get(key, defaultValue, ctxOverrides) {
    const ctx = { env: this.options.env, ...ctxOverrides };
    const cached = this.fromCache(key);
    if (cached) return cached.value;
    for (const provider of this.providers) {
      const result = await provider.get(key, ctx);
      if (result) {
        this.toCache(result);
        return result.value;
      }
    }
    const fallback = this.catalog[key]?.default ?? defaultValue;
    if (typeof fallback === "undefined") throw new Error(`Flag ${key} missing default value`);
    this.toCache({ key, value: fallback, source: "default" });
    return fallback;
  }
  toCache(resolution) {
    const expiresAt = Date.now() + (this.options.cacheTtlMs ?? 60_000);
    const entry = {
      value: resolution.value,
      source: resolution.source,
      etag: resolution.etag,
      expiresAt,
    };
    this.cache.set(resolution.key, entry);
    this.lastKnownGood.set(resolution.key, entry);
  }
  fromCache(key) {
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit;
    return null;
  }
  loadCatalog() {
    const catalogPath =
      this.options.catalogPath ?? node_path_1.default.join(process.cwd(), "flags/catalog.yaml");
    if (!node_fs_1.default.existsSync(catalogPath)) return;
    try {
      const content = node_fs_1.default.readFileSync(catalogPath, "utf8");
      const doc = safeLoadYaml(content);
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
exports.FlagClient = FlagClient;
exports.defaultClient = new FlagClient({ env: process.env.NODE_ENV ?? "dev" });
function withFlags(key, ctx = {}) {
  return exports.defaultClient.get(key, undefined, ctx);
}
