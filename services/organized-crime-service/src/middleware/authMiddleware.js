"use strict";
/**
 * Authorization and Access Control Middleware
 *
 * Enforces strict access controls for organized crime intelligence platform
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireLegalAuthority = exports.requireJustification = exports.requireRole = exports.requireNeedToKnow = exports.requireClearance = exports.authenticateUser = void 0;
/**
 * Verify user has valid credentials and authorization
 */
const authenticateUser = async (req, res, next) => {
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
    }
    catch (error) {
        res.status(401).json({ error: 'Authentication failed' });
    }
};
exports.authenticateUser = authenticateUser;
/**
 * Verify user has required clearance level
 */
const requireClearance = (minLevel) => {
    const clearanceLevels = ['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'];
    return (req, res, next) => {
        const user = req.user;
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
exports.requireClearance = requireClearance;
/**
 * Verify user has need-to-know for specific case/operation
 */
const requireNeedToKnow = (caseIdParam = 'caseId') => {
    return (req, res, next) => {
        const user = req.user;
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
exports.requireNeedToKnow = requireNeedToKnow;
/**
 * Verify user has specific role
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        const user = req.user;
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
exports.requireRole = requireRole;
/**
 * Require justification for data access
 */
const requireJustification = (req, res, next) => {
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
exports.requireJustification = requireJustification;
/**
 * Verify active legal authority exists
 */
const requireLegalAuthority = (req, res, next) => {
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
exports.requireLegalAuthority = requireLegalAuthority;
/**
 * Token verification (stub - implement with actual auth system)
 */
async function verifyToken(token) {
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
