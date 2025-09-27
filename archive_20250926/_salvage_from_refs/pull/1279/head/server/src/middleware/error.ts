import type { Request, Response, NextFunction } from "express";

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = err?.status || 500;
  const problem = {
    type: err?.type || "about:blank",
    title: err?.title || (status >= 500 ? "Internal Server Error" : "Bad Request"),
    status,
    detail: err?.message || "An unexpected error occurred"
  } as const;
  res.status(status).json(problem);
}