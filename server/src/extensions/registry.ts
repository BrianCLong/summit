
import { ExtensionManifest, ExtensionRegistry, Installation, ExtensionState } from './types';
import { randomUUID } from 'crypto';

// In-memory registry for MVP
// Confirmed by Epic 1 Task 1.4
class InMemoryExtensionRegistry implements ExtensionRegistry {
  private extensions: Map<string, ExtensionManifest> = new Map();
  // Map key: `${tenantId}:${extensionId}`
  private installations: Map<string, Installation> = new Map();

  async register(manifest: ExtensionManifest): Promise<void> {
    if (this.extensions.has(manifest.id)) {
      throw new Error(`Extension ${manifest.id} already registered`);
    }
    // Validation logic here (e.g. check permission strings)
    this.extensions.set(manifest.id, manifest);
  }

  async get(id: string): Promise<ExtensionManifest | null> {
    return this.extensions.get(id) || null;
  }

  async list(): Promise<ExtensionManifest[]> {
    return Array.from(this.extensions.values());
  }

  private getInstallationKey(tenantId: string, extensionId: string): string {
    return `${tenantId}:${extensionId}`;
  }

  async install(tenantId: string, extensionId: string): Promise<Installation> {
    const extension = await this.get(extensionId);
    if (!extension) {
      throw new Error(`Extension ${extensionId} not found`);
    }

    if (this.installations.has(this.getInstallationKey(tenantId, extensionId))) {
      throw new Error(`Extension ${extensionId} is already installed for tenant ${tenantId}`);
    }

    // Check if extension is globally revoked
    // In a real DB, we would check a global state table.
    // For now, if the extension is in the registry, it's valid unless marked somewhere.
    // I'll assume valid for now unless I add a global revocation list.

    // Create installation record
    const installation: Installation = {
      id: randomUUID(),
      tenantId,
      extensionId,
      version: extension.version,
      state: ExtensionState.ENABLED,
      permissionsGranted: extension.permissions, // Grant all requested for now (can refine later)
      installedAt: new Date(),
      updatedAt: new Date(),
    };

    this.installations.set(this.getInstallationKey(tenantId, extensionId), installation);
    return installation;
  }

  async uninstall(tenantId: string, extensionId: string): Promise<void> {
    const key = this.getInstallationKey(tenantId, extensionId);
    if (!this.installations.has(key)) {
       // Idempotent or throw? Let's be safe and just return if not found, or throw if we want explicit error.
       // The interface says Promise<void>, so let's just delete.
       return;
    }
    this.installations.delete(key);
  }

  async getInstallation(tenantId: string, extensionId: string): Promise<Installation | null> {
    return this.installations.get(this.getInstallationKey(tenantId, extensionId)) || null;
  }

  async revoke(extensionId: string, reason: string): Promise<void> {
     // Mark all installations as REVOKED
     for (const [key, installation] of this.installations.entries()) {
        if (installation.extensionId === extensionId) {
            installation.state = ExtensionState.REVOKED;
            installation.updatedAt = new Date();
            // In a real system we might log the reason
        }
     }

     // Also maybe remove from catalog or mark as revoked there?
     // Since Manifest doesn't have state, I'll just rely on the fact that
     // future installs should probably fail.
     // For now, I'll remove it from the catalog to prevent new installs.
     this.extensions.delete(extensionId);
  }

  // Helper for testing to clear state
  async _resetForTesting(): Promise<void> {
    this.extensions.clear();
    this.installations.clear();
  }
}

export const extensionRegistry = new InMemoryExtensionRegistry();
