import { agentSwarmService } from '../../src/services/AgentSwarmService.js';
import { logger } from '../../src/config/logger.js';

/**
 * Task #122: Agent Mesh & Mission Automation Drill.
 * Validates autonomous 100-agent swarm orchestration and HITL guardrails.
 */
async function runAgentSwarmDrill() {
  logger.info('🚀 Starting Agent Swarm Mesh Drill');

  console.log('--- Step 1: Launching Large-Scale Swarm Mission (60 agents) ---');
  const mission = await agentSwarmService.launchMission('Operation Global Sweep', 60);

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
  await agentSwarmService.approveMission(mission.missionId, 'admin-commander-01');

  logger.info('✅ Agent Mesh Operational');
  process.exit(0);
}

runAgentSwarmDrill().catch(err => {
  console.error('❌ Drill Failed:', err);
  process.exit(1);
});