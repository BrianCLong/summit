"use strict";
/**
 * Security Module for Admin CLI
 * Handles token security, secret management, and compliance
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultRateLimiter = exports.RateLimiter = void 0;
exports.configureSecurity = configureSecurity;
exports.validateToken = validateToken;
exports.generateNonce = generateNonce;
exports.generateRequestSignature = generateRequestSignature;
exports.sanitizeForLogging = sanitizeForLogging;
exports.maskToken = maskToken;
exports.checkSecureEnvironment = checkSecureEnvironment;
exports.checkProductionReadiness = checkProductionReadiness;
const node_crypto_1 = require("node:crypto");
const DEFAULT_CONFIG = {
    fipsMode: false,
    encryptTokens: false,
    minTokenLength: 32,
};
let securityConfig = { ...DEFAULT_CONFIG };
/**
 * Configure security settings
 */
function configureSecurity(config) {
    securityConfig = { ...securityConfig, ...config };
}
/**
 * Validate token format and security
 */
function validateToken(token) {
    const errors = [];
    const warnings = [];
    // Check minimum length
    if (token.length < securityConfig.minTokenLength) {
        warnings.push(`Token length (${token.length}) is below recommended minimum (${securityConfig.minTokenLength})`);
    }
    // Check for common weak patterns
    if (/^(test|demo|dev|local)/i.test(token)) {
        warnings.push('Token appears to be a development/test token');
    }
    // Check for base64 encoded JWT
    const jwtParts = token.split('.');
    if (jwtParts.length === 3) {
        try {
            const header = JSON.parse(Buffer.from(jwtParts[0], 'base64').toString());
            if (header.alg === 'none') {
                errors.push('JWT uses "none" algorithm - this is insecure');
            }
            if (header.alg === 'HS256' && securityConfig.fipsMode) {
                warnings.push('HS256 may not be FIPS-approved in all configurations');
            }
        }
        catch {
            // Not a valid JWT, that's fine
        }
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}
/**
 * Generate a secure nonce for request signing
 */
function generateNonce() {
    return (0, node_crypto_1.randomBytes)(16).toString('hex');
}
/**
 * Generate request signature for audit trail
 */
function generateRequestSignature(method, path, timestamp, nonce) {
    const data = `${method}:${path}:${timestamp}:${nonce}`;
    // Use SHA-256 (FIPS-approved)
    return (0, node_crypto_1.createHash)('sha256').update(data).digest('hex');
}
/**
 * Sanitize sensitive data from objects before logging
 */
function sanitizeForLogging(data, sensitiveKeys = []) {
    const defaultSensitiveKeys = [
        'token',
        'password',
        'secret',
        'key',
        'apiKey',
        'api_key',
        'credential',
        'auth',
        'authorization',
        'bearer',
        'jwt',
        'accessToken',
        'access_token',
        'refreshToken',
        'refresh_token',
    ];
    const allSensitiveKeys = [...defaultSensitiveKeys, ...sensitiveKeys];
    const result = { ...data };
    for (const [key, value] of Object.entries(result)) {
        const lowerKey = key.toLowerCase();
        // Check if key matches sensitive pattern
        const isSensitive = allSensitiveKeys.some((sk) => lowerKey.includes(sk.toLowerCase()));
        if (isSensitive) {
            if (typeof value === 'string') {
                result[key] = '[REDACTED]';
            }
            else if (value !== null && value !== undefined) {
                result[key] = '[REDACTED]';
            }
        }
        else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            result[key] = sanitizeForLogging(value, sensitiveKeys);
        }
    }
    return result;
}
/**
 * Mask token for display (show only first/last few chars)
 */
function maskToken(token, visibleChars = 4) {
    if (token.length <= visibleChars * 2) {
        return '*'.repeat(token.length);
    }
    const start = token.slice(0, visibleChars);
    const end = token.slice(-visibleChars);
    const masked = '*'.repeat(Math.min(token.length - visibleChars * 2, 20));
    return `${start}${masked}${end}`;
}
/**
 * Check if running in secure environment
 */
