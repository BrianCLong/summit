import { Request } from 'express';

export function ensureString(value: any): string {
  if (Array.isArray(value)) {
    return value[0] || '';
  }
  return typeof value === 'string' ? value : '';
}

export function getParam(req: Request, name: string): string {
  return ensureString(req.params[name]);
}

export function getQuery(req: Request, name: string): string {
  return ensureString(req.query[name]);
}
