// @ts-nocheck
/**
 * Centralized Validation Utilities
 *
 * This module exports all validation schemas, validators, and sanitization utilities
 * for use across the application.
 *
 * Usage:
 * ```typescript
 * import { EmailSchema, SanitizationUtils, validateInput } from './validation';
 *
 * // Validate email
 * const result = EmailSchema.safeParse(userInput);
 *
 * // Sanitize HTML
 * const safe = SanitizationUtils.sanitizeHTML(untrustedInput);
 *
 * // Validate with helper
 * const validated = await validateInput(EntityIdSchema, params.id);
 * ```
 */

// Export all validation schemas
export {
  TenantIdSchema,
  EntityIdSchema,
  ConfidenceSchema,
  TimestampSchema,
  EntityKindSchema,
  EntityLabelsSchema,
  EntityPropsSchema,
  RelationshipTypeSchema,
  InvestigationNameSchema,
  InvestigationStatusSchema,
  CustomMetadataSchema,
  BudgetLimitSchema,
  CostEstimateSchema,
  TokenCountSchema,
  EmailSchema,
  URLSchema,
  PaginationSchema,
  SearchQuerySchema,
  FileUploadSchema,
  IPAddressSchema,
  PhoneNumberSchema,
  DateRangeSchema,
  GraphQLInputSchema,
} from './MutationValidators.js';

// Export validator classes
export {
  BusinessRuleValidator,
  RateLimitValidator,
  SecurityValidator,
  SanitizationUtils,
  QueryValidator,
} from './MutationValidators.js';

import { z } from 'zod/v4';
import type { ZodSchema, ZodError } from 'zod/v4';
import { GraphQLError } from 'graphql';

/**
 * Helper function to validate input against a Zod schema
 * Throws GraphQLError if validation fails
 */
export function validateInput<T>(
  schema: ZodSchema<T>,
  schema: z.ZodType<T>,
  data: unknown,
  errorMessage?: string
): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new GraphQLError(errorMessage || `Validation failed: ${errors}`, {
      extensions: { code: 'BAD_USER_INPUT', validationErrors: result.error.issues },
    // Cast to any to access .errors if types are mismatched due to Zod version differences
    const error = result.error as any;
    const errors = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new GraphQLError(errorMessage || `Validation failed: ${errors}`, {
      extensions: { code: 'BAD_USER_INPUT', validationErrors: error.errors },
    });
  }

  return result.data;
}

/**
 * Helper function to validate input and return result object
 * Does not throw, returns success/error information
 */
export function validateInputSafe<T>(
  schema: ZodSchema<T>,
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: ZodError } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error };
}

/**
 * Middleware factory for Express/GraphQL context validation
 */
export function createValidationMiddleware<T>(
  schema: ZodSchema<T>,
  schema: z.ZodType<T>,
  dataExtractor: (req: any) => unknown
) {
  return async (req: any, res: any, next: any) => {
    try {
      const data = dataExtractor(req);
      const validated = validateInput(schema, data);
      req.validated = validated;
      next();
    } catch (error) {
      if (error instanceof GraphQLError) {
        res.status(400).json({
          error: error.message,
          details: error.extensions,
        });
      } else {
        next(error);
      }
    }
  };
}

/**
 * GraphQL resolver wrapper with automatic validation
 */
export function withValidation<TArgs, TResult>(
  schema: z.ZodType<TArgs>,
  resolver: (parent: any, args: TArgs, context: any, info: any) => Promise<TResult> | TResult
) {
  return async (parent: any, args: any, context: any, info: any): Promise<TResult> => {
    const validatedArgs = validateInput(schema, args);
    return resolver(parent, validatedArgs, context, info);
  };
}

/**
 * Batch validation for arrays of inputs
 */
export function validateBatch<T>(
  schema: ZodSchema<T>,
  schema: z.ZodType<T>,
  items: unknown[],
  options?: { stopOnFirstError?: boolean }
): { valid: T[]; errors: Array<{ index: number; errors: ZodError }> } {
  const valid: T[] = [];
  const errors: Array<{ index: number; errors: ZodError }> = [];

  for (let i = 0; i < items.length; i++) {
    const result = schema.safeParse(items[i]);
    if (result.success) {
      valid.push(result.data);
    } else {
      errors.push({ index: i, errors: result.error });
      if (options?.stopOnFirstError) {
        break;
      }
    }
  }

  return { valid, errors };
}

/**
 * Compose multiple validation schemas
 */
export function composeValidators<T>(...validators: Array<ZodSchema<any>>): ZodSchema<T> {
  return validators.reduce((acc, validator) => acc.and(validator)) as ZodSchema<T>;
export function composeValidators<T>(...validators: Array<z.ZodType<any>>): z.ZodType<T> {
  return validators.reduce((acc, validator) => acc.and(validator)) as z.ZodType<T>;
}

/**
 * Create a conditional validator
 */
export function conditionalValidation<T>(
  condition: (data: any) => boolean,
  schemaTrue: ZodSchema<T>,
  schemaFalse: ZodSchema<T>
  schemaTrue: z.ZodType<T>,
  schemaFalse: z.ZodType<T>
) {
  return z.any().transform((data) => {
    const schema = condition(data) ? schemaTrue : schemaFalse;
    return schema.parse(data);
  }) as ZodSchema<T>;
  }) as z.ZodType<T>;
}
