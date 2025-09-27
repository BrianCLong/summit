import { ExperimentDefinition, ExperimentVariant } from './types.js';

export class ExperimentEngine {
  private readonly experiments: Map<string, ExperimentDefinition> = new Map();
  private readonly lastSelection: Map<string, ExperimentVariant> = new Map();

  public register(definition: ExperimentDefinition): void {
    this.experiments.set(definition.name, definition);
  }

  public select(experimentName: string | undefined): ExperimentVariant | undefined {
    if (!experimentName) {
      return undefined;
    }
    const experiment = this.experiments.get(experimentName);
    if (!experiment) {
      throw new Error(`Experiment ${experimentName} is not registered`);
    }

    const roll = Math.random();
    let cumulative = experiment.controlVariant.probability;
    if (roll < cumulative) {
      this.lastSelection.set(experimentName, experiment.controlVariant);
      return experiment.controlVariant;
    }

    for (const variant of experiment.variants) {
      cumulative += variant.probability;
      if (roll < cumulative) {
        this.lastSelection.set(experimentName, variant);
        return variant;
      }
    }

    const fallback = experiment.variants[experiment.variants.length - 1] ?? experiment.controlVariant;
    this.lastSelection.set(experimentName, fallback);
    return fallback;
  }

  public getLastSelection(experimentName: string | undefined): ExperimentVariant | undefined {
    if (!experimentName) {
      return undefined;
    }
    return this.lastSelection.get(experimentName);
  }
}
