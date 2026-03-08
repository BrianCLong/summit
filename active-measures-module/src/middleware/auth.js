"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateUser = authenticateUser;
exports.authorizeOperation = authorizeOperation;
exports.createAuthContext = createAuthContext;
exports.generateToken = generateToken;
exports.validatePassword = validatePassword;
exports.requireAuth = requireAuth;
exports.requirePermission = requirePermission;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = __importDefault(require("../utils/logger"));
const metrics_1 = require("../utils/metrics");
const JWT_SECRET = process.env.JWT_SECRET || 'active-measures-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
// Classification levels hierarchy (higher number = higher clearance)
const CLEARANCE_LEVELS = {
    UNCLASSIFIED: 0,
    CONFIDENTIAL: 1,
    SECRET: 2,
    TOP_SECRET: 3,
    SCI: 4,
};
// Mock user database - in production, this would be a proper database
const MOCK_USERS = {
    'analyst1': {
        id: 'user_001',
        username: 'analyst1',
        passwordHash: '$2b$10$example.hash.here',
        role: 'ANALYST',
        clearanceLevel: 'SECRET',
        permissions: ['READ_operations', 'create_simulations', 'view_audit_trail'],
        activeOperations: [],
    },
    'operator1': {
        id: 'user_002',
        username: 'operator1',
        passwordHash: '$2b$10$example.hash.here',
        role: 'OPERATOR',
        clearanceLevel: 'TOP_SECRET',
        permissions: ['read_operations', 'create_operations', 'execute_operations', 'create_simulations'],
        activeOperations: [],
    },
    'supervisor1': {
        id: 'user_003',
        username: 'supervisor1',
        passwordHash: '$2b$10$example.hash.here',
        role: 'SUPERVISOR',
        clearanceLevel: 'TOP_SECRET',
        permissions: ['all_permissions'],
        activeOperations: [],
    },
};
async function authenticateUser(req) {
    try {
        const authHeader = req.headers?.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            logger_1.default.warn('Missing or invalid authorization header', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
            });
            metrics_1.metricsCollector.incrementCounter('auth_failures_missing_token');
            return null;
        }
        const token = authHeader.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // In production, fetch user from database
        const userRecord = MOCK_USERS[decoded.username];
        if (!userRecord) {
            logger_1.default.warn('User not found', { username: decoded.username });
            metrics_1.metricsCollector.incrementCounter('auth_failures_user_not_found');
            return null;
        }
        const user = {
            id: userRecord.id,
            username: userRecord.username,
            role: userRecord.role,
            clearanceLevel: userRecord.clearanceLevel,
            permissions: userRecord.permissions,
            activeOperations: userRecord.activeOperations,
        };
        logger_1.default.info('User authenticated successfully', {
            userId: user.id,
            username: user.username,
            role: user.role,
            clearanceLevel: user.clearanceLevel,
        });
        metrics_1.metricsCollector.incrementCounter('auth_successes');
        return user;
    }
    catch (error) {
        logger_1.default.error('Authentication failed', {
            error: error.message,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
        });
        metrics_1.metricsCollector.incrementCounter('auth_failures_invalid_token');
        return null;
    }
}
function authorizeOperation(user, operation, resourceClassification) {
    try {
        // Check if user has required permission
        if (!user.permissions.includes('all_permissions') && !user.permissions.includes(operation)) {
            logger_1.default.warn('Operation not permitted', {
                userId: user.id,
                operation,
                userPermissions: user.permissions,
            });
            metrics_1.metricsCollector.incrementCounter('authorization_failures_permission');
            return false;
        }
        // Check clearance level if resource has classification
        if (resourceClassification) {
            const userClearance = CLEARANCE_LEVELS[user.clearanceLevel] || 0;
            const requiredClearance = CLEARANCE_LEVELS[resourceClassification] || 0;
            if (userClearance < requiredClearance) {
                logger_1.default.warn('Insufficient clearance level', {
                    userId: user.id,
                    operation,
                    userClearance: user.clearanceLevel,
                    requiredClearance: resourceClassification,
                });
                metrics_1.metricsCollector.incrementCounter('authorization_failures_clearance');
                return false;
            }
        }
        logger_1.default.debug('Operation authorized', {
            userId: user.id,
            operation,
            resourceClassification,
        });
        metrics_1.metricsCollector.incrementCounter('authorization_successes');
        return true;
    }
    catch (error) {
        logger_1.default.error('Authorization check failed', {
            error: error.message,
            userId: user.id,
            operation,
        });
        metrics_1.metricsCollector.incrementCounter('authorization_failures_error');
        return false;
    }
}
function createAuthContext(user) {
    return {
        user,
        isAuthenticated: user !== null,
        hasPermission: (permission) => {
            if (!user)
                return false;
            return user.permissions.includes('all_permissions') || user.permissions.includes(permission);
        },
        hasClearance: (level) => {
            if (!user)
                return false;
            const userClearance = CLEARANCE_LEVELS[user.clearanceLevel] || 0;
            const requiredClearance = CLEARANCE_LEVELS[level] || 0;
            return userClearance >= requiredClearance;
        },
    };
}
// Generate JWT token for user (used in login)
function generateToken(user) {
    const payload = {
        id: user.id,
        username: user.username,
        role: user.role,
        clearanceLevel: user.clearanceLevel,
    };
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
// Validate password (mock implementation)
async function validatePassword(username, password) {
    const userRecord = MOCK_USERS[username];
    if (!userRecord) {
        logger_1.default.warn('Login attempt for non-existent user', { username });
        metrics_1.metricsCollector.incrementCounter('login_failures_user_not_found');
        return null;
    }
    // In production, use proper bcrypt comparison
    // const isValid = await bcrypt.compare(password, userRecord.passwordHash);
    const isValid = password === 'demo-password'; // Mock validation
    if (!isValid) {
        logger_1.default.warn('Invalid password', { username });
        metrics_1.metricsCollector.incrementCounter('login_failures_invalid_password');
        return null;
    }
    const user = {
        id: userRecord.id,
        username: userRecord.username,
        role: userRecord.role,
        clearanceLevel: userRecord.clearanceLevel,
        permissions: userRecord.permissions,
        activeOperations: userRecord.activeOperations,
    };
    logger_1.default.info('User login successful', {
        userId: user.id,
        username: user.username,
        role: user.role,
    });
    metrics_1.metricsCollector.incrementCounter('login_successes');
    return user;
}
// Express middleware for authentication
function requireAuth(req, res, next) {
    authenticateUser(req)
        .then((user) => {
        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        req.user = user;
        req.authContext = createAuthContext(user);
        next();
    })
        .catch((error) => {
        logger_1.default.error('Authentication middleware error', { error: error.message });
        res.status(500).json({ error: 'Authentication error' });
    });
}
// Express middleware for authorization
function requirePermission(operation, classification) {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!authorizeOperation(user, operation, classification)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
}
exports.default = {
    authenticateUser,
    authorizeOperation,
    createAuthContext,
    generateToken,
    validatePassword,
    requireAuth,
    requirePermission,
};
