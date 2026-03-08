"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AgentSwarmService_js_1 = require("../../src/services/AgentSwarmService.js");
const logger_js_1 = require("../../src/config/logger.js");
/**
 * Task #122: Agent Mesh & Mission Automation Drill.
 * Validates autonomous 100-agent swarm orchestration and HITL guardrails.
 */
async function runAgentSwarmDrill() {
    logger_js_1.logger.info('🚀 Starting Agent Swarm Mesh Drill');
    console.log('--- Step 1: Launching Large-Scale Swarm Mission (60 agents) ---');
    const mission = await AgentSwarmService_js_1.agentSwarmService.launchMission('Operation Global Sweep', 60);
    console.log('Mission ID: ' + mission.missionId);
    console.log('Agents Assigned: ' + mission.agents.length);
    console.log('HITL Guardrail Active: ' + mission.humanApprovalRequired);
    console.log('Provenance Hash: ' + mission.provenanceHash.substring(0, 30));
    if (mission.agents.length !== 60) {
        throw new Error('Incorrect agent count assigned');
    }
    if (!mission.humanApprovalRequired) {
        throw new Error('HITL Guardrail failed to trigger');
    }
    if (!mission.provenanceHash.startsWith('pqc-sig:')) {
        throw new Error('PQC Provenance Attestation missing');
    }
    console.log('--- Step 2: Human Approval Simulation ---');
    await AgentSwarmService_js_1.agentSwarmService.approveMission(mission.missionId, 'admin-commander-01');
    logger_js_1.logger.info('✅ Agent Mesh Operational');
    process.exit(0);
}
runAgentSwarmDrill().catch(err => {
    console.error('❌ Drill Failed:', err);
    process.exit(1);
});
