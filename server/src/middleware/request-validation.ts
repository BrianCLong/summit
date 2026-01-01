import { type Request, type Response, type NextFunction } from 'express';
import { z, type AnyZodObject } from 'zod';

const DEFAULT_ERROR_MESSAGE =
  'Request failed validation. Please correct the highlighted fields and try again.';

export type RequestPart = 'body' | 'query' | 'params';

export interface ValidationOptions {
  target?: RequestPart;
  logContext?: (req: Request) => Record<string, unknown>;
}

export const createValidator = (
  schema: AnyZodObject,
  options: ValidationOptions = {},
) => {
  const target = options.target ?? 'body';

  return (req: Request, res: Response, next: NextFunction) => {
    const payload = (req as any)[target];
    const result = schema.safeParse(payload);

    if (!result.success) {
      const details = result.error.errors.map((error) => ({
        path: error.path.join('.'),
        message: error.message,
      }));

      res.status(400).json({
        error: DEFAULT_ERROR_MESSAGE,
        details,
        ...(options.logContext ? { context: options.logContext(req) } : {}),
      });
      return;
    }

    (req as any)[target] = result.data;
    next();
  };
};

const MAX_GRAPHQL_QUERY_LENGTH = 20000;
const MAX_GRAPHQL_VARIABLES = 50;

const graphqlRequestSchema = z
  .object({
    query: z
      .string()
      .trim()
      .min(1, 'query is required')
      .max(
        MAX_GRAPHQL_QUERY_LENGTH,
        `query must be under ${MAX_GRAPHQL_QUERY_LENGTH} characters to prevent abuse`,
      ),
    operationName: z.string().trim().max(100).optional(),
    variables: z
      .record(z.string(), z.unknown())
      .optional()
      .refine(
        (vars) => !vars || Object.keys(vars).length <= MAX_GRAPHQL_VARIABLES,
        `variables may include at most ${MAX_GRAPHQL_VARIABLES} entries`,
      ),
    extensions: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const graphqlRequestGuard = createValidator(graphqlRequestSchema, {
  target: 'body',
});
