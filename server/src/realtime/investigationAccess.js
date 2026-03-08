"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setMemberRole = setMemberRole;
exports.removeMember = removeMember;
exports.getMembers = getMembers;
exports.getMemberRole = getMemberRole;
exports.authorizeInvestigationAction = authorizeInvestigationAction;
const ioredis_1 = __importDefault(require("ioredis"));
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'investigation-access' });
const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT;
const redisPassword = process.env.REDIS_PASSWORD;
let redis = null;
try {
    if (redisUrl) {
        redis = new ioredis_1.default(redisUrl);
    }
    else if (redisHost) {
        redis = new ioredis_1.default({
            host: redisHost,
            port: Number(redisPort || 6379),
            password: redisPassword,
        });
    }
    redis?.on('error', (err) => {
        logger.warn({ err }, 'Redis unavailable for investigation access; using memory');
        redis = null;
    });
}
catch (err) {
    logger.warn({ err }, 'Failed to init Redis for investigation access');
    redis = null;
}
const memberStore = new Map();
const ROLE_PERMISSIONS = {
    owner: new Set(['view', 'edit', 'comment', 'manage']),
    editor: new Set(['view', 'edit', 'comment']),
    commenter: new Set(['view', 'comment']),
    viewer: new Set(['view']),
};
const GLOBAL_ROLE_PERMISSIONS = {
    ADMIN: new Set(['view', 'edit', 'comment', 'manage']),
    EDITOR: new Set(['view', 'edit', 'comment']),
    ANALYST: new Set(['view', 'comment']),
    REVIEWER: new Set(['view']),
};
function memberKey(investigationId) {
    return `intelgraph:investigation:${investigationId}:members`;
}
function ensureMemberMap(investigationId) {
    let map = memberStore.get(investigationId);
    if (!map) {
        map = new Map();
        memberStore.set(investigationId, map);
    }
    return map;
}
async function setMemberRole(investigationId, userId, role) {
    const map = ensureMemberMap(investigationId);
    map.set(userId, role);
    if (redis) {
        try {
            await redis.hset(memberKey(investigationId), userId, role);
        }
        catch (err) {
            logger.warn({ err }, 'Failed to persist member role to Redis');
        }
    }
}
async function removeMember(investigationId, userId) {
    const map = ensureMemberMap(investigationId);
    map.delete(userId);
    if (redis) {
        try {
            await redis.hdel(memberKey(investigationId), userId);
        }
        catch (err) {
            logger.warn({ err }, 'Failed to remove member from Redis');
        }
    }
}
async function getMembers(investigationId) {
    if (redis) {
        try {
            const raw = await redis.hgetall(memberKey(investigationId));
            const map = ensureMemberMap(investigationId);
            for (const [userId, value] of Object.entries(raw)) {
                map.set(userId, value);
            }
        }
        catch (err) {
            logger.warn({ err }, 'Failed to fetch members from Redis');
        }
    }
    const map = ensureMemberMap(investigationId);
    const result = {};
    for (const [userId, role] of map.entries()) {
        result[userId] = role;
    }
    return result;
}
async function getMemberRole(investigationId, userId) {
    const map = ensureMemberMap(investigationId);
    let role = map.get(userId) || null;
    if (!role && redis) {
        try {
            const raw = await redis.hget(memberKey(investigationId), userId);
            if (raw) {
                role = raw;
                map.set(userId, role);
            }
        }
        catch (err) {
            logger.warn({ err }, 'Failed to load member role from Redis');
        }
    }
    return role;
}
async function authorizeInvestigationAction(investigationId, user, action) {
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
            }
            else if (globalRole === 'EDITOR') {
                await setMemberRole(investigationId, user.id, 'editor');
            }
        }
        return { allowed: true, role: globalRole || null, via: 'global' };
    }
    const members = await getMembers(investigationId);
    if (Object.keys(members).length === 0) {
        const bootstrapRole = globalPermissions?.has('manage')
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
            const derivedRole = globalPermissions.has('comment')
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
