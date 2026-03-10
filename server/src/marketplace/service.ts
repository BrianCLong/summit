import { RegisteredPlugin, PluginStatus, PluginManifest, PluginPackage } from '../plugins/types.js';
import { TrustTier, MarketplaceArtifactGovernance, LicenseType, SecurityStatus } from './types.js';
import { randomUUID } from 'crypto';

import { verifyCosign } from '../plugins/verify.js';
import { piiDetector } from '../privacy/PIIDetector.js';
import { SubgraphPackage, RegisteredSubgraph, SubgraphStatus } from './types.js';


export class MarketplaceService {
  private static instance: MarketplaceService;
  private plugins: Map<string, RegisteredPlugin> = new Map();
  private _killSwitchActive: boolean = false;
  private subgraphs: Map<string, RegisteredSubgraph> = new Map();
  public contributorReputations: Map<string, number> = new Map();

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
    // 1. Validate signature
    const isValid = await this.verifySignature(pkg.signature || '', pkg.code);
    if (!isValid) {
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


  public getReputation(contributorId: string): number {
    return this.contributorReputations.get(contributorId) ?? 100;
  }

  public updateReputation(contributorId: string, delta: number): number {
    const current = this.getReputation(contributorId);
    const updated = Math.max(0, Math.min(100, current + delta));
    this.contributorReputations.set(contributorId, updated);
    return updated;
  }

  public async submitSubgraph(pkg: SubgraphPackage): Promise<RegisteredSubgraph> {
    const reputation = this.getReputation(pkg.contributorId);

    const subgraph: RegisteredSubgraph = {
      id: pkg.id || randomUUID(),
      pkg,
      status: SubgraphStatus.SUBMITTED,
      riskScore: 0,
      reputationScore: reputation,
      createdAt: new Date()
    };

    // 1. Reputation Check
    if (reputation < 50) {
      subgraph.status = SubgraphStatus.QUARANTINED;
      subgraph.quarantineReason = 'Contributor reputation below threshold';
      this.subgraphs.set(subgraph.id, subgraph);
      this.audit(subgraph.id, 'SUBGRAPH_QUARANTINED', { reason: subgraph.quarantineReason });
      return subgraph;
    }

    // 2. Signature Check
    const isValidSig = await this.verifySignature(pkg.signature, pkg.payload);
    if (!isValidSig) {
      subgraph.status = SubgraphStatus.QUARANTINED;
      subgraph.quarantineReason = 'Invalid cryptographic signature';
      this.updateReputation(pkg.contributorId, -10); // Penalty
      this.subgraphs.set(subgraph.id, subgraph);
      this.audit(subgraph.id, 'SUBGRAPH_QUARANTINED', { reason: subgraph.quarantineReason });
      return subgraph;
    }

    // 3. PII Detect
    const scanResultEnvelope = await piiDetector.scanObject(pkg.payload);
    const scanResult = scanResultEnvelope.data;
    if (scanResult.hasPI || scanResult.riskScore > 50) {
      subgraph.status = SubgraphStatus.QUARANTINED;
      subgraph.quarantineReason = `PII Detected (Risk Score: ${scanResult.riskScore})`;
      subgraph.riskScore = scanResult.riskScore;
      this.updateReputation(pkg.contributorId, -5); // Penalty
      this.subgraphs.set(subgraph.id, subgraph);
      this.audit(subgraph.id, 'SUBGRAPH_QUARANTINED', { reason: subgraph.quarantineReason });
      return subgraph;
    }

    // Passed checks
    subgraph.status = SubgraphStatus.APPROVED;
    const updatedRep = this.updateReputation(pkg.contributorId, +2); // Reward for valid submission
    subgraph.reputationScore = updatedRep;
    this.subgraphs.set(subgraph.id, subgraph);
    this.audit(subgraph.id, 'SUBGRAPH_APPROVED', { contributor: pkg.contributorId });

    return subgraph;
  }

  public getSubgraph(id: string): RegisteredSubgraph | undefined {
    return this.subgraphs.get(id);
  }

  public async verifySignature(signature: string, payload: any): Promise<boolean> {
    try {
      // Stub payload extraction for cosign logic matching verifyCosign's `ref`
      const ref = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const isValid = await verifyCosign(signature || ref);
      return isValid;
    } catch (error) {
      console.warn('Signature verification failed:', error);
      return false;
    }
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
