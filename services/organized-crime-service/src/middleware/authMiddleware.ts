/**
 * Authorization and Access Control Middleware
 *
 * Enforces strict access controls for organized crime intelligence platform
 */

import { Request, Response, NextFunction } from 'express';

export interface AuthorizedUser {
  id: string;
  username: string;
  agency: string;
  role: string;
  clearanceLevel: 'UNCLASSIFIED' | 'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET';
  authorizedSystems: string[];
  badgeNumber?: string;
  needToKnow: string[]; // Case numbers, operations, etc.
}

/**
 * Verify user has valid credentials and authorization
 */
export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract authentication token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No authentication token provided' });
      return;
    }

    const token = authHeader.substring(7);

    // Verify token and extract user info
    // In production, this would validate against agency authentication system
    const user = await verifyToken(token);

    if (!user) {
      res.status(401).json({ error: 'Invalid or expired authentication token' });
      return;
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Verify user has required clearance level
 */
export const requireClearance = (minLevel: AuthorizedUser['clearanceLevel']) => {
  const clearanceLevels = ['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'];

  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user as AuthorizedUser;

    if (!user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const userLevel = clearanceLevels.indexOf(user.clearanceLevel);
    const requiredLevel = clearanceLevels.indexOf(minLevel);

    if (userLevel < requiredLevel) {
      res.status(403).json({
        error: 'Insufficient clearance level',
        required: minLevel,
        current: user.clearanceLevel
      });
      return;
    }

    next();
  };
};

/**
 * Verify user has need-to-know for specific case/operation
 */
export const requireNeedToKnow = (caseIdParam: string = 'caseId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user as AuthorizedUser;
    const caseId = req.params[caseIdParam] || req.body.caseId;

    if (!caseId) {
      res.status(400).json({ error: 'Case ID required' });
      return;
    }

    // Check if user has need-to-know for this case
    if (!user.needToKnow.includes(caseId) && !user.needToKnow.includes('*')) {
      res.status(403).json({
        error: 'Access denied - no need-to-know authorization for this case'
      });
      return;
    }

    next();
  };
};

/**
 * Verify user has specific role
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user as AuthorizedUser;

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({
        error: 'Access denied - insufficient role',
        required: allowedRoles,
        current: user.role
      });
      return;
    }

    next();
  };
};

/**
 * Require justification for data access
 */
export const requireJustification = (req: Request, res: Response, next: NextFunction): void => {
  const justification = req.body.justification || req.query.justification;

  if (!justification || typeof justification !== 'string' || justification.trim().length < 10) {
    res.status(400).json({
      error: 'Detailed justification required for data access (minimum 10 characters)'
    });
    return;
  }

  req.justification = justification;
  next();
};

/**
 * Verify active legal authority exists
 */
export const requireLegalAuthority = (req: Request, res: Response, next: NextFunction): void => {
  const legalAuthorityRef = req.body.legalAuthorityRef || req.query.legalAuthorityRef;

  if (!legalAuthorityRef) {
    res.status(400).json({
      error: 'Legal authority reference required (warrant, court order, etc.)'
    });
    return;
  }

  // In production, verify the legal authority is valid and not expired
  req.legalAuthorityRef = legalAuthorityRef;
  next();
};

/**
 * Token verification (stub - implement with actual auth system)
 */
async function verifyToken(token: string): Promise<AuthorizedUser | null> {
  // In production, validate token against agency authentication system
  // This is a stub implementation
  return {
    id: 'user123',
    username: 'analyst',
    agency: 'FBI',
    role: 'INTELLIGENCE_ANALYST',
    clearanceLevel: 'SECRET',
    authorizedSystems: ['ORGANIZED_CRIME', 'TRAFFICKING', 'FINANCIAL_CRIME'],
    needToKnow: ['*'] // Temp - all cases
  };
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthorizedUser;
      justification?: string;
      legalAuthorityRef?: string;
    }
  }
}
