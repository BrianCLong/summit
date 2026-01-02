// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

/**
 * Zod-based request validation middleware
 * Validates params, body, and query against provided Zod schemas
 */
export const validateRequest = (schemas: {
  params?: AnyZodObject;
  body?: AnyZodObject;
  query?: AnyZodObject;
}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      next();
    } catch (error: any) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        }));
        return res.status(400).json({
          error: 'Validation failed',
          details: formattedErrors,
        });
      }
      next(error);
    }
  };
};

// Legacy validation interface for backward compatibility
interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  format?: 'uri' | string;
  pattern?: string;
}

interface ValidationSchema {
  [key: string]: ValidationRule;
}

/**
 * @deprecated Use validateRequest with Zod schemas instead
 */
export function validateRequestLegacy(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction): Response | void => {
    const body = req.body || {};
    for (const [key, rules] of Object.entries(schema)) {
      if (
        rules.required &&
        (body[key] === undefined || body[key] === null || body[key] === '')
      ) {
        return res
          .status(400)
          .json({ error: `Missing required field: ${key}` });
      }
      if (typeof body[key] === 'string') {
        if (rules.minLength && body[key].length < rules.minLength) {
          return res.status(400).json({
            error: `${key} must be at least ${rules.minLength} characters`,
          });
        }
        if (rules.maxLength && body[key].length > rules.maxLength) {
          return res.status(400).json({
            error: `${key} must be at most ${rules.maxLength} characters`,
          });
        }
        if (rules.format === 'uri') {
          try {
            new URL(body[key]);
          } catch {
            return res
              .status(400)
              .json({ error: `${key} must be a valid URI` });
          }
        }
        if (rules.pattern) {
          const re = new RegExp(rules.pattern);
          if (!re.test(body[key]))
            return res.status(400).json({ error: `${key} invalid format` });
        }
      }
    }
    next();
  };
}
