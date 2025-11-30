import { Request, Response, NextFunction } from 'express';
import Joi, { ObjectSchema } from 'joi';
import { z } from 'zod';
import { SanitizationUtils, SecurityValidator } from '../validation/index.js';

export type RequestTarget = 'body' | 'query' | 'params';

interface SchemaValidatorOptions {
  zodSchema?: z.ZodSchema<any>;
  joiSchema?: ObjectSchema<any>;
  target?: RequestTarget;
  allowUnknown?: boolean;
}

function formatJoiErrors(error: Joi.ValidationError) {
  return error.details.map((detail) => detail.message);
}

function formatZodErrors(error: z.ZodError) {
  return error.errors.map((err) => `${err.path.join('.') || 'value'}: ${err.message}`);
}

export function buildRequestValidator({
  zodSchema,
  joiSchema,
  target = 'body',
  allowUnknown = false,
}: SchemaValidatorOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const payload = (req as any)[target] ?? {};
      let validated = payload;

      if (joiSchema) {
        const { error, value } = joiSchema.validate(payload, {
          abortEarly: false,
          stripUnknown: !allowUnknown,
          convert: true,
        });

        if (error) {
          res.status(400).json({
            error: 'Validation failed',
            details: formatJoiErrors(error),
          });
          return;
        }

        validated = value;
      }

      if (zodSchema) {
        const result = zodSchema.safeParse(validated);
        if (!result.success) {
          res.status(400).json({
            error: 'Validation failed',
            details: formatZodErrors(result.error),
          });
          return;
        }
        validated = result.data;
      }

      const sanitized = SanitizationUtils.sanitizeUserInput(validated);
      const guardResult = SecurityValidator.validateInput(sanitized);

      if (!guardResult.valid) {
        res.status(400).json({
          error: 'Request rejected for security reasons',
          details: guardResult.errors,
        });
        return;
      }

      (req as any)[target] = sanitized;
      next();
    } catch (error) {
      res.status(500).json({ error: 'Request validation failed unexpectedly' });
    }
  };
}

export function createSqlInjectionGuard() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const payloadSnapshot = {
      body: req.body,
      query: req.query,
      params: req.params,
    };

    const result = SecurityValidator.validateInput(payloadSnapshot);
    if (!result.valid) {
      res.status(400).json({
        error: 'Suspicious input detected',
        details: result.errors,
      });
      return;
    }

    next();
  };
}
