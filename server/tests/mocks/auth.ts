
import { Request, Response, NextFunction } from 'express';

export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    // Mock successful authentication
    (req as any).user = {
        id: 'mock-user-id',
        tenantId: 'test-tenant',
        role: 'ADMIN',
        email: 'test@example.com'
    };
    next();
};

export const requirePermission = (permission: string) => {
    return (req: Request, res: Response, next: NextFunction) => next();
};

export const ensureRole = (role: string | string[]) => {
    return (req: Request, res: Response, next: NextFunction) => next();
};

export const authMiddleware = ensureAuthenticated;
export const auth = ensureAuthenticated;
