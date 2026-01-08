import crypto from "crypto";

export interface AllowedVar {
  name: string;
  maxLength?: number;
  redact?: boolean;
}

export interface PromptAsset {
  name: string;
  version: string;
  owner: string;
  purpose: string;
  riskLevel: "low" | "medium" | "high";
  template: string;
  allowedVars: AllowedVar[];
  maxTokens: number;
}

export interface LintResult {
  ok: boolean;
  errors: string[];
}

const DISALLOWED_PATTERNS = [
  /API_KEY/i,
  /PASSWORD/i,
  /SECRET/i,
  /BEGIN RSA PRIVATE KEY/i,
  /raw log/i,
  /social security/i,
];

const VARIABLE_PATTERN = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;

function escapeValue(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function lintPrompt(asset: PromptAsset): LintResult {
  const errors: string[] = [];
  for (const pattern of DISALLOWED_PATTERNS) {
    if (pattern.test(asset.template)) {
      errors.push(`Template contains disallowed pattern: ${pattern}`);
    }
  }

  const allowedNames = new Set(asset.allowedVars.map((v) => v.name));
  const seenVars = new Set<string>();
  let match: RegExpExecArray | null;
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

export interface RenderOptions {
  redactUnknown?: boolean;
}

export class PromptRegistry {
  private assets = new Map<string, PromptAsset>();
  private linted = new Set<string>();

  register(asset: PromptAsset): void {
    const lint = lintPrompt(asset);
    if (!lint.ok) {
      throw new Error(`Prompt failed lint: ${lint.errors.join("; ")}`);
    }
    const key = this.key(asset.name, asset.version);
    this.assets.set(key, asset);
    this.linted.add(key);
  }

  get(assetName: string, version: string): PromptAsset {
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

  render(
    assetName: string,
    version: string,
    vars: Record<string, string>,
    options: RenderOptions = {}
  ): string {
    const asset = this.get(assetName, version);
    const allowed = new Map(asset.allowedVars.map((v) => [v.name, v]));

    const tokenEstimate = asset.template.split(/\s+/).filter(Boolean).length;
    if (tokenEstimate > asset.maxTokens) {
      throw new Error(`Prompt ${assetName}@${version} exceeds maxTokens after registration`);
    }

    const replacements: Record<string, string> = {};
    for (const [key, value] of Object.entries(vars)) {
      if (!allowed.has(key)) {
        if (options.redactUnknown) {
          replacements[key] = "[REDACTED]";
        } else {
          throw new Error(`Variable ${key} is not allowlisted for prompt ${assetName}`);
        }
      } else {
        const meta = allowed.get(key)!;
        const capped = value.slice(0, meta.maxLength ?? 256);
        replacements[key] = meta.redact ? "[REDACTED]" : escapeValue(capped);
      }
    }

    return asset.template.replace(VARIABLE_PATTERN, (_, varName: string) => {
      if (!allowed.has(varName)) {
        return "[REDACTED]";
      }
      const meta = allowed.get(varName)!;
      if (meta.redact) {
        return "[REDACTED]";
      }
      const provided = replacements[varName] ?? "";
      return provided;
    });
  }

  private key(name: string, version: string): string {
    return `${name}:${version}`;
  }
}

export function deterministicVersion(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 8);
}
