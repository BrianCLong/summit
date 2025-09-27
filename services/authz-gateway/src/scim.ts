import axios from 'axios';
import { rolesForGroups } from './policy-pack';

interface CacheEntry {
  roles: string[];
  expiresAt: number;
}

class ScimRoleMapper {
  private cache = new Map<string, CacheEntry>();
  private readonly ttlMs: number;

  constructor(
    private readonly baseUrl: string | undefined,
    private readonly token: string | undefined,
    ttlMs?: number,
  ) {
    this.ttlMs =
      typeof ttlMs === 'number'
        ? ttlMs
        : Number(process.env.SCIM_CACHE_TTL_MS || 60000);
  }

  async getRolesForUser(
    userId: string,
    fallbackGroups: string[] = [],
  ): Promise<string[]> {
    if (!userId) {
      return [];
    }
    const cached = this.cache.get(userId);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      return cached.roles;
    }

    let groups = fallbackGroups;

    if (this.baseUrl && this.token) {
      try {
        const url = new URL('/scim/v2/Groups', this.baseUrl).toString();
        const res = await axios.get(url, {
          params: { filter: `members.value eq "${userId}"` },
          headers: { Authorization: `Bearer ${this.token}` },
        });
        const resources: Array<{ displayName?: string; externalId?: string }> =
          res.data?.Resources || [];
        groups = resources
          .map((resource) => resource.displayName || resource.externalId || '')
          .filter((value): value is string => Boolean(value));
      } catch {
        // fall back to any groups supplied from the token if SCIM is unavailable
        groups = fallbackGroups;
      }
    }

    const roles = rolesForGroups(groups);
    this.cache.set(userId, { roles, expiresAt: now + this.ttlMs });
    return roles;
  }

  clear() {
    this.cache.clear();
  }
}

let mapper: ScimRoleMapper | undefined;

export function getScimRoleMapper() {
  if (!mapper) {
    mapper = new ScimRoleMapper(
      process.env.SCIM_BASE_URL,
      process.env.SCIM_TOKEN,
    );
  }
  return mapper;
}

export function resetScimRoleMapper() {
  mapper?.clear();
  mapper = undefined;
}
