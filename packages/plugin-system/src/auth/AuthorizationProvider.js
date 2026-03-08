"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryAuthorizationProvider = exports.DevelopmentAuthorizationProvider = exports.OPAAuthorizationProvider = void 0;
/**
 * Default OPA-based authorization provider
 */
class OPAAuthorizationProvider {
    opaEndpoint;
    policyPath;
    constructor(opaEndpoint = 'http://localhost:8181', policyPath = '/v1/data/plugins/allow') {
        this.opaEndpoint = opaEndpoint;
        this.policyPath = policyPath;
    }
    async authorize(request) {
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
        }
        catch (error) {
            // Fail closed - deny if OPA is unavailable
            return {
                allowed: false,
                reason: `Authorization check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
    async authorizeMany(requests) {
        // Execute in parallel for performance
        return Promise.all(requests.map(req => this.authorize(req)));
    }
    async checkManifestPermissions(manifest, context) {
        const requests = manifest.permissions.map(permission => ({
            pluginId: manifest.id,
            permission,
            action: 'request',
            context,
        }));
        const results = await this.authorizeMany(requests);
        return results.every(r => r.allowed);
    }
}
exports.OPAAuthorizationProvider = OPAAuthorizationProvider;
/**
 * Development-mode authorization provider (allows all)
 */
class DevelopmentAuthorizationProvider {
    async authorize(_request) {
        return { allowed: true, reason: 'Development mode - all permissions allowed' };
    }
    async authorizeMany(requests) {
        return requests.map(() => ({ allowed: true }));
    }
    async checkManifestPermissions(_manifest, _context) {
        return true;
    }
}
exports.DevelopmentAuthorizationProvider = DevelopmentAuthorizationProvider;
/**
 * In-memory authorization provider for testing
 */
class InMemoryAuthorizationProvider {
    rules = new Map();
    setRule(pluginId, permission, allowed) {
        this.rules.set(`${pluginId}:${permission}`, allowed);
    }
    async authorize(request) {
        const key = `${request.pluginId}:${request.permission}`;
        const allowed = this.rules.get(key) ?? true; // Default allow for testing
        return {
            allowed,
            reason: allowed ? undefined : 'Permission denied by policy',
        };
    }
    async authorizeMany(requests) {
        return Promise.all(requests.map(req => this.authorize(req)));
    }
    async checkManifestPermissions(manifest, context) {
        const requests = manifest.permissions.map(permission => ({
            pluginId: manifest.id,
            permission,
            action: 'request',
            context,
        }));
        const results = await this.authorizeMany(requests);
        return results.every(r => r.allowed);
    }
}
exports.InMemoryAuthorizationProvider = InMemoryAuthorizationProvider;
