import { SymbiosisEngine } from './SymbiosisEngine';
import { BeliefState } from './types';

async function runDemo() {
  console.log("=== Initializing Predictive Context Symbiosis Engine ===");
  const engine = new SymbiosisEngine();

  // Simulate a sequence of user actions to prime the predictor
  console.log("\n--- Priming Predictor ---");
  await engine.processTrigger('init');
  await engine.processTrigger('search_users');

  // Create some mock agent beliefs
  const agent1Beliefs: BeliefState = {
    source: 'agent-alpha',
    facts: { target_risk: 'high', location: 'EU' },
    confidence: 0.85,
    timestamp: Date.now()
  };

  const agent2Beliefs: BeliefState = {
    source: 'agent-beta',
    facts: { target_risk: 'medium' }, // Conflict!
    confidence: 0.45,
    timestamp: Date.now()
  };

  console.log("\n--- Processing Trigger: 'view_profile' ---");
  const response = await engine.processTrigger('view_profile', [agent1Beliefs, agent2Beliefs]);

  console.log("\n=== Human Contract Response ===");
  console.log(`Foresight hit: [${response.foresightHit}]`);
  console.log(`Fusion summary: [${response.fusionSummary}]`);
  console.log(`Evolution proposal: [${response.evolutionProposal}]`);
  console.log(`Next probes: [${response.nextProbes}]`);
  console.log("Enriched Answer:", JSON.stringify(response.enrichedAnswer, null, 2));

  console.log("\n--- Symbiosis KPIs ---");
  console.log(engine.getKPIs());
}

runDemo().catch(console.error);
