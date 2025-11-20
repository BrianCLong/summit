/**
 * Zod-based Request Validation Middleware
 * Validates request body, query params, and path params against Zod schemas
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export interface ValidationSchemas {
  body?: z.ZodType<any>;
  query?: z.ZodType<any>;
  params?: z.ZodType<any>;
}

/**
 * Validates request against Zod schemas
 * Attaches validated data to req.validated
 */
export function validate(schemas: ValidationSchemas) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate body
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }

      // Validate query params
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }

      // Validate path params
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        });
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validates response data against a Zod schema
 * Useful for ensuring API contracts are maintained
 */
export function validateResponse<T>(schema: z.ZodType<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      console.error('Response validation failed:', error.errors);
      // In production, log but don't throw - return data as-is
      if (process.env.NODE_ENV === 'production') {
        return data as T;
      }
      throw new Error(
        `Response validation failed: ${JSON.stringify(error.errors)}`,
      );
    }
    throw error;
  }
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      validated?: {
        body?: any;
        query?: any;
        params?: any;
      };
    }
  }
}
