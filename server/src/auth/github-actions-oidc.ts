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

import jwt from 'jsonwebtoken';
import jwksClient, { JwksClient } from 'jwks-rsa';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger.js';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface GitHubActionsOIDCClaims {
  // Standard OIDC claims
  iss: string;        // https://token.actions.githubusercontent.com
  sub: string;        // repo:owner/repo:ref:refs/heads/main
  aud: string | string[];
  exp: number;
  nbf: number;
  iat: number;
  jti: string;

  // GitHub-specific claims
  ref: string;                      // refs/heads/main
  sha: string;                      // commit SHA
  repository: string;               // owner/repo
  repository_owner: string;         // owner
  repository_owner_id: string;      // owner ID
  repository_id: string;            // repo ID
  repository_visibility: string;    // private, public, internal
  actor: string;                    // GitHub username
  actor_id: string;
  workflow: string;                 // workflow name
  workflow_ref: string;             // workflow ref
  workflow_sha: string;
  head_ref: string;                 // for PRs
  base_ref: string;                 // for PRs
  event_name: string;               // push, pull_request, workflow_dispatch
  ref_type: string;                 // branch, tag
  job_workflow_ref: string;
  job_workflow_sha: string;
  runner_environment: string;       // github-hosted, self-hosted
  enterprise?: string;
  enterprise_id?: string;
  environment?: string;             // deployment environment
  environment_node_id?: string;
}

export interface GitHubOIDCConfig {
  issuer: string;
  audience: string;
  jwksUri: string;
  allowedRepositories: string[];
  allowedWorkflows: string[];
  allowedBranches: string[];
  allowedEnvironments: string[];
  requireEnvironment: boolean;
  allowSelfHostedRunners: boolean;
  allowPullRequests: boolean;
  tokenExpiryToleranceSeconds: number;
}

export interface GitHubIdentity {
  repository: string;
  owner: string;
  workflow: string;
  ref: string;
  sha: string;
  actor: string;
  environment?: string;
  eventName: string;
  runnerEnvironment: string;
  claims: GitHubActionsOIDCClaims;
}

export interface GitHubServiceCredential {
  token: string;
  expiresAt: Date;
  permissions: string[];
  scope: string;
  identity: GitHubIdentity;
}

// ============================================================================
// GitHub Actions OIDC Authenticator
// ============================================================================

export class GitHubActionsOIDC {
  private config: GitHubOIDCConfig;
  private jwksClient: JwksClient;
  private tokenCache: Map<string, { identity: GitHubIdentity; expiresAt: Date }>;

  constructor(config?: Partial<GitHubOIDCConfig>) {
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

    this.jwksClient = jwksClient({
      jwksUri: this.config.jwksUri,
      cache: true,
      cacheMaxEntries: 10,
      cacheMaxAge: 600000, // 10 minutes
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });

    this.tokenCache = new Map();

    logger.info('GitHub Actions OIDC authenticator initialized', {
      audience: this.config.audience,
      allowedRepos: this.config.allowedRepositories.length,
      requireEnvironment: this.config.requireEnvironment,
    });
  }

  private parseEnvList(envVar: string): string[] {
    const value = process.env[envVar];
    if (!value) return [];
    return value.split(',').map(s => s.trim()).filter(Boolean);
  }

