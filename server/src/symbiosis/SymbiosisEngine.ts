import {
  ForesightBundle,
  BeliefState,
  FusionDiff,
  EvolutionProposal,
  SymbiosisKPIs,
  InjectionContext,
  SymbiosisResponse
} from './types';
import { TrajectoryPredictor } from './layers/TrajectoryPredictor';
import { ProbabilisticFusionCore } from './layers/ProbabilisticFusionCore';
import { EvolutionaryMemoryFabric } from './layers/EvolutionaryMemoryFabric';
import { InjectionOrchestrator } from './layers/InjectionOrchestrator';
import { MetaSymbiote } from './layers/MetaSymbiote';

export class SymbiosisEngine {
  private predictor: TrajectoryPredictor;
  private fusionCore: ProbabilisticFusionCore;
  private memoryFabric: EvolutionaryMemoryFabric;
  private orchestrator: InjectionOrchestrator;
  private metaSymbiote: MetaSymbiote;

  constructor() {
    this.predictor = new TrajectoryPredictor();
    this.fusionCore = new ProbabilisticFusionCore();
    this.memoryFabric = new EvolutionaryMemoryFabric();
    this.orchestrator = new InjectionOrchestrator();
    this.metaSymbiote = new MetaSymbiote();
  }

  /**
   * Main entry point: Per-trigger orchestration
   */
  public async processTrigger(
    trigger: string,
    agentInputs: BeliefState[] = []
  ): Promise<SymbiosisResponse> {
    // 1. Predict & Prefetch
    this.predictor.recordStep(trigger);
    const foresight = this.predictor.predict(trigger);

    // 2. Fuse On-Demand
    const { fused, diffs } = this.fusionCore.fuse(agentInputs);

    // Store beliefs in memory
    for(const [k, v] of Object.entries(fused)) {
        this.memoryFabric.store(k, v);
    }

    // 3. Evolve Inline (Simulation)
    const memoryUpdate = this.memoryFabric.evolve();
    const metaProposal = this.metaSymbiote.monitor();
    const proposals: EvolutionProposal[] = [];
    if (metaProposal) proposals.push(metaProposal);
    if (memoryUpdate) {
        proposals.push({
            layer: 'memory',
            change: memoryUpdate,
            expectedGain: 'Unknown',
            status: 'committed'
        });
    }

    // 4. Inject
    const injection = this.orchestrator.prepareContext(foresight, fused, proposals);

    // 5. Construct Response (Simulated answer)
    const enrichedAnswer = {
        context: injection,
        result: `Processed trigger '${trigger}' with ${foresight.length} predictions.`
    };

    return this.formatResponse(injection, enrichedAnswer);
  }

  private formatResponse(injection: InjectionContext, answer: any): SymbiosisResponse {
    const bestForesight = injection.foresight.length > 0
        ? `${injection.foresight.length}/10 probable contexts loaded`
        : "No strong predictions";

    const fusionSummary = Object.keys(injection.beliefs).length > 0
        ? `${Object.keys(injection.beliefs).length} beliefs merged`
        : "No external beliefs";

    const evolutionProp = injection.proposals.length > 0
        ? `${injection.proposals[0].change} (${injection.proposals[0].expectedGain})`
        : "Stability maintained";

    const nextProbes = injection.probes.length > 0
        ? injection.probes.slice(0, 3).join(", ")
        : "Await signal";

    return {
        enrichedAnswer: answer,
        foresightHit: bestForesight,
        fusionSummary: fusionSummary,
        evolutionProposal: evolutionProp,
        nextProbes: nextProbes
    };
  }

  public getKPIs() {
      return this.metaSymbiote.getKPIs();
  }
}
