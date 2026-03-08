"use strict";
// @ts-nocheck
/**
 * GitHub Actions OIDC Integration
 *
 * Implements secure OIDC token exchange for GitHub Actions CI/CD:
 * - Token validation against GitHub's OIDC provider
 * - Repository/workflow claim verification
 * - Branch/environment restrictions
 * - Audit logging of CI/CD access
 *
 * @module auth/github-actions-oidc
 * @see https://docs.github.com/en/actions/deployment/security-hardening-your-deployments
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubActionsOIDC = void 0;
exports.createGitHubActionsAuth = createGitHubActionsAuth;
exports.requireGitHubEnvironment = requireGitHubEnvironment;
exports.requireGitHubRepository = requireGitHubRepository;
exports.getGitHubActionsOIDC = getGitHubActionsOIDC;
exports.resetGitHubActionsOIDC = resetGitHubActionsOIDC;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwks_rsa_1 = __importDefault(require("jwks-rsa"));
const crypto = __importStar(require("crypto"));
const logger_js_1 = __importDefault(require("../config/logger.js"));
// ============================================================================
// GitHub Actions OIDC Authenticator
// ============================================================================
class GitHubActionsOIDC {
    config;
    jwksClient;
    tokenCache;
    constructor(config) {
        this.config = {
            issuer: 'https://token.actions.githubusercontent.com',
            audience: process.env.GITHUB_OIDC_AUDIENCE || 'https://github.com/BrianCLong/summit',
            jwksUri: 'https://token.actions.githubusercontent.com/.well-known/jwks',
            allowedRepositories: this.parseEnvList('GITHUB_OIDC_ALLOWED_REPOS'),
            allowedWorkflows: this.parseEnvList('GITHUB_OIDC_ALLOWED_WORKFLOWS'),
            allowedBranches: this.parseEnvList('GITHUB_OIDC_ALLOWED_BRANCHES') || ['main', 'develop'],
            allowedEnvironments: this.parseEnvList('GITHUB_OIDC_ALLOWED_ENVS') || ['production', 'staging'],
            requireEnvironment: process.env.GITHUB_OIDC_REQUIRE_ENV === 'true',
            allowSelfHostedRunners: process.env.GITHUB_OIDC_ALLOW_SELF_HOSTED !== 'false',
            allowPullRequests: process.env.GITHUB_OIDC_ALLOW_PR !== 'false',
            tokenExpiryToleranceSeconds: 60,
            ...config,
        };
        this.jwksClient = (0, jwks_rsa_1.default)({
            jwksUri: this.config.jwksUri,
            cache: true,
            cacheMaxEntries: 10,
            cacheMaxAge: 600000, // 10 minutes
            rateLimit: true,
            jwksRequestsPerMinute: 10,
        });
        this.tokenCache = new Map();
        logger_js_1.default.info('GitHub Actions OIDC authenticator initialized', {
            audience: this.config.audience,
            allowedRepos: this.config.allowedRepositories.length,
            requireEnvironment: this.config.requireEnvironment,
        });
    }
    parseEnvList(envVar) {
        const value = process.env[envVar];
        if (!value)
            return [];
        return value.split(',').map(s => s.trim()).filter(Boolean);
    }
    /**
     * Verify GitHub Actions OIDC token
     */
    async verifyToken(token) {
        // Check cache first
        const cached = this.tokenCache.get(token);
        if (cached && cached.expiresAt > new Date()) {
            return cached.identity;
        }
        try {
            // Decode header to get key ID
            const decoded = jsonwebtoken_1.default.decode(token, { complete: true });
            if (!decoded || typeof decoded === 'string') {
                throw new Error('Invalid token format');
            }
            const kid = decoded.header.kid;
            if (!kid) {
                throw new Error('Missing key ID in token header');
            }
            // Get signing key from JWKS
            const signingKey = await this.getSigningKey(kid);
            // Verify token
            const claims = jsonwebtoken_1.default.verify(token, signingKey, {
                issuer: this.config.issuer,
                audience: this.config.audience,
                algorithms: ['RS256'],
                clockTolerance: this.config.tokenExpiryToleranceSeconds,
            });
            // Validate claims
            this.validateClaims(claims);
            // Build identity
            const identity = {
                repository: claims.repository,
                owner: claims.repository_owner,
                workflow: claims.workflow,
                ref: claims.ref,
                sha: claims.sha,
                actor: claims.actor,
                environment: claims.environment,
                eventName: claims.event_name,
                runnerEnvironment: claims.runner_environment,
                claims,
            };
            // Cache the result
            const expiresAt = new Date(claims.exp * 1000);
            this.tokenCache.set(token, { identity, expiresAt });
            logger_js_1.default.info('GitHub Actions OIDC token verified', {
                repository: identity.repository,
                workflow: identity.workflow,
                ref: identity.ref,
                actor: identity.actor,
                environment: identity.environment,
            });
            return identity;
        }
        catch (error) {
            logger_js_1.default.error('GitHub Actions OIDC verification failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Get signing key from JWKS endpoint
     */
    async getSigningKey(kid) {
        return new Promise((resolve, reject) => {
            this.jwksClient.getSigningKey(kid, (err, key) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (!key) {
                    reject(new Error('Signing key not found'));
                    return;
                }
                resolve(key.getPublicKey());
            });
        });
    }
    /**
     * Validate GitHub-specific claims
     */
    validateClaims(claims) {
        // Validate repository
        if (this.config.allowedRepositories.length > 0) {
            if (!this.config.allowedRepositories.includes(claims.repository)) {
                throw new Error(`Repository '${claims.repository}' is not allowed`);
            }
        }
        // Validate workflow
        if (this.config.allowedWorkflows.length > 0) {
            const workflowMatch = this.config.allowedWorkflows.some(w => claims.workflow.includes(w) || claims.job_workflow_ref?.includes(w));
            if (!workflowMatch) {
                throw new Error(`Workflow '${claims.workflow}' is not allowed`);
            }
        }
        // Validate branch/ref
        if (this.config.allowedBranches.length > 0) {
            const branchMatch = this.config.allowedBranches.some(branch => {
                const refPattern = `refs/heads/${branch}`;
                return claims.ref === refPattern ||
                    claims.ref.startsWith('refs/tags/') ||
                    (branch === '*' && claims.ref.startsWith('refs/heads/'));
            });
            if (!branchMatch) {
                throw new Error(`Branch '${claims.ref}' is not allowed`);
            }
        }
        // Validate environment if required
        if (this.config.requireEnvironment) {
            if (!claims.environment) {
                throw new Error('GitHub environment is required but not specified');
            }
            if (this.config.allowedEnvironments.length > 0) {
                if (!this.config.allowedEnvironments.includes(claims.environment)) {
                    throw new Error(`Environment '${claims.environment}' is not allowed`);
                }
            }
        }
        // Validate runner environment
        if (!this.config.allowSelfHostedRunners) {
            if (claims.runner_environment === 'self-hosted') {
                throw new Error('Self-hosted runners are not allowed');
            }
        }
        // Validate event type
        if (!this.config.allowPullRequests) {
            if (claims.event_name === 'pull_request' || claims.event_name === 'pull_request_target') {
                throw new Error('Pull request events are not allowed');
            }
        }
    }
    /**
     * Exchange GitHub OIDC token for service credential
     */
    async exchangeToken(token, requestedPermissions) {
        const identity = await this.verifyToken(token);
        // Determine allowed permissions based on repository/workflow
        const allowedPermissions = this.resolvePermissions(identity, requestedPermissions);
        // Generate service credential
        const serviceToken = this.generateServiceToken(identity, allowedPermissions);
        const credential = {
            token: serviceToken,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
            permissions: allowedPermissions,
            scope: this.buildScope(identity),
            identity,
        };
        logger_js_1.default.info('GitHub OIDC token exchanged for service credential', {
            repository: identity.repository,
            workflow: identity.workflow,
            permissions: allowedPermissions.length,
        });
        return credential;
    }
    /**
     * Resolve permissions for the identity
     */
    resolvePermissions(identity, requestedPermissions) {
        // Default permissions based on environment
        const envPermissions = {
            'production': ['deploy:read', 'deploy:write', 'secrets:read', 'config:read'],
            'staging': ['deploy:read', 'deploy:write', 'secrets:read', 'config:read', 'test:write'],
            'development': ['deploy:read', 'test:write', 'build:write'],
        };
        const basePermissions = identity.environment
            ? envPermissions[identity.environment] || envPermissions['development']
            : ['build:read'];
        // Workflow-specific permissions
        if (identity.workflow.includes('release')) {
            basePermissions.push('release:write', 'artifact:write');
        }
        if (identity.workflow.includes('security') || identity.workflow.includes('scan')) {
            basePermissions.push('security:read', 'vulnerability:write');
        }
        // Filter to only requested permissions that are allowed
        const allowed = requestedPermissions.filter(p => basePermissions.includes(p) || basePermissions.includes('*'));
        return allowed.length > 0 ? allowed : basePermissions;
    }
    /**
     * Generate service token for the credential
     */
    generateServiceToken(identity, permissions) {
        const payload = {
            type: 'github-actions',
            repository: identity.repository,
            workflow: identity.workflow,
            ref: identity.ref,
            sha: identity.sha,
            actor: identity.actor,
            environment: identity.environment,
            permissions,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
            jti: crypto.randomUUID(),
        };
        // Sign with internal key
        const secret = process.env.GITHUB_OIDC_INTERNAL_SECRET || process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('No signing secret configured');
        }
        return jsonwebtoken_1.default.sign(payload, secret, { algorithm: 'HS256' });
    }
    /**
     * Build scope string for the credential
     */
    buildScope(identity) {
        const parts = [
            `repo:${identity.repository}`,
            `ref:${identity.ref}`,
            `workflow:${identity.workflow}`,
        ];
        if (identity.environment) {
            parts.push(`env:${identity.environment}`);
        }
        return parts.join(' ');
    }
    /**
     * Cleanup expired cache entries
     */
    cleanupCache() {
        const now = new Date();
        for (const [key, value] of this.tokenCache.entries()) {
            if (value.expiresAt < now) {
                this.tokenCache.delete(key);
            }
        }
    }
    /**
     * Get configuration (sanitized for exposure)
     */
    getConfig() {
        return {
            issuer: this.config.issuer,
            audience: this.config.audience,
            allowedRepositories: this.config.allowedRepositories,
            allowedBranches: this.config.allowedBranches,
            allowedEnvironments: this.config.allowedEnvironments,
            requireEnvironment: this.config.requireEnvironment,
        };
    }
}
exports.GitHubActionsOIDC = GitHubActionsOIDC;
/**
 * Create GitHub Actions OIDC authentication middleware
 */
