import { Optimizer, OptimizationStudy, TrialResult } from '../types.js';

/**
 * Genetic Algorithm optimizer for hyperparameter tuning
 */
export class GeneticAlgorithmOptimizer implements Optimizer {
  private populationSize: number;
  private mutationRate: number;
  private crossoverRate: number;
  private eliteSize: number;
  private population: Individual[] = [];

  constructor(config: {
    populationSize?: number;
    mutationRate?: number;
    crossoverRate?: number;
    eliteSize?: number;
  } = {}) {
    this.populationSize = config.populationSize || 50;
    this.mutationRate = config.mutationRate || 0.1;
    this.crossoverRate = config.crossoverRate || 0.7;
    this.eliteSize = config.eliteSize || 5;
  }

  getName(): string {
    return 'GeneticAlgorithm';
  }

  async suggest(study: OptimizationStudy): Promise<Record<string, any>> {
    const { searchSpace } = study.config;

    // Initialize population if needed
    if (this.population.length === 0) {
      this.initializePopulation(searchSpace.parameters);
      return this.population[0].genes;
    }

    // Update fitness based on completed trials
    this.updateFitness(study);

    // Select parents
    const parents = this.selection();

    // Create offspring through crossover
    let offspring: Individual;
    if (Math.random() < this.crossoverRate && parents.length >= 2) {
      offspring = this.crossover(parents[0], parents[1]);
    } else {
      offspring = { ...parents[0] };
    }

    // Mutate
    if (Math.random() < this.mutationRate) {
      offspring = this.mutate(offspring, searchSpace.parameters);
    }

    return offspring.genes;
  }

  update(study: OptimizationStudy, trial: TrialResult): void {
    // Update population with new trial result
    if (trial.status === 'completed') {
      const individual = this.population.find(
        ind => JSON.stringify(ind.genes) === JSON.stringify(trial.parameters)
      );

      if (individual) {
        individual.fitness = trial.score;
      }
    }

    // Replace worst individuals with new ones
    if (this.population.length >= this.populationSize) {
      this.population.sort((a, b) => (b.fitness || 0) - (a.fitness || 0));
      this.population = this.population.slice(0, this.populationSize);
    }
  }

  private initializePopulation(parameters: any[]): void {
    for (let i = 0; i < this.populationSize; i++) {
      const genes = this.randomGenes(parameters);
      this.population.push({ genes, fitness: undefined });
    }
  }

  private randomGenes(parameters: any[]): Record<string, any> {
    const genes: Record<string, any> = {};

    for (const param of parameters) {
      genes[param.name] = this.randomValue(param);
    }

    return genes;
  }

  private randomValue(param: any): any {
    switch (param.type) {
      case 'int':
        return this.randomInt(param.min, param.max, param.logScale);
      case 'float':
        return this.randomFloat(param.min, param.max, param.logScale);
      case 'categorical':
        return param.values[Math.floor(Math.random() * param.values.length)];
      case 'boolean':
        return Math.random() > 0.5;
      default:
        return param.default;
    }
  }

  private randomInt(min: number, max: number, logScale?: boolean): number {
    if (logScale) {
      const logMin = Math.log(min);
      const logMax = Math.log(max);
      return Math.round(Math.exp(Math.random() * (logMax - logMin) + logMin));
    }
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomFloat(min: number, max: number, logScale?: boolean): number {
    if (logScale) {
      const logMin = Math.log(min);
      const logMax = Math.log(max);
      return Math.exp(Math.random() * (logMax - logMin) + logMin);
    }
    return Math.random() * (max - min) + min;
  }

  private updateFitness(study: OptimizationStudy): void {
    const completedTrials = study.trials.filter(t => t.status === 'completed');

    for (const individual of this.population) {
      const trial = completedTrials.find(
        t => JSON.stringify(t.parameters) === JSON.stringify(individual.genes)
      );

      if (trial) {
        individual.fitness = trial.score;
      }
    }
  }

  private selection(): Individual[] {
    // Tournament selection
    const tournamentSize = 3;
    const selected: Individual[] = [];

    // Always include elite individuals
    const sorted = [...this.population].sort((a, b) =>
      (b.fitness || -Infinity) - (a.fitness || -Infinity)
    );
    selected.push(...sorted.slice(0, this.eliteSize));

    // Tournament selection for the rest
    while (selected.length < this.populationSize / 2) {
      const tournament: Individual[] = [];

      for (let i = 0; i < tournamentSize; i++) {
        const randomIndex = Math.floor(Math.random() * this.population.length);
        tournament.push(this.population[randomIndex]);
      }

      const winner = tournament.reduce((best, current) =>
        (current.fitness || -Infinity) > (best.fitness || -Infinity) ? current : best
      );

      selected.push(winner);
    }

    return selected;
  }

  private crossover(parent1: Individual, parent2: Individual): Individual {
    const genes: Record<string, any> = {};
    const keys = Object.keys(parent1.genes);

    for (const key of keys) {
      // Uniform crossover: randomly choose from either parent
      genes[key] = Math.random() < 0.5 ? parent1.genes[key] : parent2.genes[key];
    }

    return { genes, fitness: undefined };
  }

  private mutate(individual: Individual, parameters: any[]): Individual {
    const genes = { ...individual.genes };

    for (const param of parameters) {
      if (Math.random() < this.mutationRate) {
        genes[param.name] = this.randomValue(param);
      }
    }

    return { genes, fitness: undefined };
  }
}

interface Individual {
  genes: Record<string, any>;
  fitness?: number;
}
