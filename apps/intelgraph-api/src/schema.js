"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = exports.typeDefs = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const crypto_1 = require("crypto");
const graphql_1 = require("graphql");
const graphql_tag_1 = __importDefault(require("graphql-tag"));
const base_graphql_raw_1 = __importDefault(require("../schema/base.graphql?raw"));
const validators_js_1 = require("./lib/validators.js");
exports.typeDefs = (0, graphql_tag_1.default) `
  ${base_graphql_raw_1.default}
`;
const SCHEMA_VERSION = '1.1.1';
const SCHEMA_LAST_UPDATED = process.env.SCHEMA_LAST_UPDATED || new Date().toISOString();
const schemaHash = (0, crypto_1.createHash)('sha256').update(base_graphql_raw_1.default).digest('hex');
const schemaSDL = base_graphql_raw_1.default;
const AnyScalar = new graphql_1.GraphQLScalarType({
    name: '_Any',
    serialize: (value) => value,
    parseValue: (value) => value,
    parseLiteral: (ast) => {
        if (ast.kind === graphql_1.Kind.STRING || ast.kind === graphql_1.Kind.INT || ast.kind === graphql_1.Kind.BOOLEAN) {
            return ast.value;
        }
        return null;
    },
});
const FieldSetScalar = new graphql_1.GraphQLScalarType({
    name: '_FieldSet',
    serialize: (value) => String(value),
    parseValue: (value) => String(value),
    parseLiteral: (ast) => (ast.kind === graphql_1.Kind.STRING ? ast.value : null),
});
const DateTimeScalar = new graphql_1.GraphQLScalarType({
    name: 'DateTime',
    serialize: (value) => new Date(value).toISOString(),
    parseValue: (value) => new Date(value).toISOString(),
    parseLiteral: (ast) => (ast.kind === graphql_1.Kind.STRING ? new Date(ast.value).toISOString() : null),
});
const UUIDScalar = new graphql_1.GraphQLScalarType({
    name: 'UUID',
    serialize: (value) => (0, validators_js_1.validateId)(value, 'UUID'),
    parseValue: (value) => (0, validators_js_1.validateId)(value, 'UUID'),
    parseLiteral: (ast) => (ast.kind === graphql_1.Kind.STRING ? (0, validators_js_1.validateId)(ast.value, 'UUID') : null),
});
// Simple in-memory cache
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
// Helper function for authorization
const authorize = (user, requiredRoles = [], requiredTenantId = null) => {
    if (!user || !user.isAuthenticated) {
        throw new Error('Authentication required');
    }
    if (requiredRoles.length > 0 &&
        !requiredRoles.some((role) => Array.isArray(user.roles) && user.roles.includes(role))) {
        throw new Error('Authorization failed: Insufficient roles');
    }
    if (requiredTenantId && user.tenantId !== requiredTenantId) {
        throw new Error('Authorization failed: Tenant mismatch');
    }
};
const ensurePlanBelongsToTenant = async (ctx, planId, tenantId) => {
    const plan = await ctx.pg.oneOrNone('select id, tenant_id as "tenantId" from plan where id=$1', [planId]);
    if (!plan) {
        throw new Error('Plan not found');
    }
    if (plan.tenantId !== tenantId) {
        throw new Error('Plan does not belong to tenant');
    }
    return plan;
};
const entityLoaders = {
    Organization: async (ref, ctx) => {
        const id = (0, validators_js_1.validateOrgQueryInput)({ id: ref.id }).id;
        const row = await ctx.pg.oneOrNone('select id, name, region, created_at as "createdAt" from org where id=$1', [id]);
        return row ? { __typename: 'Organization', ...row } : null;
    },
    Tenant: async (ref, ctx) => {
        const validated = (0, validators_js_1.validateTenantQueryInput)({ id: ref.id });
        const orgFilter = ref.orgId ? ' and org_id=$2' : '';
        const params = ref.orgId
            ? [validated.id, (0, validators_js_1.validateOrgQueryInput)({ id: ref.orgId }).id]
            : [validated.id];
        const row = await ctx.pg.oneOrNone(`select id, org_id as "orgId", name, created_at as "createdAt" from tenant where id=$1${orgFilter}`, params);
        return row ? { __typename: 'Tenant', ...row } : null;
    },
    User: async (ref, ctx) => {
        const validated = (0, validators_js_1.validateUserQueryInput)({ id: ref.id });
        const tenantId = ref.tenantId;
        const tenantClause = tenantId ? ' and tenant_id=$2' : '';
        const params = tenantId
            ? [validated.id, (0, validators_js_1.validateTenantQueryInput)({ id: tenantId }).id]
            : [validated.id];
        const row = await ctx.pg.oneOrNone(`select id, tenant_id as "tenantId", email, created_at as "createdAt" from app_user where id=$1${tenantClause}`, params);
        return row ? { __typename: 'User', ...row } : null;
    },
    Role: async (ref, ctx) => {
        const row = await ctx.pg.oneOrNone('select id, name, created_at as "createdAt" from role where id=$1', [(0, validators_js_1.validateId)(ref.id, 'Role.id')]);
        return row ? { __typename: 'Role', ...row } : null;
    },
    Permission: async (ref, ctx) => {
        const row = await ctx.pg.oneOrNone('select id, name, description, created_at as "createdAt" from permission where id=$1', [(0, validators_js_1.validateId)(ref.id, 'Permission.id')]);
        return row ? { __typename: 'Permission', ...row } : null;
    },
    Policy: async (ref, ctx) => {
        const sql = ref.id
            ? 'select id, tenant_id as "tenantId", name, version, body, created_at as "createdAt" from policy where id=$1'
            : 'select id, tenant_id as "tenantId", name, version, body, created_at as "createdAt" from policy where tenant_id=$1 and name=$2 and version=$3';
        const params = ref.id
            ? [(0, validators_js_1.validateId)(ref.id, 'Policy.id')]
            : (() => {
                const validated = (0, validators_js_1.validatePolicyVersionInput)({
                    tenantId: ref.tenantId,
                    name: ref.name,
                    version: ref.version,
                });
                return [validated.tenantId, validated.name, validated.version];
            })();
        const row = await ctx.pg.oneOrNone(sql, params);
        return row ? { __typename: 'Policy', ...row } : null;
    },
    Plan: async (ref, ctx) => {
        const id = (0, validators_js_1.validateId)(ref.id, 'Plan.id');
        const tenantId = ref.tenantId ? (0, validators_js_1.validateTenantQueryInput)({ id: ref.tenantId }).id : null;
        const where = tenantId ? 'id=$1 and tenant_id=$2' : 'id=$1';
        const params = tenantId ? [id, tenantId] : [id];
        const row = await ctx.pg.oneOrNone(`select id, tenant_id as "tenantId", name, status, created_at as "createdAt", updated_at as "updatedAt" from plan where ${where}`, params);
        return row ? { __typename: 'Plan', ...row } : null;
    },
    Task: async (ref, ctx) => {
        const id = (0, validators_js_1.validateId)(ref.id, 'Task.id');
        const row = await ctx.pg.oneOrNone('select id, tenant_id as "tenantId", plan_id as "planId", name, status, created_at as "createdAt", updated_at as "updatedAt" from task where id=$1', [id]);
        return row ? { __typename: 'Task', ...row } : null;
    },
    Artifact: async (ref, ctx) => {
        const id = (0, validators_js_1.validateId)(ref.id, 'Artifact.id');
        const row = await ctx.pg.oneOrNone('select id, tenant_id as "tenantId", plan_id as "planId", kind, uri, hash, signature, user_id as "userId", service_account_id as "serviceAccountId", artifact_hash as "artifactHash", created_at as "createdAt" from artifact where id=$1', [id]);
        return row ? { __typename: 'Artifact', ...row } : null;
    },
    Model: async (ref, ctx) => {
        const id = (0, validators_js_1.validateId)(ref.id, 'Model.id');
        const row = await ctx.pg.oneOrNone('select id, tenant_id as "tenantId", name, version, created_at as "createdAt" from model where id=$1', [id]);
        return row ? { __typename: 'Model', ...row } : null;
    },
    DataSet: async (ref, ctx) => {
        const id = (0, validators_js_1.validateId)(ref.id, 'DataSet.id');
        const row = await ctx.pg.oneOrNone('select id, tenant_id as "tenantId", name, source, created_at as "createdAt" from data_set where id=$1', [id]);
        return row ? { __typename: 'DataSet', ...row } : null;
    },
    Eval: async (ref, ctx) => {
        const id = (0, validators_js_1.validateId)(ref.id, 'Eval.id');
        const row = await ctx.pg.oneOrNone('select id, tenant_id as "tenantId", model_id as "modelId", name, score, report_uri as "reportURI", created_at as "createdAt" from eval where id=$1', [id]);
        return row ? { __typename: 'Eval', ...row } : null;
    },
    Incident: async (ref, ctx) => {
        const id = (0, validators_js_1.validateId)(ref.id, 'Incident.id');
        const row = await ctx.pg.oneOrNone('select id, tenant_id as "tenantId", severity, description, created_at as "createdAt" from incident where id=$1', [id]);
        return row ? { __typename: 'Incident', ...row } : null;
    },
    Risk: async (ref, ctx) => {
        const id = (0, validators_js_1.validateId)(ref.id, 'Risk.id');
        const row = await ctx.pg.oneOrNone('select id, tenant_id as "tenantId", category, level, created_at as "createdAt" from risk where id=$1', [id]);
        return row ? { __typename: 'Risk', ...row } : null;
    },
    Control: async (ref, ctx) => {
        const id = (0, validators_js_1.validateId)(ref.id, 'Control.id');
        const row = await ctx.pg.oneOrNone('select id, tenant_id as "tenantId", name, evidence_uri as "evidenceURI", created_at as "createdAt" from control where id=$1', [id]);
        return row ? { __typename: 'Control', ...row } : null;
    },
    KPI: async (ref, ctx) => {
        const id = (0, validators_js_1.validateId)(ref.id, 'KPI.id');
        const row = await ctx.pg.oneOrNone('select id, tenant_id as "tenantId", name, value, ts from kpi where id=$1', [id]);
        return row ? { __typename: 'KPI', ...row } : null;
    },
    OKR: async (ref, ctx) => {
        const id = (0, validators_js_1.validateId)(ref.id, 'OKR.id');
        const row = await ctx.pg.oneOrNone('select id, tenant_id as "tenantId", objective, key_results as "keyResults", ts from okr where id=$1', [id]);
        return row ? { __typename: 'OKR', ...row } : null;
    },
    Asset: async (ref, ctx) => {
        const id = (0, validators_js_1.validateId)(ref.id, 'Asset.id');
        const row = await ctx.pg.oneOrNone('select id, tenant_id as "tenantId", kind, uri, labels, created_at as "createdAt" from asset where id=$1', [id]);
        return row ? { __typename: 'Asset', ...row } : null;
    },
};
exports.resolvers = {
    DateTime: DateTimeScalar,
    UUID: UUIDScalar,
    _Any: AnyScalar,
    _FieldSet: FieldSetScalar,
    Query: {
        org: async (_, { id }, ctx) => {
            authorize(ctx.user, ['admin', 'viewer']); // Example: only admins and viewers can see orgs
            const cacheKey = `org:${id}`;
            const cachedResult = cache.get(cacheKey);
            if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_TTL_MS) {
                ctx.logger.info(`Cache hit for ${cacheKey}`);
                return cachedResult.data;
            }
            ctx.logger.info(`Cache miss for ${cacheKey}, fetching from DB`);
            const result = await ctx.pg.oneOrNone('select id, name, region, created_at as "createdAt" from org where id=$1', [(0, validators_js_1.validateOrgQueryInput)({ id }).id]);
            if (result) {
                cache.set(cacheKey, { data: result, timestamp: Date.now() });
            }
            return result;
        },
        tenant: async (_, { id }, ctx) => {
            authorize(ctx.user, ['admin', 'viewer'], id); // Example: only admins/viewers of that tenant can see it
            return ctx.pg.oneOrNone('select id, org_id as "orgId", name, created_at as "createdAt" from tenant where id=$1', [(0, validators_js_1.validateTenantQueryInput)({ id }).id]);
        },
        user: async (_, { id }, ctx) => {
            authorize(ctx.user, ['admin', 'viewer']); // Example: only admins/viewers can see users
            // Ensure user can only see users within their tenant, unless they are a platform admin
            const query = ctx.user.roles.includes('platform_admin')
                ? 'select id, tenant_id as "tenantId", email, created_at as "createdAt" from app_user where id=$1'
                : 'select id, tenant_id as "tenantId", email, created_at as "createdAt" from app_user where id=$1 and tenant_id=$2';
            const params = ctx.user.roles.includes('platform_admin')
                ? [(0, validators_js_1.validateUserQueryInput)({ id }).id]
                : [(0, validators_js_1.validateUserQueryInput)({ id }).id, ctx.user.tenantId];
            return ctx.pg.oneOrNone(query, params);
        },
        roles: async (_, __, ctx) => {
            authorize(ctx.user, ['admin']);
            return ctx.pg.any('select id, name, created_at as "createdAt" from role');
        },
        permissions: async (_, __, ctx) => {
            authorize(ctx.user, ['admin']);
            return ctx.pg.any('select id, name, description, created_at as "createdAt" from permission');
        },
        policyHistory: async (_, args, ctx) => {
            authorize(ctx.user, ['admin', 'viewer'], args.tenantId);
            const validated = (0, validators_js_1.validatePolicyHistoryInput)(args);
            return ctx.pg.any('select id, tenant_id as "tenantId", name, version, body, created_at as "createdAt" from policy where tenant_id=$1 and name=$2 order by created_at desc limit $3', [validated.tenantId, validated.name, validated.limit]);
        },
        policyVersion: async (_, args, ctx) => {
            authorize(ctx.user, ['admin', 'viewer'], args.tenantId);
            const validated = (0, validators_js_1.validatePolicyVersionInput)(args);
            return ctx.pg.oneOrNone('select id, tenant_id as "tenantId", name, version, body, created_at as "createdAt" from policy where tenant_id=$1 and name=$2 and version=$3', [validated.tenantId, validated.name, validated.version]);
        },
        _service: () => ({ sdl: schemaSDL }),
        _entities: async (_, { representations }, ctx) => Promise.all(representations.map(async (ref) => {
            const loader = entityLoaders[ref.__typename];
            if (!loader)
                return null;
            return loader(ref, ctx);
        })),
        schemaInfo: () => ({
            version: SCHEMA_VERSION,
            lastUpdated: SCHEMA_LAST_UPDATED,
            hash: schemaHash,
            federated: true,
        }),
    },
    Mutation: {
        upsertPolicy: async (_, { tenantId, name, version, body }, ctx) => {
            authorize(ctx.user, ['admin'], tenantId); // Only admins of that tenant can upsert policies
            const input = (0, validators_js_1.validateUpsertPolicyInput)({ tenantId, name, version, body });
            const row = await ctx.pg.one('insert into policy(tenant_id, name, version, body) values($1,$2,$3,$4) on conflict (tenant_id, name, version) do update set body=excluded.body returning id, tenant_id as "tenantId", name, version, body, created_at as "createdAt"', [input.tenantId, input.name, input.version, input.body]);
            return row;
        },
        recordArtifact: async (_, args, ctx) => {
            authorize(ctx.user, ['admin', 'contributor'], args.tenantId); // Only admins/contributors of that tenant can record artifacts
            const { tenantId, planId, kind, uri, hash, signature, userId, serviceAccountId, artifactHash, } = (0, validators_js_1.validateRecordArtifactInput)(args);
            await ensurePlanBelongsToTenant(ctx, planId, tenantId);
            const row = await ctx.pg.one('insert into artifact(tenant_id, plan_id, kind, uri, hash, signature, user_id, service_account_id, artifact_hash) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id, tenant_id as "tenantId", plan_id as "planId", kind, uri, hash, signature, user_id as "userId", service_account_id as "serviceAccountId", artifact_hash as "artifactHash", created_at as "createdAt" ', [
                tenantId,
                planId,
                kind,
                uri,
                hash ?? null,
                signature ?? null,
                userId ?? null,
                serviceAccountId ?? null,
                artifactHash ?? null,
            ]);
            return row;
        },
        assignRoleToUser: async (_, { userId, roleId }, ctx) => {
            authorize(ctx.user, ['admin']); // Only admins can assign roles
            const { userId: validatedUserId, roleId: validatedRoleId } = (0, validators_js_1.validateAssignRoleInput)({
                userId,
                roleId,
            });
            // Logic to assign role to user, ensuring tenant scope if not platform_admin
            const user = await ctx.pg.oneOrNone('select tenant_id as "tenantId" from app_user where id=$1', [validatedUserId]);
            if (!user)
                throw new Error('User not found');
            authorize(ctx.user, ['admin'], user.tenantId); // Admin must be in the same tenant as the user
            await ctx.pg.one('insert into user_roles(user_id, role_id) values($1,$2) on conflict (user_id, role_id) do nothing', [validatedUserId, validatedRoleId]);
            return ctx.pg.oneOrNone('select id, tenant_id as "tenantId", email, roles, created_at as "createdAt" from app_user where id=$1', [validatedUserId]);
        },
        createRole: async (_, { name, permissionIds }, ctx) => {
            authorize(ctx.user, ['admin']); // Only admins can create roles
            const input = (0, validators_js_1.validateCreateRoleInput)({ name, permissionIds });
            const role = await ctx.pg.one('insert into role(name) values($1) returning id, name, now() as "createdAt" ', [input.name]);
            if (input.permissionIds && input.permissionIds.length > 0) {
                await ctx.pg.any('insert into role_permissions(role_id, permission_id) select $1, unnest($2::uuid[]) on conflict do nothing', [role.id, input.permissionIds]);
            }
            return role;
        },
        createPermission: async (_, { name, description }, ctx) => {
            authorize(ctx.user, ['admin']); // Only admins can create permissions
            const input = (0, validators_js_1.validateCreatePermissionInput)({ name, description });
            const permission = await ctx.pg.one('insert into permission(name, description) values($1,$2) returning id, name, description, now() as "createdAt" ', [input.name, input.description]);
            return permission;
        },
    },
    _Entity: {
        __resolveType(obj) {
            if (obj?.__typename)
                return obj.__typename;
            if ('region' in obj)
                return 'Organization';
            if ('orgId' in obj)
                return 'Tenant';
            if ('roles' in obj && 'email' in obj)
                return 'User';
            if ('permissions' in obj)
                return 'Role';
            if ('description' in obj && !('body' in obj))
                return 'Permission';
            if ('body' in obj && 'version' in obj)
                return 'Policy';
            if ('kind' in obj && 'uri' in obj)
                return 'Artifact';
            if ('planId' in obj && 'status' in obj)
                return 'Task';
            if ('objective' in obj)
                return 'OKR';
            if ('value' in obj && 'ts' in obj)
                return 'KPI';
            if ('category' in obj && 'level' in obj)
                return 'Risk';
            if ('evidenceURI' in obj)
                return 'Control';
            if ('severity' in obj)
                return 'Incident';
            if ('source' in obj)
                return 'DataSet';
            if ('score' in obj)
                return 'Eval';
            if ('version' in obj && 'name' in obj && !('body' in obj))
                return 'Model';
            if ('labels' in obj)
                return 'Asset';
            if ('status' in obj)
                return 'Plan';
            return null;
        },
    },
    Organization: { __resolveReference: (ref, ctx) => entityLoaders.Organization(ref, ctx) },
    Tenant: { __resolveReference: (ref, ctx) => entityLoaders.Tenant(ref, ctx) },
    User: {
        __resolveReference: (ref, ctx) => entityLoaders.User(ref, ctx),
        roles: async (user, _, ctx) => ctx.pg.any('select r.id, r.name, r.created_at as "createdAt" from role r join user_roles ur on ur.role_id=r.id where ur.user_id=$1 order by r.name', [user.id]),
    },
    Role: {
        __resolveReference: (ref, ctx) => entityLoaders.Role(ref, ctx),
        permissions: async (role, _, ctx) => ctx.pg.any('select p.id, p.name, p.description, p.created_at as "createdAt" from permission p join role_permissions rp on rp.permission_id=p.id where rp.role_id=$1 order by p.name', [role.id]),
    },
    Permission: { __resolveReference: (ref, ctx) => entityLoaders.Permission(ref, ctx) },
    Policy: { __resolveReference: (ref, ctx) => entityLoaders.Policy(ref, ctx) },
    Plan: { __resolveReference: (ref, ctx) => entityLoaders.Plan(ref, ctx) },
    Task: { __resolveReference: (ref, ctx) => entityLoaders.Task(ref, ctx) },
    Artifact: { __resolveReference: (ref, ctx) => entityLoaders.Artifact(ref, ctx) },
    Model: { __resolveReference: (ref, ctx) => entityLoaders.Model(ref, ctx) },
    DataSet: { __resolveReference: (ref, ctx) => entityLoaders.DataSet(ref, ctx) },
    Eval: { __resolveReference: (ref, ctx) => entityLoaders.Eval(ref, ctx) },
    Incident: { __resolveReference: (ref, ctx) => entityLoaders.Incident(ref, ctx) },
    Risk: { __resolveReference: (ref, ctx) => entityLoaders.Risk(ref, ctx) },
    Control: { __resolveReference: (ref, ctx) => entityLoaders.Control(ref, ctx) },
    KPI: { __resolveReference: (ref, ctx) => entityLoaders.KPI(ref, ctx) },
    OKR: { __resolveReference: (ref, ctx) => entityLoaders.OKR(ref, ctx) },
    Asset: { __resolveReference: (ref, ctx) => entityLoaders.Asset(ref, ctx) },
};
