/**
 * Summit CLI Configuration
 *
 * Configuration management for the CLI.
 *
 * @module @summit/cli/config
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

/**
 * CLI configuration
 */
export interface CLIConfig {
  baseUrl?: string;
  tenantId?: string;
  token?: string;
  apiKey?: string;
  outputFormat?: "table" | "json" | "yaml";
}

const CONFIG_DIR = join(homedir(), ".summit");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

let config: CLIConfig = {};

/**
 * Ensure config directory exists
 */
function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Load configuration from file
 */
export async function loadConfig(): Promise<CLIConfig> {
  ensureConfigDir();

  if (existsSync(CONFIG_FILE)) {
    const content = readFileSync(CONFIG_FILE, "utf-8");
    config = JSON.parse(content);
  }

  // Override with environment variables
  if (process.env.SUMMIT_API_URL) {
    config.baseUrl = process.env.SUMMIT_API_URL;
  }
  if (process.env.SUMMIT_API_KEY) {
    config.apiKey = process.env.SUMMIT_API_KEY;
  }
  if (process.env.SUMMIT_TENANT_ID) {
    config.tenantId = process.env.SUMMIT_TENANT_ID;
  }
  if (process.env.SUMMIT_TOKEN) {
    config.token = process.env.SUMMIT_TOKEN;
  }

  return config;
}

/**
 * Save configuration to file
 */
export async function saveConfig(updates: Partial<CLIConfig>): Promise<void> {
  ensureConfigDir();
  config = { ...config, ...updates };

  // Don't persist tokens from env vars
  const persistConfig = { ...config };
  if (process.env.SUMMIT_TOKEN) {
    delete persistConfig.token;
  }
  if (process.env.SUMMIT_API_KEY) {
    delete persistConfig.apiKey;
  }

  writeFileSync(CONFIG_FILE, JSON.stringify(persistConfig, null, 2), {
    mode: 0o600,
  });
}

/**
 * Get current configuration
 */
export function getConfig(): CLIConfig {
  return config;
}

/**
 * Set a configuration value
 */
export async function setConfigValue(key: keyof CLIConfig, value: string): Promise<void> {
  await saveConfig({ [key]: value });
}

/**
 * Get a configuration value
 */
export function getConfigValue(key: keyof CLIConfig): string | undefined {
  return config[key];
}

/**
 * Clear configuration
 */
export async function clearConfig(): Promise<void> {
  config = {};
  if (existsSync(CONFIG_FILE)) {
    writeFileSync(CONFIG_FILE, "{}", { mode: 0o600 });
  }
}

/**
 * Check if CLI is configured
 */
export function isConfigured(): boolean {
  return !!config.baseUrl;
}

/**
 * Check if authenticated
 */
export function isAuthenticated(): boolean {
  return !!(config.token || config.apiKey);
}
