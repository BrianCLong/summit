
import { ExtensionManifest, ExtensionRegistry } from './types';

// In-memory registry for MVP
class InMemoryExtensionRegistry implements ExtensionRegistry {
  private extensions: Map<string, ExtensionManifest> = new Map();

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

  async uninstall(id: string): Promise<void> {
    this.extensions.delete(id);
  }
}

export const extensionRegistry = new InMemoryExtensionRegistry();
