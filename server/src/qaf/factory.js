"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummitQAF = void 0;
const pki_js_1 = require("./pki.js");
const telemetry_js_1 = require("./telemetry.js");
class SummitQAF {
    pki;
    telemetry;
    agents;
    constructor() {
        this.pki = pki_js_1.PKIService.getInstance();
        this.telemetry = telemetry_js_1.ROITelemetry.getInstance();
        this.agents = new Map();
    }
    /**
     * Spawns a new secure agent with mTLS identity.
     */
    async spawnAgent(config) {
        console.log(`[QAF] Spawning agent: ${config.name} (${config.role})`);
        // 1. Issue mTLS Identity
        const identity = await this.pki.issueIdentity(config);
        this.agents.set(identity.id, identity);
        // 2. Register ROI Tracking
        this.telemetry.recordTaskCompletion(0, true); // Initial registration
        // 3. Enforce Governance (Placeholder)
        if (config.role === 'GovEnforcer') {
            this.telemetry.recordComplianceCheck(true);
        }
        this.updateAgentCounts();
        return identity;
    }
    updateAgentCounts() {
        let secureCount = 0;
        for (const agent of this.agents.values()) {
            if (agent.quantumSafe)
                secureCount++;
        }
        this.telemetry.updateAgentCounts(this.agents.size, secureCount);
    }
    /**
     * Simulates a quantum security scan across all agents.
     */
    async runQuantumScan() {
        const vulnerable = [];
        for (const [id, agent] of this.agents) {
            if (!agent.quantumSafe) {
                vulnerable.push(id);
            }
        }
        const secure = vulnerable.length === 0;
        if (!secure) {
            console.warn(`[QAF] Quantum vulnerability detected in ${vulnerable.length} agents.`);
            this.telemetry.recordComplianceCheck(false);
        }
        else {
            this.telemetry.recordComplianceCheck(true);
        }
        return { secure, vulnerableAgents: vulnerable };
    }
    getTelemetry() {
        return this.telemetry.getMetrics();
    }
}
exports.SummitQAF = SummitQAF;
