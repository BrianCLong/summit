import { z } from 'zod';

const idSchema = z
  .string()
  .uuid({ message: 'must be a valid UUID' })
  .brand<'uuid'>();
const nameSchema = z.string().trim().min(1, 'cannot be empty').max(255);
const versionSchema = z
  .string()
  .trim()
  .regex(/^[vV]?\d+(\.\d+){0,2}([.-][A-Za-z0-9]+)?$/, 'must be semver-like')
  .max(64);
const bodySchema = z.string().trim().min(1, 'cannot be empty');
const limitSchema = z.number().int().min(1).max(100);

const normalizeOptional = (value: unknown) =>
  value === '' || value === null || typeof value === 'undefined' ? undefined : value;

const optionalBoundedString = (max: number) =>
  z.preprocess(normalizeOptional, z.string().trim().min(1).max(max).optional());

const parseOrThrow = <T>(schema: z.ZodType<T>, payload: unknown, context: string) => {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    const message = parsed.error.errors
      .map((err) => `${context}${err.path.length ? `.${err.path.join('.')}` : ''} ${err.message}`)
      .join('; ');
    throw new Error(`Validation failed: ${message}`);
  }
  return parsed.data;
};

export const validateId = (value: unknown, context = 'id') =>
  parseOrThrow(idSchema, value, context);

export const validateName = (value: unknown, context = 'name') =>
  parseOrThrow(nameSchema, value, context);

export const validateVersion = (value: unknown, context = 'version') =>
  parseOrThrow(versionSchema, value, context);

export const validateUpsertPolicyInput = (input: unknown) =>
  parseOrThrow(
    z.object({
      tenantId: idSchema,
      name: nameSchema,
      version: versionSchema,
      body: bodySchema,
    }),
    input,
    'upsertPolicy',
  );

export const validatePolicyHistoryInput = (input: unknown) =>
  parseOrThrow(
    z.object({
      tenantId: idSchema,
      name: nameSchema,
      limit: limitSchema.default(20),
    }),
    input,
    'policyHistory',
  );

export const validatePolicyVersionInput = (input: unknown) =>
  parseOrThrow(
    z.object({
      tenantId: idSchema,
      name: nameSchema,
      version: versionSchema,
    }),
    input,
    'policyVersion',
  );

export const validateRecordArtifactInput = (input: unknown) =>
  parseOrThrow(
    z.object({
      tenantId: idSchema,
      planId: idSchema,
      kind: nameSchema.max(64),
      uri: z.string().trim().url(),
      hash: optionalBoundedString(256),
      signature: optionalBoundedString(256),
      userId: idSchema.optional(),
      serviceAccountId: optionalBoundedString(128),
      artifactHash: optionalBoundedString(256),
    }),
    input,
    'recordArtifact',
  );

export const validateAssignRoleInput = (input: unknown) =>
  parseOrThrow(
    z.object({
      userId: idSchema,
      roleId: idSchema,
    }),
    input,
    'assignRoleToUser',
  );

export const validateCreateRoleInput = (input: unknown) =>
  parseOrThrow(
    z.object({
      name: nameSchema,
      permissionIds: z.array(idSchema).optional(),
    }),
    input,
    'createRole',
  );

export const validateCreatePermissionInput = (input: unknown) =>
  parseOrThrow(
    z.object({
      name: nameSchema,
      description: z.string().trim().max(512).optional(),
    }),
    input,
    'createPermission',
  );

export const validateUserQueryInput = (input: unknown) =>
  parseOrThrow(
    z.object({
      id: idSchema,
    }),
    input,
    'user',
  );

export const validateTenantQueryInput = (input: unknown) =>
  parseOrThrow(
    z.object({
      id: idSchema,
    }),
    input,
    'tenant',
  );

export const validateOrgQueryInput = (input: unknown) =>
  parseOrThrow(
    z.object({
      id: idSchema,
    }),
    input,
    'org',
  );
