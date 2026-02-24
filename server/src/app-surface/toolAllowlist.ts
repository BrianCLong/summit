/**
 * Tool Allowlist Loader
 *
 * Loads per-environment tool allowlists from a static JSON config file.
 * Deny-by-default: any tool not in the allowlist is denied.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Environment } from './schemas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ToolAllowlistConfig {
  [env: string]: string[];
}

let cachedConfig: ToolAllowlistConfig | null = null;

export function loadToolAllowlist(): ToolAllowlistConfig {
  if (cachedConfig) return cachedConfig;

  const configPath = resolve(__dirname, 'tool-allowlist.json');
  const raw = readFileSync(configPath, 'utf-8');
  cachedConfig = JSON.parse(raw) as ToolAllowlistConfig;
  return cachedConfig;
}

/**
 * Check whether a tool is allowed in a given environment.
 * Deny-by-default: returns false for any tool not explicitly listed.
 */
export function isToolAllowed(env: Environment, tool: string): boolean {
  const config = loadToolAllowlist();
  const allowed = config[env];
  if (!allowed) return false;
  return allowed.includes(tool);
}

/**
 * Get the full allowlist for an environment.
 */
export function getAllowedTools(env: Environment): string[] {
  const config = loadToolAllowlist();
  return config[env] ?? [];
}

/** Clear the cached config (for testing). */
export function clearAllowlistCache(): void {
  cachedConfig = null;
}
