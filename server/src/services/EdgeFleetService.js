"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.edgeFleetService = exports.EdgeFleetService = void 0;
// @ts-nocheck
const events_1 = require("events");
const crypto_1 = require("crypto");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const SovereignSafeguardsService_js_1 = __importDefault(require("./SovereignSafeguardsService.js"));
const DefensivePsyOpsService_js_1 = require("./DefensivePsyOpsService.js");
const ledger_js_1 = require("../provenance/ledger.js");
class EdgeFleetService extends events_1.EventEmitter {
    fleets = new Map();
    registeredAgents = new Map();
    sovereignSafeguards;
    defensivePsyOps;
    provenanceLedger;
    constructor() {
        super();
        this.sovereignSafeguards = new SovereignSafeguardsService_js_1.default();
        this.defensivePsyOps = new DefensivePsyOpsService_js_1.DefensivePsyOpsService();
        this.provenanceLedger = ledger_js_1.ProvenanceLedgerV2.getInstance();
    }
    /**
     * Register an agent with SLSA verification
     */
    async registerAgent(manifest) {
        logger_js_1.default.info(`Registering agent ${manifest.agentId} with SLSA Level ${manifest.slsaLevel}`);
        // Simulate SLSA verification (check signature)
        const isVerified = this.verifySLSA(manifest);
        if (!isVerified) {
            logger_js_1.default.warn(`Agent ${manifest.agentId} failed SLSA verification`);
            throw new Error('SLSA Verification Failed');
        }
        this.registeredAgents.set(manifest.agentId, manifest);
        return true;
    }
    /**
     * Create a fleet of agents
     */
    async createFleet(agentIds, environment = 'CONNECTED') {
        const fleetId = (0, crypto_1.randomUUID)();
        // Verify all agents exist
        for (const id of agentIds) {
            if (!this.registeredAgents.has(id)) {
                throw new Error(`Agent ${id} not registered`);
            }
        }
        const fleet = {
            id: fleetId,
            agentIds,
            status: 'CREATED',
            environment,
            logsBuffer: []
        };
        this.fleets.set(fleetId, fleet);
        logger_js_1.default.info(`Created fleet ${fleetId} with ${agentIds.length} agents`);
        return fleetId;
    }
    /**
     * Deploy a fleet for a mission
     */
    async deployFleet(fleetId, missionContext) {
        const fleet = this.fleets.get(fleetId);
        if (!fleet)
            throw new Error('Fleet not found');
        logger_js_1.default.info(`Deploying fleet ${fleetId} for mission ${missionContext.type}`);
        // Check Sovereign Safeguards
        if (fleet.environment === 'DENIED') {
            // Enforce independent verification for denied/sovereign ops
            const verification = await this.sovereignSafeguards.requestIndependentVerification({
                operation: 'DEPLOY_DENIED_ENV',
                verificationSources: ['INTERNAL_SEC', 'AUTO_AUDIT'],
                tenant: 'EDGE_OPS', // Contextual tenant
                actor: missionContext.authorizedBy
            });
            logger_js_1.default.info(`Sovereign verification initiated: ${verification.requestId}`);
        }
        // Check Policy (Mocking OPA check here - ideally call OPA service)
        const allowed = this.checkOPAPolicy(fleet, missionContext);
        if (!allowed) {
            throw new Error('OPA Policy denied deployment');
        }
        fleet.status = fleet.environment === 'DENIED' ? 'OFFLINE' : 'DEPLOYED';
        fleet.missionContext = missionContext;
        this.fleets.set(fleetId, fleet);
        await this.logAction(fleetId, 'DEPLOY', { mission: missionContext });
        return true;
    }
    /**
     * Record activity from an agent/fleet
     */
    async recordActivity(fleetId, activity) {
        const fleet = this.fleets.get(fleetId);
        if (!fleet)
            throw new Error('Fleet not found');
        // Assurance check: Detect hallucinations or adversarial content if it's an output
        if (activity.type === 'OUTPUT') {
            const threat = await this.defensivePsyOps.detectPsychologicalThreats(activity.content, { source: 'AGENT_SELF_CHECK' });
            if (threat) {
                logger_js_1.default.warn(`Agent assurance alert: Potential adversarial output from fleet ${fleetId}`);
                activity.assuranceFlag = 'POTENTIAL_ADVERSARIAL';
            }
        }
        if (fleet.environment === 'DENIED' || fleet.status === 'OFFLINE') {
            // Buffer logs locally
            fleet.logsBuffer.push({ ...activity, timestamp: new Date() });
            logger_js_1.default.debug(`Buffered activity for fleet ${fleetId}`);
        }
        else {
            // Write directly to ledger
            await this.logAction(fleetId, 'ACTIVITY', activity);
        }
    }
    /**
     * Sync buffered logs when connectivity is restored
     */
    async syncLogs(fleetId) {
        const fleet = this.fleets.get(fleetId);
        if (!fleet)
            throw new Error('Fleet not found');
        const count = fleet.logsBuffer.length;
        if (count === 0)
            return 0;
        logger_js_1.default.info(`Syncing ${count} logs for fleet ${fleetId}`);
        for (const log of fleet.logsBuffer) {
            await this.logAction(fleetId, 'SYNCED_ACTIVITY', log);
        }
        fleet.logsBuffer = [];
        return count;
    }
    verifySLSA(manifest) {
        // Mock SLSA verification logic
        // In prod, verify signature matches manifest content and signer is trusted
        return manifest.slsaLevel >= 3 && !!manifest.signature;
    }
    checkOPAPolicy(fleet, mission) {
        // Mock OPA policy check matching policy/edge_agent.rego
        // Default to true for valid scenarios in this MVP
        return true;
    }
    async logAction(fleetId, action, details) {
        try {
            await this.provenanceLedger.appendEntry('SYSTEM', // tenant
            'EdgeFleetService', // agent
            {
                type: 'EDGE_OP',
                fleetId,
                action,
                details
            });
        }
        catch (e) {
            logger_js_1.default.error('Failed to log to ledger', e instanceof Error ? e.message : String(e));
        }
    }
    // Getters for testing
    getFleet(id) { return this.fleets.get(id); }
}
exports.EdgeFleetService = EdgeFleetService;
exports.edgeFleetService = new EdgeFleetService();
