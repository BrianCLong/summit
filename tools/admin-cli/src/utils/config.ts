/**
 * Configuration management for Admin CLI
 */

import Conf from 'conf';
import type { CLIConfig, ProfileConfig } from '../types/index.js';

const CONFIG_SCHEMA = {
  defaultEndpoint: {
    type: 'string' as const,
    default: 'http://localhost:4000',
  },
  defaultProfile: {
    type: 'string' as const,
    default: 'default',
  },
  profiles: {
    type: 'object' as const,
    default: {
      default: {
        endpoint: 'http://localhost:4000',
        defaultFormat: 'table',
      },
      staging: {
        endpoint: 'https://api.staging.intelgraph.com',
        defaultFormat: 'table',
      },
      production: {
        endpoint: 'https://api.intelgraph.com',
        defaultFormat: 'table',
      },
    },
  },
};

/**
 * Configuration store
 */
const configStore = new Conf<CLIConfig>({
  projectName: 'summit-admin-cli',
  schema: CONFIG_SCHEMA,
});

/**
 * Get full configuration
 */
export function getConfig(): CLIConfig {
  return {
    defaultEndpoint: configStore.get('defaultEndpoint'),
    defaultProfile: configStore.get('defaultProfile'),
    profiles: configStore.get('profiles'),
  };
}

/**
 * Get profile configuration
 */
export function getProfile(name?: string): ProfileConfig {
  const profileName = name ?? configStore.get('defaultProfile');
  const profiles = configStore.get('profiles');
  return profiles[profileName] ?? profiles['default'];
}

/**
 * Set profile configuration
 */
export function setProfile(name: string, config: Partial<ProfileConfig>): void {
  const profiles = configStore.get('profiles');
  profiles[name] = {
    ...profiles[name],
    ...config,
  };
  configStore.set('profiles', profiles);
}

/**
 * Delete profile
 */
export function deleteProfile(name: string): boolean {
  if (name === 'default') {
    return false; // Cannot delete default profile
  }
  const profiles = configStore.get('profiles');
  if (profiles[name]) {
    delete profiles[name];
    configStore.set('profiles', profiles);
    return true;
  }
  return false;
}

/**
 * Set default profile
 */
export function setDefaultProfile(name: string): void {
  configStore.set('defaultProfile', name);
}

/**
 * List all profiles
 */
export function listProfiles(): string[] {
  return Object.keys(configStore.get('profiles'));
}

/**
 * Get effective endpoint
 */
export function getEndpoint(profileName?: string, override?: string): string {
  if (override) return override;
  const profile = getProfile(profileName);
  return profile.endpoint;
}

/**
 * Get token from environment or profile
 */
export function getToken(profileName?: string, override?: string): string | undefined {
  if (override) return override;

  // Check environment variable first
  const envToken = process.env.INTELGRAPH_TOKEN ?? process.env.SUMMIT_ADMIN_TOKEN;
  if (envToken) return envToken;

  // Fall back to profile
  const profile = getProfile(profileName);
  return profile.token;
}

/**
 * Get configuration file path
 */
export function getConfigPath(): string {
  return configStore.path;
}

/**
 * Reset configuration to defaults
 */
export function resetConfig(): void {
  configStore.clear();
}
