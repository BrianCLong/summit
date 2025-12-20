import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';
export const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication token required' });
        }
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        try {
            const decoded = jwt.verify(token, config.auth.jwtSecret);
            req.user = {
                id: decoded.userId || decoded.id,
                email: decoded.email,
                role: decoded.role || 'user',
            };
            next();
        }
        catch (jwtError) {
            logger.warn('Invalid JWT token:', jwtError);
            return res.status(401).json({ error: 'Invalid authentication token' });
        }
    }
    catch (error) {
        logger.error('Authentication error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
};
export const authorize = (allowedRoles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            if (!allowedRoles.includes(req.user.role)) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }
            next();
        }
        catch (error) {
            logger.error('Authorization error:', error);
            return res.status(500).json({ error: 'Authorization failed' });
        }
    };
};
