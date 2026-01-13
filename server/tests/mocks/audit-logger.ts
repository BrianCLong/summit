// Mock for middleware/audit-logger
import { Request, Response, NextFunction } from 'express';

export const auditLogger = (_req: Request, _res: Response, next: NextFunction) => {
  next();
};

export const createAuditLogger = () => auditLogger;

export const logAuditEvent = async (_event: any): Promise<void> => { };

const mock = {
  auditLogger,
  createAuditLogger,
  logAuditEvent,
};

export = mock;
