import { NextFunction, Request, Response } from 'express';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function sanitizeValue(input: unknown): unknown {
  if (typeof input === 'string') {
    return escapeHtml(input).trim().slice(0, 10000);
  }

  if (Array.isArray(input)) {
    return input.slice(0, 1000).map((item) => sanitizeValue(item));
  }

  if (input && typeof input === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (Object.keys(sanitized).length >= 100) break;
      sanitized[key] = sanitizeValue(value);
    }
    return sanitized;
  }

  return input;
}

export default function sanitizeRequest(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (req.body !== undefined) {
    req.body = sanitizeValue(req.body);
  }

  if (req.query !== undefined) {
    req.query = sanitizeValue(req.query) as Request['query'];
  }

  if (req.params !== undefined) {
    req.params = sanitizeValue(req.params) as Request['params'];
  }

  next();
}
