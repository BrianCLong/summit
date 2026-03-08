/**
 * Validation Middleware
 *
 * Validates request data against JSON schemas
 */

import Ajv, { type JSONSchemaType } from 'ajv';
import addFormats from 'ajv-formats';
import type { Request, Response, NextFunction, JSONSchema } from '../types';
import { ValidationException } from './error-handler';

const ajv = new Ajv({
  allErrors: true,
  removeAdditional: true,
  coerceTypes: true,
  useDefaults: true,
});

addFormats(ajv);

export interface ValidationSchemas {
  body?: JSONSchema;
  query?: JSONSchema;
  params?: JSONSchema;
  headers?: JSONSchema;
}

/**
 * Validate request data
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    req.validated = {};

    try {
      // Validate body
      if (schemas.body) {
        const validate = ajv.compile(schemas.body);
        const valid = validate(req.body);

        if (!valid) {
          throw new ValidationException('Request body validation failed', {
            errors: validate.errors,
          });
        }

        req.validated.body = req.body;
      }

      // Validate query
      if (schemas.query) {
        const validate = ajv.compile(schemas.query);
        const valid = validate(req.query);

        if (!valid) {
          throw new ValidationException('Query parameters validation failed', {
            errors: validate.errors,
          });
        }

        req.validated.query = req.query;
      }

      // Validate params
      if (schemas.params) {
        const validate = ajv.compile(schemas.params);
        const valid = validate(req.params);

        if (!valid) {
          throw new ValidationException('Path parameters validation failed', {
            errors: validate.errors,
          });
        }

        req.validated.params = req.params;
      }

      // Validate headers
      if (schemas.headers) {
        const validate = ajv.compile(schemas.headers);
        const valid = validate(req.headers);

        if (!valid) {
          throw new ValidationException('Headers validation failed', {
            errors: validate.errors,
          });
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
