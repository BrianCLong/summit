import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import yaml from "js-yaml";

type PromptRegistry = {
  version: number;
  prompts: PromptEntry[];
};

export type PromptEntry = {
  id: string;
  version: string;
  path: string;
  sha256: string;
  description?: string;
  scope: {
    paths: string[];
    domains?: string[];
  };
  verification?: {
    tiers_required?: string[];
    debt_budget?: { permitted?: number; retirement_target?: number };
  };
  allowed_operations?: string[];
};

export function loadPromptRegistry(registryPath = "prompts/registry.yaml"): PromptRegistry {
  const absolutePath = path.resolve(registryPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Prompt registry not found at ${absolutePath}`);
  }
  const content = fs.readFileSync(absolutePath, "utf8");
  const parsed = yaml.load(content) as PromptRegistry;
  if (!parsed || !Array.isArray(parsed.prompts)) {
    throw new Error('Prompt registry is missing required "prompts" array.');
  }
  return parsed;
}

export function getPromptByHash(registry: PromptRegistry, hash: string): PromptEntry | undefined {
  return registry.prompts.find((prompt) => prompt.sha256 === hash);
}

export function computeFileSha256(filePath: string): string {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Prompt file not found: ${absolutePath}`);
  }
  const buffer = fs.readFileSync(absolutePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function getChangedFiles(baseRef?: string): string[] {
  const diffBase = baseRef ?? process.env.DIFF_BASE ?? process.env.GITHUB_BASE_REF ?? "origin/main";
  const args = `${diffBase}...HEAD`;
  try {
    const output = execSync(`git diff --name-only ${args}`, { encoding: "utf8" });
    return output
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    const fallback = execSync("git diff --name-only --cached", { encoding: "utf8" });
    return fallback
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
}

export function assertScopeCompliance(prompt: PromptEntry, changedFiles: string[]): void {
  const allowedPaths = prompt.scope?.paths ?? [];
  if (allowedPaths.length === 0) {
    throw new Error(`Prompt ${prompt.id} does not declare any scope paths.`);
  }
  const violations = changedFiles.filter(
    (file) => !allowedPaths.some((allowed) => file.startsWith(allowed))
  );
  if (violations.length > 0) {
    const message = violations.map((file) => `- ${file}`).join("\n");
    throw new Error(`Scope violation detected for prompt ${prompt.id}:\n${message}`);
  }
}

export function ensureHashMatches(prompt: PromptEntry): void {
  const actualHash = computeFileSha256(prompt.path);
  if (actualHash !== prompt.sha256) {
    throw new Error(
      `Hash mismatch for prompt ${prompt.id}. Expected ${prompt.sha256} but got ${actualHash}`
    );
  }
}
