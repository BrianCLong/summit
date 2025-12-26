
import { ExtensionContext, ExtensionManifest, ExtensionPermission, ExtensionScope, Installation, ExtensionState } from './types';
import { extensionRegistry } from './registry';

export class PermissionEnforcer {
  /**
   * Checks if an extension has the required permission for a tenant.
   * This checks:
   * 1. If the extension is installed for the tenant.
   * 2. If the extension is not revoked (globally or locally).
   * 3. If the extension was granted the specific permission at installation.
   */
  async checkPermission(
    context: ExtensionContext,
    requiredPermission: ExtensionPermission
  ): Promise<boolean> {
    const { tenantId, extensionId, permissions } = context;

    // 1. Get Installation
    const installation = await extensionRegistry.getInstallation(tenantId, extensionId);

    if (!installation) {
      console.warn(`[PermissionEnforcer] Extension ${extensionId} not installed for tenant ${tenantId}`);
      return false;
    }

    // 2. Check State
    if (installation.state !== ExtensionState.ENABLED) {
      console.warn(`[PermissionEnforcer] Extension ${extensionId} is in state ${installation.state}`);
      return false;
    }

    // 3. Check Granted Permissions
    // In strict mode, we only allow what's in the installation record.
    // The context might carry a subset, but the source of truth is the installation.
    const hasPermission = installation.permissionsGranted.includes(requiredPermission);

    if (!hasPermission) {
      console.warn(`[PermissionEnforcer] Extension ${extensionId} missing permission ${requiredPermission}`);
      return false;
    }

    return true;
  }

  /**
   * Checks if an extension is allowed to access a specific resource based on scopes.
   * This is a finer-grained check than `checkPermission`.
   */
  async checkScopeAccess(
    context: ExtensionContext,
    resourceType: ExtensionScope['resourceType'],
    action: ExtensionScope['action'],
    resourceAttributes: Record<string, any> = {}
  ): Promise<boolean> {
    const installation = await extensionRegistry.getInstallation(context.tenantId, context.extensionId);
    if (!installation || installation.state !== ExtensionState.ENABLED) {
      return false;
    }

    const manifest = await extensionRegistry.get(context.extensionId);
    if (!manifest) return false;

    // Iterate through scopes to find a match
    // Deny by default
    const hasScope = manifest.scopes.some(scope => {
      if (scope.resourceType !== resourceType) return false;
      if (scope.action !== action) return false;

      // Filter logic (simple equality for now)
      if (scope.filter) {
        for (const [key, value] of Object.entries(scope.filter)) {
          if (resourceAttributes[key] !== value) return false;
        }
      }
      return true;
    });

    return hasScope;
  }
}

export const permissionEnforcer = new PermissionEnforcer();
