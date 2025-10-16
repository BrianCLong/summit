import type { Request, Response, NextFunction } from 'express';

function escape(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function sanitize(value: any): any {
  if (typeof value === 'string') return escape(value);
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = sanitize(val);
    }
    return result;
  }
  return value;
}

export default function sanitizeRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  next();
}
