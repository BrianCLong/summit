/**
 * Tool Allowlist Loader
 *
 * Loads and validates the per-environment tool allowlist from
 * config/tool-allowlist.json. Deny-by-default: any tool not
 * explicitly listed is denied.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ToolAllowlistConfigSchema, type ToolAllowlistConfig, type Environment, type ToolId } from './types.js';
import logger from '../config/logger.js';

const allowlistLogger = logger.child({ name: 'ToolAllowlist' });

let cachedConfig: ToolAllowlistConfig | null = null;

/**
 * Load and validate the tool allowlist config from disk.
 * Caches the result after first load. Call `reloadAllowlist()` to refresh.
 */
export async function loadAllowlist(): Promise<ToolAllowlistConfig> {
  if (cachedConfig) return cachedConfig;

  const configPath = process.env.TOOL_ALLOWLIST_PATH ||
    join(process.cwd(), '..', 'config', 'tool-allowlist.json');

  try {
    const raw = await readFile(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    cachedConfig = ToolAllowlistConfigSchema.parse(parsed);
    allowlistLogger.info({ configPath, version: cachedConfig.version }, 'Tool allowlist loaded');
    return cachedConfig;
  } catch (err) {
    allowlistLogger.error({ error: (err as Error).message, configPath }, 'Failed to load tool allowlist');
    throw new Error(`Tool allowlist load failed: ${(err as Error).message}`);
  }
}

/**
 * Force reload the allowlist config from disk.
 */
export async function reloadAllowlist(): Promise<ToolAllowlistConfig> {
  cachedConfig = null;
  return loadAllowlist();
}

/**
 * Check if a specific tool is allowed in a given environment.
 * Deny-by-default: returns false if the tool is not in the allowlist.
 */
export async function isToolAllowed(env: Environment, toolId: ToolId): Promise<boolean> {
  const config = await loadAllowlist();
  const envConfig = config.environments[env];
  if (!envConfig) return false;
  if (envConfig.denyByDefault && !envConfig.allowedTools.includes(toolId)) {
    return false;
  }
  return envConfig.allowedTools.includes(toolId);
}

/**
 * Get the full list of allowed tools for a given environment.
 */
export async function getAllowedTools(env: Environment): Promise<ToolId[]> {
  const config = await loadAllowlist();
  const envConfig = config.environments[env];
  if (!envConfig) return [];
  return envConfig.allowedTools;
}

/**
 * Reset cache (for testing).
 */
export function resetAllowlistCache(): void {
  cachedConfig = null;
}
