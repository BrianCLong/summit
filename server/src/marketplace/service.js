"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketplaceService = void 0;
const types_js_1 = require("../plugins/types.js");
const crypto_1 = require("crypto");
const verify_js_1 = require("../plugins/verify.js");
const PIIDetector_js_1 = require("../privacy/PIIDetector.js");
const types_js_2 = require("./types.js");
class MarketplaceService {
    static instance;
    plugins = new Map();
    _killSwitchActive = false;
    subgraphs = new Map();
    contributorReputations = new Map();
    // Mock Provenance Ledger
    ledger = [];
    constructor() { }
    static getInstance() {
        if (!MarketplaceService.instance) {
            MarketplaceService.instance = new MarketplaceService();
        }
        return MarketplaceService.instance;
    }
    enableKillSwitch(reason, actor) {
        this._killSwitchActive = true;
        this.audit('GLOBAL', 'KILL_SWITCH_ACTIVATED', { reason, actor });
        console.warn(`[MARKETPLACE] Kill switch activated by ${actor}: ${reason}`);
    }
    disableKillSwitch(actor) {
        this._killSwitchActive = false;
        this.audit('GLOBAL', 'KILL_SWITCH_DEACTIVATED', { actor });
        console.warn(`[MARKETPLACE] Kill switch deactivated by ${actor}`);
    }
    isKillSwitchActive() {
        return this._killSwitchActive;
    }
    /**
     * Submit a new plugin package for review.
     */
    async submitPlugin(pkg, submitter) {
        // 1. Validate signature
        const isValid = await this.verifySignature(pkg.signature || '', pkg.code);
        if (!isValid) {
            throw new Error("Invalid plugin signature");
        }
        // 2. Create entry
        const plugin = {
            id: pkg.manifest.id || (0, crypto_1.randomUUID)(),
            manifest: pkg.manifest,
            code: pkg.code,
            status: types_js_1.PluginStatus.SUBMITTED,
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
    async reviewPlugin(pluginId, reviewer, action, notes) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin)
            throw new Error("Plugin not found");
        if (action === 'REJECT') {
            plugin.status = types_js_1.PluginStatus.REJECTED;
        }
        else {
            plugin.status = types_js_1.PluginStatus.IN_REVIEW;
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
    async approvePlugin(pluginId, approver) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin)
            throw new Error("Plugin not found");
        if (plugin.status !== types_js_1.PluginStatus.IN_REVIEW) {
            throw new Error("Plugin must be in review before approval");
        }
        plugin.status = types_js_1.PluginStatus.APPROVED;
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
    async revokePlugin(pluginId, actor, reason) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin)
            throw new Error("Plugin not found");
        plugin.status = types_js_1.PluginStatus.REVOKED;
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
    getPlugin(id) {
        return this.plugins.get(id);
    }
    getReputation(contributorId) {
        return this.contributorReputations.get(contributorId) ?? 100;
    }
    updateReputation(contributorId, delta) {
        const current = this.getReputation(contributorId);
        const updated = Math.max(0, Math.min(100, current + delta));
        this.contributorReputations.set(contributorId, updated);
        return updated;
    }
    async submitSubgraph(pkg) {
        const reputation = this.getReputation(pkg.contributorId);
        const subgraph = {
            id: pkg.id || (0, crypto_1.randomUUID)(),
            pkg,
            status: types_js_2.SubgraphStatus.SUBMITTED,
            riskScore: 0,
            reputationScore: reputation,
            createdAt: new Date()
        };
        // 1. Reputation Check
        if (reputation < 50) {
            subgraph.status = types_js_2.SubgraphStatus.QUARANTINED;
            subgraph.quarantineReason = 'Contributor reputation below threshold';
            this.subgraphs.set(subgraph.id, subgraph);
            this.audit(subgraph.id, 'SUBGRAPH_QUARANTINED', { reason: subgraph.quarantineReason });
            return subgraph;
        }
        // 2. Signature Check
        const isValidSig = await this.verifySignature(pkg.signature, pkg.payload);
        if (!isValidSig) {
            subgraph.status = types_js_2.SubgraphStatus.QUARANTINED;
            subgraph.quarantineReason = 'Invalid cryptographic signature';
            this.updateReputation(pkg.contributorId, -10); // Penalty
            this.subgraphs.set(subgraph.id, subgraph);
            this.audit(subgraph.id, 'SUBGRAPH_QUARANTINED', { reason: subgraph.quarantineReason });
            return subgraph;
        }
        // 3. PII Detect
        const scanResultEnvelope = await PIIDetector_js_1.piiDetector.scanObject(pkg.payload);
        const scanResult = scanResultEnvelope.data;
        if (scanResult.hasPI || scanResult.riskScore > 50) {
            subgraph.status = types_js_2.SubgraphStatus.QUARANTINED;
            subgraph.quarantineReason = `PII Detected (Risk Score: ${scanResult.riskScore})`;
            subgraph.riskScore = scanResult.riskScore;
            this.updateReputation(pkg.contributorId, -5); // Penalty
            this.subgraphs.set(subgraph.id, subgraph);
            this.audit(subgraph.id, 'SUBGRAPH_QUARANTINED', { reason: subgraph.quarantineReason });
            return subgraph;
        }
        // Passed checks
        subgraph.status = types_js_2.SubgraphStatus.APPROVED;
        const updatedRep = this.updateReputation(pkg.contributorId, +2); // Reward for valid submission
        subgraph.reputationScore = updatedRep;
        this.subgraphs.set(subgraph.id, subgraph);
        this.audit(subgraph.id, 'SUBGRAPH_APPROVED', { contributor: pkg.contributorId });
        return subgraph;
    }
    getSubgraph(id) {
        return this.subgraphs.get(id);
    }
    async verifySignature(signature, payload) {
        try {
            // Stub payload extraction for cosign logic matching verifyCosign's `ref`
            const ref = typeof payload === 'string' ? payload : JSON.stringify(payload);
            const isValid = await (0, verify_js_1.verifyCosign)(signature || ref);
            return isValid;
        }
        catch (error) {
            console.warn('Signature verification failed:', error);
            return false;
        }
    }
    audit(artifactId, event, payload) {
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
exports.MarketplaceService = MarketplaceService;
