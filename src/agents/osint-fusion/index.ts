/**
 * OSINT Fusion Engine
 *
 * Autonomous multi-source intelligence fusion with semantic knowledge
 * graph traversal, hallucination guards, and ODNI-compliant zero-trust
 * data coordination.
 *
 * @module osint-fusion
 */

// Core agent
export { OSINTFusionAgent, OSINTFusionAgentConfig } from './OSINTFusionAgent';

// Graph traversal
export { GraphTraversal, TraversalMetrics } from './GraphTraversal';

// Hallucination guard
export { HallucinationGuard, HallucinationGuardConfig } from './HallucinationGuard';

// Source connectors
export {
  SourceConnector,
  SourceConnectorFactory,
  SourceQueryParams,
  SourceHealthStatus,
  RateLimitStatus,
  SocialMediaConnector,
  DomainRegistryConnector,
  DarkWebConnector,
  PublicRecordsConnector,
  NewsMediaConnector,
} from './SourceConnectors';

// Types
export * from './types';

// Factory function for creating configured agents
import { OSINTFusionAgent, OSINTFusionAgentConfig } from './OSINTFusionAgent';
import { getAgentRegistry } from '../archetypes/base/AgentRegistry';

/**
 * Create and optionally register an OSINT Fusion Agent
 */
export async function createOSINTFusionAgent(
  config?: OSINTFusionAgentConfig,
  options?: { register?: boolean },
): Promise<OSINTFusionAgent> {
  const agent = new OSINTFusionAgent(config);
  await agent.initialize();

  if (options?.register) {
    const registry = getAgentRegistry();
    registry.register(agent);
  }

  return agent;
}

/**
 * Default export for convenience
 */
export default OSINTFusionAgent;
