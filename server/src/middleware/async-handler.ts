import { type Request, type Response, type NextFunction, type RequestHandler } from 'express';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

/**
 * A wrapper for async route handlers to catch errors and pass them to the next middleware.
 * This avoids the need for a try-catch block in every async route handler.
 *
 * @param fn - The async route handler function.
 * @returns An Express RequestHandler function.
 */
export const asyncHandler = (fn: AsyncRequestHandler): RequestHandler => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
