"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptRegistry = void 0;
exports.lintPrompt = lintPrompt;
exports.deterministicVersion = deterministicVersion;
const crypto_1 = __importDefault(require("crypto"));
const DISALLOWED_PATTERNS = [
    /API_KEY/i,
    /PASSWORD/i,
    /SECRET/i,
    /BEGIN RSA PRIVATE KEY/i,
    /raw log/i,
    /social security/i,
];
const VARIABLE_PATTERN = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
function escapeValue(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function lintPrompt(asset) {
    const errors = [];
    for (const pattern of DISALLOWED_PATTERNS) {
        if (pattern.test(asset.template)) {
            errors.push(`Template contains disallowed pattern: ${pattern}`);
        }
    }
    const allowedNames = new Set(asset.allowedVars.map((v) => v.name));
    const seenVars = new Set();
    let match;
    while ((match = VARIABLE_PATTERN.exec(asset.template)) !== null) {
        const varName = match[1];
        seenVars.add(varName);
        if (!allowedNames.has(varName)) {
            errors.push(`Variable {{${varName}}} is not allowlisted`);
        }
    }
    asset.allowedVars.forEach((v) => {
        if (!seenVars.has(v.name)) {
            errors.push(`Allowlisted variable ${v.name} is unused in template`);
        }
    });
    const tokenEstimate = asset.template.split(/\s+/).filter(Boolean).length;
    if (tokenEstimate > asset.maxTokens) {
        errors.push(`Template token estimate ${tokenEstimate} exceeds maxTokens ${asset.maxTokens}`);
    }
    return { ok: errors.length === 0, errors };
}
class PromptRegistry {
    assets = new Map();
    linted = new Set();
    register(asset) {
        const lint = lintPrompt(asset);
        if (!lint.ok) {
            throw new Error(`Prompt failed lint: ${lint.errors.join('; ')}`);
        }
        const key = this.key(asset.name, asset.version);
        this.assets.set(key, asset);
        this.linted.add(key);
    }
    get(assetName, version) {
        const key = this.key(assetName, version);
        const asset = this.assets.get(key);
        if (!asset) {
            throw new Error(`Prompt ${assetName}@${version} not found`);
        }
        if (!this.linted.has(key)) {
            throw new Error(`Prompt ${assetName}@${version} failed lint and cannot be loaded`);
        }
        return asset;
    }
    render(assetName, version, vars, options = {}) {
        const asset = this.get(assetName, version);
        const allowed = new Map(asset.allowedVars.map((v) => [v.name, v]));
        const tokenEstimate = asset.template.split(/\s+/).filter(Boolean).length;
        if (tokenEstimate > asset.maxTokens) {
            throw new Error(`Prompt ${assetName}@${version} exceeds maxTokens after registration`);
        }
        const replacements = {};
        for (const [key, value] of Object.entries(vars)) {
            if (!allowed.has(key)) {
                if (options.redactUnknown) {
                    replacements[key] = '[REDACTED]';
                }
                else {
                    throw new Error(`Variable ${key} is not allowlisted for prompt ${assetName}`);
                }
            }
            else {
                const meta = allowed.get(key);
                const capped = value.slice(0, meta.maxLength ?? 256);
                replacements[key] = meta.redact ? '[REDACTED]' : escapeValue(capped);
            }
        }
        return asset.template.replace(VARIABLE_PATTERN, (_, varName) => {
            if (!allowed.has(varName)) {
                return '[REDACTED]';
            }
            const meta = allowed.get(varName);
            if (meta.redact) {
                return '[REDACTED]';
            }
            const provided = replacements[varName] ?? '';
            return provided;
        });
    }
    key(name, version) {
        return `${name}:${version}`;
    }
}
exports.PromptRegistry = PromptRegistry;
function deterministicVersion(content) {
    return crypto_1.default.createHash('sha256').update(content).digest('hex').slice(0, 8);
}
