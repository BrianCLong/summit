/**
 * Agent Archetypes - Main Module
 *
 * Summit's named, opinionated AI agents for business functions:
 * - Chief of Staff: Personal AI assistant for leaders
 * - COO: Operations AI for SLAs, incidents, approvals
 * - RevOps: Revenue AI for pipeline, forecast, churn
 */

// Base infrastructure
export * from './base';

// Agent implementations
export { ChiefOfStaffAgent } from './chief-of-staff/ChiefOfStaffAgent';
export { COOAgent } from './coo/COOAgent';
export { RevOpsAgent } from './revops/RevOpsAgent';

// Re-export registry for convenience
export { AgentRegistry, getAgentRegistry } from './base/AgentRegistry';

/**
 * Initialize all agent archetypes and register them
 */
import { AgentRegistry } from './base/AgentRegistry';
import { ChiefOfStaffAgent } from './chief-of-staff/ChiefOfStaffAgent';
import { COOAgent } from './coo/COOAgent';
import { RevOpsAgent } from './revops/RevOpsAgent';

export async function initializeAgentArchetypes(): Promise<AgentRegistry> {
  const registry = AgentRegistry.getInstance();

  // Register all agent archetypes
  const chiefOfStaff = new ChiefOfStaffAgent();
  const coo = new COOAgent();
  const revOps = new RevOpsAgent();

  registry.register(chiefOfStaff);
  registry.register(coo);
  registry.register(revOps);

  // Initialize all agents
  await registry.initializeAll();

  console.log('[AgentArchetypes] All agents initialized and ready');

  return registry;
}

/**
 * Shutdown all agent archetypes
 */
export async function shutdownAgentArchetypes(): Promise<void> {
  const registry = AgentRegistry.getInstance();
  await registry.shutdownAll();

  console.log('[AgentArchetypes] All agents shutdown');
}