function checkSecureEnvironment() {
    const checks = [];
    // Check for HTTPS in endpoint
    const endpoint = process.env.INTELGRAPH_ENDPOINT ?? '';
    if (endpoint && !endpoint.startsWith('https://') && !endpoint.includes('localhost')) {
        checks.push({
            name: 'HTTPS Endpoint',
            passed: false,
            message: 'Production endpoint should use HTTPS',
            severity: 'high',
        });
    }
    else {
        checks.push({
            name: 'HTTPS Endpoint',
            passed: true,
            message: 'Endpoint uses HTTPS or is localhost',
            severity: 'info',
        });
    }
    // Check for token in environment vs command line
    const tokenInEnv = !!(process.env.INTELGRAPH_TOKEN ?? process.env.SUMMIT_ADMIN_TOKEN);
    checks.push({
        name: 'Token Storage',
        passed: tokenInEnv,
        message: tokenInEnv
            ? 'Token provided via environment variable (recommended)'
            : 'Token may be visible in process list if passed via command line',
        severity: tokenInEnv ? 'info' : 'medium',
    });
    // Check umask for config file security
    const umask = process.umask();
    const configSecure = (umask & 0o077) === 0o077;
    checks.push({
        name: 'File Permissions',
        passed: configSecure,
        message: configSecure
            ? 'umask restricts file permissions appropriately'
            : 'Consider setting umask 077 for sensitive operations',
        severity: configSecure ? 'info' : 'low',
    });
    // Check for CI/non-interactive environment
    const isCI = !!(process.env.CI ?? process.env.GITHUB_ACTIONS ?? process.env.JENKINS_URL);
    if (isCI) {
        checks.push({
            name: 'CI Environment',
            passed: true,
            message: 'Running in CI environment - ensure secrets are properly managed',
            severity: 'info',
        });
    }
    const allPassed = checks.every((c) => c.passed || c.severity === 'low' || c.severity === 'info');
    return {
        secure: allPassed,
        checks,
    };
}
/**
 * Rate limiting for local operations
 * Prevents runaway scripts from overwhelming the API
 */
class RateLimiter {
    requests = [];
    maxRequests;
    windowMs;
    constructor(maxRequests = 100, windowMs = 60000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }
    /**
     * Check if request is allowed
     */
    canMakeRequest() {
        const now = Date.now();
        this.requests = this.requests.filter((t) => now - t < this.windowMs);
        return this.requests.length < this.maxRequests;
    }
    /**
     * Record a request
     */
    recordRequest() {
        this.requests.push(Date.now());
    }
    /**
     * Get remaining requests in current window
     */
    getRemainingRequests() {
        const now = Date.now();
        this.requests = this.requests.filter((t) => now - t < this.windowMs);
        return Math.max(0, this.maxRequests - this.requests.length);
    }
    /**
     * Get time until window resets
     */
    getResetTime() {
        if (this.requests.length === 0)
            return 0;
        const oldestRequest = Math.min(...this.requests);
        return Math.max(0, this.windowMs - (Date.now() - oldestRequest));
    }
}
exports.RateLimiter = RateLimiter;
/**
 * Default rate limiter instance
 */
exports.defaultRateLimiter = new RateLimiter(100, 60000);
/**
 * Security best practices check for production readiness
 */
function checkProductionReadiness(profile, endpoint, token) {
    const issues = [];
    // Check profile name
    if (profile.includes('prod') || profile.includes('production')) {
        // Extra scrutiny for production
        if (!endpoint.startsWith('https://')) {
            issues.push({
                severity: 'critical',
                message: 'Production profile must use HTTPS endpoint',
                recommendation: 'Update endpoint to use HTTPS',
            });
        }
        if (!token) {
            issues.push({
                severity: 'critical',
                message: 'Production profile has no token configured',
                recommendation: 'Set token via environment variable INTELGRAPH_TOKEN',
            });
        }
        if (endpoint.includes('localhost') || endpoint.includes('127.0.0.1')) {
            issues.push({
                severity: 'high',
                message: 'Production profile points to localhost',
                recommendation: 'Update endpoint to production URL',
            });
        }
    }
    // Token validation
    if (token) {
        const tokenCheck = validateToken(token);
        for (const error of tokenCheck.errors) {
            issues.push({
                severity: 'critical',
                message: error,
                recommendation: 'Use a secure token',
            });
        }
        for (const warning of tokenCheck.warnings) {
            issues.push({
                severity: 'medium',
                message: warning,
                recommendation: 'Consider using a production token',
            });
        }
    }
    return {
        ready: issues.filter((i) => i.severity === 'critical').length === 0,
        issues,
    };
}
