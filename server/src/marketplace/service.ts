import { RegisteredPlugin, PluginStatus, PluginManifest, PluginPackage } from '../plugins/types.js';
import { TrustTier, MarketplaceArtifactGovernance, LicenseType, SecurityStatus } from './types.js';
import { randomUUID } from 'crypto';

export class MarketplaceService {
  private static instance: MarketplaceService;
  private plugins: Map<string, RegisteredPlugin> = new Map();
  private _killSwitchActive: boolean = false;

  // Mock Provenance Ledger
  private ledger: any[] = [];

  private constructor() {}

  public static getInstance(): MarketplaceService {
    if (!MarketplaceService.instance) {
      MarketplaceService.instance = new MarketplaceService();
    }
    return MarketplaceService.instance;
  }

  public enableKillSwitch(reason: string, actor: string) {
    this._killSwitchActive = true;
    this.audit('GLOBAL', 'KILL_SWITCH_ACTIVATED', { reason, actor });
    console.warn(`[MARKETPLACE] Kill switch activated by ${actor}: ${reason}`);
  }

  public disableKillSwitch(actor: string) {
    this._killSwitchActive = false;
    this.audit('GLOBAL', 'KILL_SWITCH_DEACTIVATED', { actor });
    console.warn(`[MARKETPLACE] Kill switch deactivated by ${actor}`);
  }

  public isKillSwitchActive(): boolean {
    return this._killSwitchActive;
  }

  /**
   * Submit a new plugin package for review.
   */
  public async submitPlugin(pkg: PluginPackage, submitter: string): Promise<RegisteredPlugin> {
    // 1. Validate signature (Mock)
    if (!this.verifySignature(pkg)) {
        throw new Error("Invalid plugin signature");
    }

    // 2. Create entry
    const plugin: RegisteredPlugin = {
      id: pkg.manifest.id || randomUUID(),
      manifest: pkg.manifest,
      code: pkg.code,
      status: PluginStatus.SUBMITTED,
      createdAt: new Date(),
      updatedAt: new Date(),
      history: [{
        date: new Date(),
        action: 'SUBMIT',
        actor: submitter,
        details: { version: pkg.manifest.version }
      }]
    };

    this.plugins.set(plugin.id, plugin);
    this.audit(plugin.id, 'PLUGIN_SUBMITTED', { submitter });

    return plugin;
  }

  /**
   * Review a plugin and move to IN_REVIEW or REJECTED.
   */
  public async reviewPlugin(pluginId: string, reviewer: string, action: 'APPROVE_FOR_TESTING' | 'REJECT', notes?: string): Promise<RegisteredPlugin> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) throw new Error("Plugin not found");

    if (action === 'REJECT') {
        plugin.status = PluginStatus.REJECTED;
    } else {
        plugin.status = PluginStatus.IN_REVIEW;
    }

    plugin.updatedAt = new Date();
    plugin.history.push({
        date: new Date(),
        action: action,
        actor: reviewer,
        details: { notes }
    });

    this.audit(pluginId, action, { reviewer, notes });
    return plugin;
  }

  /**
   * Final approval to publish.
   */
  public async approvePlugin(pluginId: string, approver: string): Promise<RegisteredPlugin> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) throw new Error("Plugin not found");

    if (plugin.status !== PluginStatus.IN_REVIEW) {
        throw new Error("Plugin must be in review before approval");
    }

    plugin.status = PluginStatus.APPROVED;
    plugin.approvedBy = approver;
    plugin.approvedAt = new Date();
    plugin.updatedAt = new Date();

    plugin.history.push({
        date: new Date(),
        action: 'APPROVED',
        actor: approver
    });

    this.audit(pluginId, 'PLUGIN_APPROVED', { approver });
    return plugin;
  }

  public async revokePlugin(pluginId: string, actor: string, reason: string): Promise<RegisteredPlugin> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) throw new Error("Plugin not found");

    plugin.status = PluginStatus.REVOKED;
    plugin.updatedAt = new Date();
    plugin.history.push({
        date: new Date(),
        action: 'REVOKED',
        actor: actor,
        details: { reason }
    });

    this.audit(pluginId, 'PLUGIN_REVOKED', { actor, reason });
    return plugin;
  }

  public getPlugin(id: string): RegisteredPlugin | undefined {
    return this.plugins.get(id);
  }

  public verifySignature(pkg: PluginPackage): boolean {
    // Placeholder for cryptographic verification
    return !!pkg.signature;
  }

  public audit(artifactId: string, event: string, payload: any) {
    // In production, this would write to server/src/provenance/ledger.ts
    this.ledger.push({
        timestamp: new Date(),
        artifactId,
        event,
        payload
    });
    console.log(`[AUDIT] ${event}: ${artifactId}`, payload);
  }
}
