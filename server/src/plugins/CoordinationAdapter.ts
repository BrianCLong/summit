import { coordinationService } from '../maestro/coordination/service.js';
import { logger } from '../utils/logger.js';

export class PluginCoordinationAdapter {
  private static instance: PluginCoordinationAdapter;

  private constructor() {}

  static getInstance(): PluginCoordinationAdapter {
    if (!PluginCoordinationAdapter.instance) {
      PluginCoordinationAdapter.instance = new PluginCoordinationAdapter();
    }
    return PluginCoordinationAdapter.instance;
  }

  /**
   * Registers a plugin's intents with the coordination service.
   * This is a "join" operation where the plugin becomes a known agent in the coordination mesh.
   */
  async registerPluginIntents(pluginId: string, intents: string[]): Promise<void> {
    try {
      // In a real implementation, we would register each intent against specific coordination schemas.
      // For now, we register the plugin as an available agent in active coordinations that match its capabilities.
      // This is a simplification; a full implementation would broadcast availability.

      logger.info({ pluginId, intents }, 'Registering plugin intents with coordination layer');

      // We don't have a direct "register global intent" API in CoordinationService yet,
      // but we can log this for the audit trail and potentially update a registry.
      // The actual "join" happens when a coordination is active.
    } catch (error) {
      logger.error({ error, pluginId }, 'Failed to register plugin intents');
      throw error;
    }
  }

  /**
   * Requests permission for a plugin to execute an autonomous action.
   */
  async requestPermission(
    pluginId: string,
    action: string,
    context: any,
    coordinationId?: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    if (!coordinationId) {
      // If not part of a coordination, we default to local policy check (handled by PluginManager).
      // However, for high-tier actions, we might require it to be part of a coordination.
      return { allowed: true, reason: 'Local execution' };
    }

    // If part of a coordination, validate against the budget and role.
    const allowed = coordinationService.validateAction(coordinationId, pluginId, 'EXECUTOR'); // Assuming EXECUTOR role
    return {
      allowed,
      reason: allowed ? 'Coordination approved' : 'Coordination denied or budget exhausted'
    };
  }
}

export const pluginCoordinationAdapter = PluginCoordinationAdapter.getInstance();
