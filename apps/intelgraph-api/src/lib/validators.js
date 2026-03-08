"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateOrgQueryInput = exports.validateTenantQueryInput = exports.validateUserQueryInput = exports.validateCreatePermissionInput = exports.validateCreateRoleInput = exports.validateAssignRoleInput = exports.validateRecordArtifactInput = exports.validatePolicyVersionInput = exports.validatePolicyHistoryInput = exports.validateUpsertPolicyInput = exports.validateVersion = exports.validateName = exports.validateId = void 0;
const zod_1 = require("zod");
const idSchema = zod_1.z
    .string()
    .uuid({ message: 'must be a valid UUID' })
    .brand();
const nameSchema = zod_1.z.string().trim().min(1, 'cannot be empty').max(255);
const versionSchema = zod_1.z
    .string()
    .trim()
    .regex(/^[vV]?\d+(\.\d+){0,2}([.-][A-Za-z0-9]+)?$/, 'must be semver-like')
    .max(64);
const bodySchema = zod_1.z.string().trim().min(1, 'cannot be empty');
const limitSchema = zod_1.z.number().int().min(1).max(100);
const normalizeOptional = (value) => value === '' || value === null || typeof value === 'undefined' ? undefined : value;
const optionalBoundedString = (max) => zod_1.z.preprocess(normalizeOptional, zod_1.z.string().trim().min(1).max(max).optional());
const parseOrThrow = (schema, payload, context) => {
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
        const message = parsed.error.issues
            .map((err) => `${context}${err.path.length ? `.${err.path.join('.')}` : ''} ${err.message}`)
            .join('; ');
        throw new Error(`Validation failed: ${message}`);
    }
    return parsed.data;
};
const validateId = (value, context = 'id') => parseOrThrow(idSchema, value, context);
exports.validateId = validateId;
const validateName = (value, context = 'name') => parseOrThrow(nameSchema, value, context);
exports.validateName = validateName;
const validateVersion = (value, context = 'version') => parseOrThrow(versionSchema, value, context);
exports.validateVersion = validateVersion;
const validateUpsertPolicyInput = (input) => parseOrThrow(zod_1.z.object({
    tenantId: idSchema,
    name: nameSchema,
    version: versionSchema,
    body: bodySchema,
}), input, 'upsertPolicy');
exports.validateUpsertPolicyInput = validateUpsertPolicyInput;
const validatePolicyHistoryInput = (input) => parseOrThrow(zod_1.z.object({
    tenantId: idSchema,
    name: nameSchema,
    limit: limitSchema.default(20),
}), input, 'policyHistory');
exports.validatePolicyHistoryInput = validatePolicyHistoryInput;
const validatePolicyVersionInput = (input) => parseOrThrow(zod_1.z.object({
    tenantId: idSchema,
    name: nameSchema,
    version: versionSchema,
}), input, 'policyVersion');
exports.validatePolicyVersionInput = validatePolicyVersionInput;
const validateRecordArtifactInput = (input) => parseOrThrow(zod_1.z.object({
    tenantId: idSchema,
    planId: idSchema,
    kind: nameSchema.max(64),
    uri: zod_1.z.string().trim().url(),
    hash: optionalBoundedString(256),
    signature: optionalBoundedString(256),
    userId: idSchema.optional(),
    serviceAccountId: optionalBoundedString(128),
    artifactHash: optionalBoundedString(256),
}), input, 'recordArtifact');
exports.validateRecordArtifactInput = validateRecordArtifactInput;
const validateAssignRoleInput = (input) => parseOrThrow(zod_1.z.object({
    userId: idSchema,
    roleId: idSchema,
}), input, 'assignRoleToUser');
exports.validateAssignRoleInput = validateAssignRoleInput;
const validateCreateRoleInput = (input) => parseOrThrow(zod_1.z.object({
    name: nameSchema,
    permissionIds: zod_1.z.array(idSchema).optional(),
}), input, 'createRole');
exports.validateCreateRoleInput = validateCreateRoleInput;
const validateCreatePermissionInput = (input) => parseOrThrow(zod_1.z.object({
    name: nameSchema,
    description: zod_1.z.string().trim().max(512).optional(),
}), input, 'createPermission');
exports.validateCreatePermissionInput = validateCreatePermissionInput;
const validateUserQueryInput = (input) => parseOrThrow(zod_1.z.object({
    id: idSchema,
}), input, 'user');
exports.validateUserQueryInput = validateUserQueryInput;
const validateTenantQueryInput = (input) => parseOrThrow(zod_1.z.object({
    id: idSchema,
}), input, 'tenant');
exports.validateTenantQueryInput = validateTenantQueryInput;
const validateOrgQueryInput = (input) => parseOrThrow(zod_1.z.object({
    id: idSchema,
}), input, 'org');
exports.validateOrgQueryInput = validateOrgQueryInput;
