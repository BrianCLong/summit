import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface RedactionLists {
  allowlist: string[];
  denylist: string[];
  mask?: string;
}

const REDACTION_CONFIG_PATH = (() => {
  const searchPaths = [
    resolve(process.cwd(), 'server', 'config', 'redaction-lists.json'),
    resolve(process.cwd(), 'config', 'redaction-lists.json'),
  ];

  for (const candidate of searchPaths) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return searchPaths[1];
})();

let cachedLists: RedactionLists | null = null;

export function getRedactionLists(): RedactionLists {
  if (!cachedLists) {
    const raw = readFileSync(REDACTION_CONFIG_PATH, 'utf-8');
    cachedLists = JSON.parse(raw) as RedactionLists;
  }
  return cachedLists;
}

function shouldMaskKey(key: string, lists: RedactionLists): boolean {
  const { allowlist = [], denylist = [] } = lists;
  if (allowlist.includes(key)) {
    return false;
  }
  return denylist.includes(key);
}

export function sanitizeForProvenance<T = Record<string, any>>(payload: T): T {
  const lists = getRedactionLists();
  const mask = lists.mask || '[REDACTED]';

  const visit = (value: any): any => {
    if (Array.isArray(value)) {
      return value.map((item) => visit(item));
    }

    if (value && typeof value === 'object') {
      return Object.entries(value).reduce<Record<string, any>>((acc, [key, val]) => {
        if (shouldMaskKey(key, lists)) {
          acc[key] = mask;
          return acc;
        }
        acc[key] = visit(val);
        return acc;
      }, {});
    }

    return value;
  };

  return visit(payload);
}
