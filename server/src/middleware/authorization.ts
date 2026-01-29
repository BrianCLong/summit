import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest, Permission } from '../security/permissions.js';
import { normalizePermission, userHasPermission } from '../security/permissions.js';

export function authorize(requiredPermission: Permission) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const normalized = normalizePermission(requiredPermission);
    const allowed = normalized && userHasPermission(req.user, normalized);

    if (!allowed) {
      return res.status(403).json({
        error: 'Forbidden',
        required: normalized || requiredPermission,
        actorRole: req.user.role,
      });
    }

    return next();
  };
}

export { userHasPermission };

export default authorize;