function createGitHubActionsAuth(authenticator) {
    return async (req, res, next) => {
        try {
            // Check for GitHub Actions OIDC token
            const authHeader = req.headers.authorization;
            const ghToken = req.headers['x-github-token'];
            const token = ghToken || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);
            if (!token) {
                res.status(401).json({
                    error: 'GitHub Actions OIDC token required',
                    code: 'GITHUB_TOKEN_MISSING',
                });
                return;
            }
            const identity = await authenticator.verifyToken(token);
            req.githubIdentity = identity;
            logger_js_1.default.debug('GitHub Actions request authenticated', {
                repository: identity.repository,
                workflow: identity.workflow,
            });
            next();
        }
        catch (error) {
            logger_js_1.default.warn('GitHub Actions OIDC authentication failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            res.status(401).json({
                error: 'GitHub Actions OIDC authentication failed',
                code: 'GITHUB_AUTH_FAILED',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    };
}
/**
 * Create middleware to require specific environment
 */
function requireGitHubEnvironment(allowedEnvironments) {
    return (req, res, next) => {
        const identity = req.githubIdentity;
        if (!identity) {
            res.status(401).json({
                error: 'GitHub identity not found',
                code: 'GITHUB_IDENTITY_MISSING',
            });
            return;
        }
        if (!identity.environment) {
            res.status(403).json({
                error: 'GitHub environment required',
                code: 'GITHUB_ENV_REQUIRED',
            });
            return;
        }
        if (!allowedEnvironments.includes(identity.environment)) {
            res.status(403).json({
                error: `Environment '${identity.environment}' not allowed`,
                code: 'GITHUB_ENV_NOT_ALLOWED',
                allowed: allowedEnvironments,
            });
            return;
        }
        next();
    };
}
/**
 * Create middleware to require specific repository
 */
function requireGitHubRepository(allowedRepositories) {
    return (req, res, next) => {
        const identity = req.githubIdentity;
        if (!identity) {
            res.status(401).json({
                error: 'GitHub identity not found',
                code: 'GITHUB_IDENTITY_MISSING',
            });
            return;
        }
        if (!allowedRepositories.includes(identity.repository)) {
            res.status(403).json({
                error: `Repository '${identity.repository}' not allowed`,
                code: 'GITHUB_REPO_NOT_ALLOWED',
            });
            return;
        }
        next();
    };
}
// ============================================================================
// Singleton Instance
// ============================================================================
let githubOIDCInstance = null;
function getGitHubActionsOIDC(config) {
    if (!githubOIDCInstance) {
        githubOIDCInstance = new GitHubActionsOIDC(config);
    }
    return githubOIDCInstance;
}
function resetGitHubActionsOIDC() {
    githubOIDCInstance = null;
}
