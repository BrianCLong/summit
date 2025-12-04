import { PluginManifest, PluginPermission } from '../types/plugin.js';

/**
 * Authorization provider interface for plugin permission checking
 * Integrates with OPA/ABAC for fine-grained access control
 */
export interface AuthorizationProvider {
  /**
   * Check if a plugin action is authorized
   */
  authorize(request: AuthorizationRequest): Promise<AuthorizationResult>;

  /**
   * Batch authorization check for multiple permissions
   */
  authorizeMany(requests: AuthorizationRequest[]): Promise<AuthorizationResult[]>;

  /**
   * Check if manifest permissions are approved
   */
  checkManifestPermissions(manifest: PluginManifest, context: AuthorizationContext): Promise<boolean>;
}

export interface AuthorizationRequest {
  pluginId: string;
  permission: PluginPermission;
  resource?: string;
  action: string;
  context: AuthorizationContext;
}

export interface AuthorizationContext {
  userId?: string;
  tenantId?: string;
  sessionId?: string;
  environment: 'development' | 'staging' | 'production';
  metadata?: Record<string, any>;
}

export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
  obligations?: Obligation[];
}

export interface Obligation {
  type: 'audit' | 'notify' | 'rate-limit' | 'quota';
  config: Record<string, any>;
}

/**
 * Default OPA-based authorization provider
 */
export class OPAAuthorizationProvider implements AuthorizationProvider {
  private opaEndpoint: string;
  private policyPath: string;

  constructor(opaEndpoint: string = 'http://localhost:8181', policyPath: string = '/v1/data/plugins/allow') {
    this.opaEndpoint = opaEndpoint;
    this.policyPath = policyPath;
  }

  async authorize(request: AuthorizationRequest): Promise<AuthorizationResult> {
    try {
      const response = await fetch(`${this.opaEndpoint}${this.policyPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: {
            plugin: request.pluginId,
            permission: request.permission,
            resource: request.resource,
            action: request.action,
            user: request.context.userId,
            tenant: request.context.tenantId,
            environment: request.context.environment,
            metadata: request.context.metadata,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`OPA request failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        allowed: data.result?.allow === true,
        reason: data.result?.reason,
        obligations: data.result?.obligations,
      };
    } catch (error) {
      // Fail closed - deny if OPA is unavailable
      return {
        allowed: false,
        reason: `Authorization check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async authorizeMany(requests: AuthorizationRequest[]): Promise<AuthorizationResult[]> {
    // Execute in parallel for performance
    return Promise.all(requests.map(req => this.authorize(req)));
  }

  async checkManifestPermissions(manifest: PluginManifest, context: AuthorizationContext): Promise<boolean> {
    const requests: AuthorizationRequest[] = manifest.permissions.map(permission => ({
      pluginId: manifest.id,
      permission,
      action: 'request',
      context,
    }));

    const results = await this.authorizeMany(requests);
    return results.every(r => r.allowed);
  }
}

/**
 * Development-mode authorization provider (allows all)
 */
export class DevelopmentAuthorizationProvider implements AuthorizationProvider {
  async authorize(_request: AuthorizationRequest): Promise<AuthorizationResult> {
    return { allowed: true, reason: 'Development mode - all permissions allowed' };
  }

  async authorizeMany(requests: AuthorizationRequest[]): Promise<AuthorizationResult[]> {
    return requests.map(() => ({ allowed: true }));
  }

  async checkManifestPermissions(_manifest: PluginManifest, _context: AuthorizationContext): Promise<boolean> {
    return true;
  }
}

/**
 * In-memory authorization provider for testing
 */
export class InMemoryAuthorizationProvider implements AuthorizationProvider {
  private rules = new Map<string, boolean>();

  setRule(pluginId: string, permission: PluginPermission, allowed: boolean): void {
    this.rules.set(`${pluginId}:${permission}`, allowed);
  }

  async authorize(request: AuthorizationRequest): Promise<AuthorizationResult> {
    const key = `${request.pluginId}:${request.permission}`;
    const allowed = this.rules.get(key) ?? true; // Default allow for testing

    return {
      allowed,
      reason: allowed ? undefined : 'Permission denied by policy',
    };
  }

  async authorizeMany(requests: AuthorizationRequest[]): Promise<AuthorizationResult[]> {
    return Promise.all(requests.map(req => this.authorize(req)));
  }

  async checkManifestPermissions(manifest: PluginManifest, context: AuthorizationContext): Promise<boolean> {
    const requests: AuthorizationRequest[] = manifest.permissions.map(permission => ({
      pluginId: manifest.id,
      permission,
      action: 'request',
      context,
    }));

    const results = await this.authorizeMany(requests);
    return results.every(r => r.allowed);
  }
}
