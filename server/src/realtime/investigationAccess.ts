import Redis from 'ioredis';
import pino from 'pino';

export type InvestigationRole = 'owner' | 'editor' | 'commenter' | 'viewer';
export type InvestigationAction = 'view' | 'edit' | 'comment' | 'manage';

export interface UserIdentity {
  id: string;
  role?: string;
  email?: string;
  username?: string;
}

interface AuthorizationResult {
  allowed: boolean;
  role: InvestigationRole | 'ADMIN' | 'EDITOR' | null;
  via: 'member' | 'global';
}

const logger = pino({ name: 'investigation-access' });

const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT;
const redisPassword = process.env.REDIS_PASSWORD;

let redis: Redis | null = null;

try {
  if (redisUrl) {
    redis = new Redis(redisUrl);
  } else if (redisHost) {
    redis = new Redis({
      host: redisHost,
      port: Number(redisPort || 6379),
      password: redisPassword,
    });
  }
  redis?.on('error', (err) => {
    logger.warn({ err }, 'Redis unavailable for investigation access; using memory');
    redis = null;
  });
} catch (err) {
  logger.warn({ err }, 'Failed to init Redis for investigation access');
  redis = null;
}

const memberStore = new Map<string, Map<string, InvestigationRole>>();

const ROLE_PERMISSIONS: Record<InvestigationRole, Set<InvestigationAction>> = {
  owner: new Set(['view', 'edit', 'comment', 'manage']),
  editor: new Set(['view', 'edit', 'comment']),
  commenter: new Set(['view', 'comment']),
  viewer: new Set(['view']),
};

const GLOBAL_ROLE_PERMISSIONS: Record<string, Set<InvestigationAction>> = {
  ADMIN: new Set(['view', 'edit', 'comment', 'manage']),
  EDITOR: new Set(['view', 'edit', 'comment']),
  ANALYST: new Set(['view', 'comment']),
  REVIEWER: new Set(['view']),
};

function memberKey(investigationId: string) {
  return `intelgraph:investigation:${investigationId}:members`;
}

function ensureMemberMap(investigationId: string) {
  let map = memberStore.get(investigationId);
  if (!map) {
    map = new Map();
    memberStore.set(investigationId, map);
  }
  return map;
}

export async function setMemberRole(
  investigationId: string,
  userId: string,
  role: InvestigationRole,
): Promise<void> {
  const map = ensureMemberMap(investigationId);
  map.set(userId, role);
  if (redis) {
    try {
      await redis.hset(memberKey(investigationId), userId, role);
    } catch (err) {
      logger.warn({ err }, 'Failed to persist member role to Redis');
    }
  }
}

export async function removeMember(
  investigationId: string,
  userId: string,
): Promise<void> {
  const map = ensureMemberMap(investigationId);
  map.delete(userId);
  if (redis) {
    try {
      await redis.hdel(memberKey(investigationId), userId);
    } catch (err) {
      logger.warn({ err }, 'Failed to remove member from Redis');
    }
  }
}

export async function getMembers(
  investigationId: string,
): Promise<Record<string, InvestigationRole>> {
  if (redis) {
    try {
      const raw = await redis.hgetall(memberKey(investigationId));
      const map = ensureMemberMap(investigationId);
      for (const [userId, value] of Object.entries(raw)) {
        map.set(userId, value as InvestigationRole);
      }
    } catch (err) {
      logger.warn({ err }, 'Failed to fetch members from Redis');
    }
  }
  const map = ensureMemberMap(investigationId);
  const result: Record<string, InvestigationRole> = {};
  for (const [userId, role] of map.entries()) {
    result[userId] = role;
  }
  return result;
}

export async function getMemberRole(
  investigationId: string,
  userId: string,
): Promise<InvestigationRole | null> {
  const map = ensureMemberMap(investigationId);
  let role = map.get(userId) || null;
  if (!role && redis) {
    try {
      const raw = await redis.hget(memberKey(investigationId), userId);
      if (raw) {
        role = raw as InvestigationRole;
        map.set(userId, role);
      }
    } catch (err) {
      logger.warn({ err }, 'Failed to load member role from Redis');
    }
  }
  return role;
}

export async function authorizeInvestigationAction(
  investigationId: string,
  user: UserIdentity | undefined,
  action: InvestigationAction,
): Promise<AuthorizationResult> {
  if (!user?.id) {
    return { allowed: false, role: null, via: 'member' };
  }

  const globalRole = user.role?.toUpperCase() || '';
  const globalPermissions = GLOBAL_ROLE_PERMISSIONS[globalRole];
  if (globalPermissions?.has(action)) {
    if (!(await getMemberRole(investigationId, user.id))) {
      // Promote admin/editor into the room membership for auditing when none exists
      if (globalRole === 'ADMIN') {
        await setMemberRole(investigationId, user.id, 'owner');
      } else if (globalRole === 'EDITOR') {
        await setMemberRole(investigationId, user.id, 'editor');
      }
    }
    return { allowed: true, role: (globalRole as any) || null, via: 'global' };
  }

  const members = await getMembers(investigationId);
  if (Object.keys(members).length === 0) {
    const bootstrapRole: InvestigationRole = globalPermissions?.has('manage')
      ? 'owner'
      : globalPermissions?.has('edit')
      ? 'editor'
      : 'viewer';
    await setMemberRole(investigationId, user.id, bootstrapRole);
    const allowed = ROLE_PERMISSIONS[bootstrapRole]?.has(action) ?? false;
    return { allowed, role: bootstrapRole, via: 'member' };
  }

  const memberRole = await getMemberRole(investigationId, user.id);
  if (!memberRole) {
    if (globalPermissions?.has('view')) {
      const derivedRole: InvestigationRole = globalPermissions.has('comment')
        ? 'commenter'
        : 'viewer';
      await setMemberRole(investigationId, user.id, derivedRole);
      const allowed = ROLE_PERMISSIONS[derivedRole]?.has(action) ?? false;
      return { allowed, role: derivedRole, via: 'member' };
    }
    return { allowed: false, role: null, via: 'member' };
  }

  const permissions = ROLE_PERMISSIONS[memberRole];
  if (permissions?.has(action)) {
    return { allowed: true, role: memberRole, via: 'member' };
  }

  return { allowed: false, role: memberRole, via: 'member' };
}
