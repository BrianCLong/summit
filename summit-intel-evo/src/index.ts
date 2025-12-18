
import { EvolutionEngine } from './core/EvolutionEngine.js';
import { FeedbackCollector } from './core/FeedbackCollector.js';
import { CurriculumAgent } from './agents/CurriculumAgent.js';
import { ExecutorAgent } from './agents/ExecutorAgent.js';
import * as fs from 'fs';

/**
 * Main Runner for SummitIntelEvo
 */
export async function runEvolution(rounds: number = 300) {
  console.log(`🚀 Starting SummitIntelEvo Simulation (${rounds} rounds)`);

  const feedback = new FeedbackCollector();
  const engine = new EvolutionEngine(feedback);
  const curriculum = new CurriculumAgent();
  const swarm = [new ExecutorAgent('Agent-Alpha'), new ExecutorAgent('Agent-Beta')];

  const logHeader = 'Round,LRA,CE,KRI\n';
  fs.writeFileSync('intel-evo-metrics.csv', logHeader);

  for (let r = 1; r <= rounds; r++) {
    // 1. Curriculum
    const tasks = curriculum.generateTasks(swarm.length);

    // 2. Execution (Entangled)
    for (let i = 0; i < swarm.length; i++) {
      await swarm[i].execute(tasks[i]);
    }

    // 3. Evolve Loop
    await engine.evolve(r);

    // 4. Log
    const m = engine.getMetrics();
    const logLine = `${r},${m['LRA'].toFixed(4)},${m['CE'].toFixed(4)},${m['KRI'].toFixed(4)}\n`;
    fs.appendFileSync('intel-evo-metrics.csv', logLine);
  }

  console.log('\n--- Simulation Complete ---');
  console.log('Final Metrics (PhD-Level Validation):');
  console.log(JSON.stringify(engine.getMetrics(), null, 2));
  console.log('Artifact generated: intel-evo-metrics.csv');
}
