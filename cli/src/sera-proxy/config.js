"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveSeraProxyConfig = resolveSeraProxyConfig;
exports.parseAllowHosts = parseAllowHosts;
exports.validateEndpointHost = validateEndpointHost;
const path = __importStar(require("path"));
const net_1 = require("net");
const DEFAULT_ALLOW_HOSTS = ['localhost', '127.0.0.1'];
const DEFAULT_PORT = 18080;
const DEFAULT_MAX_BODY_BYTES = 2 * 1024 * 1024;
function resolveSeraProxyConfig(overrides = {}, env = process.env) {
    const endpoint = overrides.endpoint ?? env.SERA_ENDPOINT ?? '';
    if (!endpoint) {
        throw new Error('SERA endpoint is required (set --endpoint or SERA_ENDPOINT).');
    }
    const portRaw = overrides.port ?? parseInt(env.SERA_PORT ?? '', 10);
    const port = Number.isFinite(portRaw) ? portRaw : DEFAULT_PORT;
    const allowHosts = overrides.allowHosts && overrides.allowHosts.length > 0
        ? overrides.allowHosts
        : parseAllowHosts(env.SERA_ALLOW_HOSTS) ?? DEFAULT_ALLOW_HOSTS;
    const artifactDir = overrides.artifactDir ??
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
function parseAllowHosts(raw) {
    if (!raw)
        return undefined;
    const values = raw
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    return values.length > 0 ? values : undefined;
}
function validateEndpointHost(endpoint, allowHosts) {
    const url = new URL(endpoint);
    const host = url.hostname.toLowerCase();
    const normalizedAllow = allowHosts.map((entry) => entry.toLowerCase());
    if (!normalizedAllow.includes(host)) {
        throw new Error(`SERA endpoint host "${host}" is not in the allowlist.`);
    }
    if ((0, net_1.isIP)(host) && isPrivateAddress(host) && !normalizedAllow.includes(host)) {
        throw new Error(`SERA endpoint host "${host}" is private and not explicitly allowed.`);
    }
    return host;
}
function isPrivateAddress(host) {
    const ipVersion = (0, net_1.isIP)(host);
    if (ipVersion === 4) {
        const parts = host.split('.').map((part) => Number(part));
        if (parts.length !== 4 || parts.some((part) => Number.isNaN(part)))
            return false;
        const [a, b] = parts;
        return (a === 10 ||
            a === 127 ||
            (a === 169 && b === 254) ||
            (a === 172 && b >= 16 && b <= 31) ||
            (a === 192 && b === 168));
    }
    if (ipVersion === 6) {
        const normalized = host.toLowerCase();
        return (normalized === '::1' ||
            normalized.startsWith('fc') ||
            normalized.startsWith('fd') ||
            normalized.startsWith('fe80'));
    }
    return false;
}
