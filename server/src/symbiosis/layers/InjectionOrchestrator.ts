import { ForesightBundle, InjectionContext, EvolutionProposal } from '../types';

export class InjectionOrchestrator {
  public prepareContext(
    bundles: ForesightBundle[],
    fusedBeliefs: Record<string, any>,
    proposals: EvolutionProposal[]
  ): InjectionContext {

    // Sort bundles by ranking
    const sortedBundles = bundles.sort((a, b) => (b.probability * b.utility) - (a.probability * a.utility));

    // Limit to top K
    const topK = sortedBundles.slice(0, 5);

    return {
      foresight: topK,
      beliefs: fusedBeliefs,
      proposals: proposals,
      probes: this.generateProbes(topK)
    };
  }

  private generateProbes(bundles: ForesightBundle[]): string[] {
    if (bundles.length === 0) return ["Acquire basics"];
    return bundles.map(b => `Verify precondition for ${b.contextParams.predictedState}`);
  }
}
