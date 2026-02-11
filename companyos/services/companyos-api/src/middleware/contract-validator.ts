import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";

export function validateRequest(schema: { params?: AnyZodObject; body?: AnyZodObject; query?: AnyZodObject }) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.params) schema.params.parse(req.params);
      if (schema.body) schema.body.parse(req.body);
      if (schema.query) schema.query.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "contract_violation",
          details: error.errors,
        });
      }
      next(error);
    }
  };
}