  /**
   * Verify GitHub Actions OIDC token
   */
  async verifyToken(token: string): Promise<GitHubIdentity> {
    // Check cache first
    const cached = this.tokenCache.get(token);
    if (cached && cached.expiresAt > new Date()) {
      return cached.identity;
    }

    try {
      // Decode header to get key ID
      const decoded = jwt.decode(token, { complete: true });
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
      const claims = jwt.verify(token, signingKey, {
        issuer: this.config.issuer,
        audience: this.config.audience,
        algorithms: ['RS256'],
        clockTolerance: this.config.tokenExpiryToleranceSeconds,
      }) as GitHubActionsOIDCClaims;

      // Validate claims
      this.validateClaims(claims);

      // Build identity
      const identity: GitHubIdentity = {
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

      logger.info('GitHub Actions OIDC token verified', {
        repository: identity.repository,
        workflow: identity.workflow,
        ref: identity.ref,
        actor: identity.actor,
        environment: identity.environment,
      });

      return identity;
    } catch (error) {
      logger.error('GitHub Actions OIDC verification failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get signing key from JWKS endpoint
   */
  private async getSigningKey(kid: string): Promise<string> {
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
  private validateClaims(claims: GitHubActionsOIDCClaims): void {
    // Validate repository
    if (this.config.allowedRepositories.length > 0) {
      if (!this.config.allowedRepositories.includes(claims.repository)) {
        throw new Error(`Repository '${claims.repository}' is not allowed`);
      }
    }

    // Validate workflow
    if (this.config.allowedWorkflows.length > 0) {
      const workflowMatch = this.config.allowedWorkflows.some(w =>
        claims.workflow.includes(w) || claims.job_workflow_ref?.includes(w)
      );
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
  async exchangeToken(
    token: string,
    requestedPermissions: string[]
  ): Promise<GitHubServiceCredential> {
    const identity = await this.verifyToken(token);

    // Determine allowed permissions based on repository/workflow
    const allowedPermissions = this.resolvePermissions(identity, requestedPermissions);

    // Generate service credential
    const serviceToken = this.generateServiceToken(identity, allowedPermissions);

    const credential: GitHubServiceCredential = {
      token: serviceToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      permissions: allowedPermissions,
      scope: this.buildScope(identity),
      identity,
    };

    logger.info('GitHub OIDC token exchanged for service credential', {
      repository: identity.repository,
      workflow: identity.workflow,
      permissions: allowedPermissions.length,
    });

    return credential;
  }

  /**
   * Resolve permissions for the identity
   */
  private resolvePermissions(
    identity: GitHubIdentity,
    requestedPermissions: string[]
  ): string[] {
    // Default permissions based on environment
    const envPermissions: Record<string, string[]> = {
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
    const allowed = requestedPermissions.filter(p =>
      basePermissions.includes(p) || basePermissions.includes('*')
    );

    return allowed.length > 0 ? allowed : basePermissions;
  }

  /**
   * Generate service token for the credential
   */
  private generateServiceToken(identity: GitHubIdentity, permissions: string[]): string {
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

    return jwt.sign(payload, secret, { algorithm: 'HS256' });
  }

  /**
   * Build scope string for the credential
   */
  private buildScope(identity: GitHubIdentity): string {
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
  cleanupCache(): void {
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
  getConfig(): Partial<GitHubOIDCConfig> {
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

// ============================================================================
// Express Middleware
// ============================================================================

export interface GitHubActionsRequest extends Request {
  githubIdentity?: GitHubIdentity;
  githubCredential?: GitHubServiceCredential;
}

/**
 * Create GitHub Actions OIDC authentication middleware
 */
export function createGitHubActionsAuth(authenticator: GitHubActionsOIDC) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check for GitHub Actions OIDC token
      const authHeader = req.headers.authorization;
      const ghToken = req.headers['x-github-token'] as string;

      const token = ghToken || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);

      if (!token) {
        res.status(401).json({
          error: 'GitHub Actions OIDC token required',
          code: 'GITHUB_TOKEN_MISSING',
        });
        return;
      }

      const identity = await authenticator.verifyToken(token);
      (req as GitHubActionsRequest).githubIdentity = identity;

      logger.debug('GitHub Actions request authenticated', {
        repository: identity.repository,
        workflow: identity.workflow,
      });

      next();
    } catch (error) {
      logger.warn('GitHub Actions OIDC authentication failed', {
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
export function requireGitHubEnvironment(allowedEnvironments: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const identity = (req as GitHubActionsRequest).githubIdentity;

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
export function requireGitHubRepository(allowedRepositories: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const identity = (req as GitHubActionsRequest).githubIdentity;

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

let githubOIDCInstance: GitHubActionsOIDC | null = null;

export function getGitHubActionsOIDC(config?: Partial<GitHubOIDCConfig>): GitHubActionsOIDC {
  if (!githubOIDCInstance) {
    githubOIDCInstance = new GitHubActionsOIDC(config);
  }
  return githubOIDCInstance;
}

export function resetGitHubActionsOIDC(): void {
  githubOIDCInstance = null;
}
