import { readFileSync } from 'fs';
import path from 'path';

const FLAG_FILE = path.resolve(process.cwd(), 'config/flags.json');

type FlagMap = Map<string, boolean>;

let cachedFlags: FlagMap | null = null;

function loadFlags(): FlagMap {
  if (cachedFlags) {
    return cachedFlags;
  }

  const flags: FlagMap = new Map();
  try {
    const raw = readFileSync(FLAG_FILE, 'utf-8');
    const data = JSON.parse(raw) as Array<{ key: string; enabled: boolean }>;
    for (const entry of data) {
      if (entry?.key) {
        flags.set(entry.key, !!entry.enabled);
      }
    }
  } catch (error) {
    // Fallback to empty flag set when config file is unavailable.
  }

  cachedFlags = flags;
  return flags;
}

function normaliseEnvKey(key: string): string {
  return `FEATURE_${key.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase()}`;
}

export function isFeatureEnabled(key: string, defaultValue = false): boolean {
  const envKey = normaliseEnvKey(key);
  const envValue = process.env[envKey];
  if (envValue !== undefined) {
    return envValue.toLowerCase() === 'true';
  }

  const flags = loadFlags();
  if (flags.has(key)) {
    return flags.get(key) as boolean;
  }

  return defaultValue;
}

export const DISCLOSURE_PACKAGER_FLAG = 'features.disclosurePackager';

export function isDisclosurePackagerEnabled(): boolean {
  return isFeatureEnabled(DISCLOSURE_PACKAGER_FLAG, false);
}

export function clearFeatureCache(): void {
  cachedFlags = null;
}
