import { CISPlugin, IntegrityOracle, NarrativeIntel } from './types';

export class CISPluginRegistry {
  private plugins: Map<string, CISPlugin> = new Map();

  register(plugin: CISPlugin) {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin with ID ${plugin.id} already registered.`);
    }
    this.plugins.set(plugin.id, plugin);
  }

  getPlugin(id: string): CISPlugin | undefined {
    return this.plugins.get(id);
  }

  getAllPlugins(): CISPlugin[] {
    return Array.from(this.plugins.values());
  }

  getIntegrityOracles(): IntegrityOracle[] {
    return this.getAllPlugins().filter((p): p is IntegrityOracle => p.type === 'IntegrityOracle');
  }

  getNarrativeIntelPlugins(): NarrativeIntel[] {
    return this.getAllPlugins().filter((p): p is NarrativeIntel => p.type === 'NarrativeIntel');
  }
}
