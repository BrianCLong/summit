/**
 * Multi-Objective Program Optimizer (NSGA-II lite)
 * Chooses what to do next using an optimizer that balances OKR impact, dollars, and carbon
 */

import { EventEmitter } from 'events';

export interface Plan {
  id: string;
  actions: number[];
  description: string;
}

export interface Fitness {
  okr: number;
  cost: number;
  carbon: number;
}

export interface ParetoSolution {
  id: string;
  actions: number[];
  fitness: Fitness;
  feasible: boolean;
  kneePoint: boolean;
  dominationCount: number;
  dominatedSolutions: string[];
  rank: number;
}

export interface ObjectiveWeights {
  okr: number;
  cost: number;
  carbon: number;
}

export class ParetoOptimizer extends EventEmitter {
  private weights: ObjectiveWeights;
  private population: ParetoSolution[] = [];
  private paretoFrontier: ParetoSolution[] = [];
  private generation: number = 0;

  constructor(weights: ObjectiveWeights) {
    super();
    this.weights = weights;
  }

  /**
   * Generate Pareto frontier of plans using NSGA-II algorithm
   */
  async generateParetoFrontier(
    okrs: Array<{
      id: string;
      target: number;
      current: number;
      weight: number;
    }>,
    budgets: { usd: number; carbon: number; ci: number },
    constraints: Array<{ type: string; value: any }>,
  ): Promise<ParetoSolution[]> {
    // Generate initial population
    const populationSize = 50;
    this.population = await this.generateInitialPopulation(
      populationSize,
      okrs,
      budgets,
    );

    // Evaluate fitness for each solution
    for (const solution of this.population) {
      solution.fitness = await this.evaluateFitness(solution, okrs, budgets);
      solution.feasible = this.checkConstraints(solution, constraints);
    }

    // Run NSGA-II for multiple generations
    const maxGenerations = 10;
    for (let gen = 0; gen < maxGenerations; gen++) {
      this.generation = gen;
      await this.evolvePopulation();
    }

    // Extract Pareto frontier
    this.paretoFrontier = this.extractParetoFrontier();
    this.markKneePoint();

    this.emit('frontierGenerated', {
      solutions: this.paretoFrontier.length,
      generation: this.generation,
    });
    return this.paretoFrontier;
  }

  private async generateInitialPopulation(
    size: number,
    okrs: any[],
    budgets: any,
  ): Promise<ParetoSolution[]> {
    const population: ParetoSolution[] = [];

    for (let i = 0; i < size; i++) {
      const actions = Array.from({ length: okrs.length }, () => Math.random());

      const solution: ParetoSolution = {
        id: `solution-${i}`,
        actions,
        fitness: { okr: 0, cost: 0, carbon: 0 },
        feasible: true,
        kneePoint: false,
        dominationCount: 0,
        dominatedSolutions: [],
        rank: 0,
      };

      population.push(solution);
    }

    return population;
  }

  private async evaluateFitness(
    solution: ParetoSolution,
    okrs: any[],
    budgets: any,
  ): Promise<Fitness> {
    // Calculate OKR improvement
    let okrImprovement = 0;
    for (let i = 0; i < okrs.length; i++) {
      const okr = okrs[i];
      const actionStrength = solution.actions[i];
      const potentialGain = (okr.target - okr.current) / okr.target;
      okrImprovement += potentialGain * actionStrength * okr.weight;
    }

    // Calculate cost (inverse - higher cost = lower fitness)
    let totalCost = 0;
    for (let i = 0; i < solution.actions.length; i++) {
      const actionCost = solution.actions[i] * 1000; // Base cost per action
      totalCost += actionCost;
    }
    const costFitness = Math.max(0, 1 - totalCost / budgets.usd);

    // Calculate carbon efficiency (inverse - higher carbon = lower fitness)
    let totalCarbon = 0;
    for (let i = 0; i < solution.actions.length; i++) {
      const actionCarbon = solution.actions[i] * 50; // Base carbon per action
      totalCarbon += actionCarbon;
    }
    const carbonFitness = Math.max(0, 1 - totalCarbon / budgets.carbon);

    return {
      okr: Math.min(1, okrImprovement),
      cost: costFitness,
      carbon: carbonFitness,
    };
  }

  private checkConstraints(
    solution: ParetoSolution,
    constraints: any[],
  ): boolean {
    for (const constraint of constraints) {
      switch (constraint.type) {
        case 'max_actions':
          if (
            solution.actions.filter((a) => a > 0.5).length > constraint.value
          ) {
            return false;
          }
          break;
        case 'min_okr_impact':
          if (solution.fitness.okr < constraint.value) {
            return false;
          }
          break;
        case 'max_cost_ratio':
          if (solution.fitness.cost < constraint.value) {
            return false;
          }
          break;
      }
    }
    return true;
  }

  private async evolvePopulation(): Promise<void> {
    // Fast non-dominated sorting
    this.fastNonDominatedSort();

    // Calculate crowding distance
    this.calculateCrowdingDistance();

    // Selection and reproduction
    const newPopulation = await this.selectionAndReproduction();

    this.population = newPopulation;
  }

  private fastNonDominatedSort(): void {
    const fronts: ParetoSolution[][] = [[]];

    // Initialize domination counts and dominated solutions
    for (const p of this.population) {
      p.dominationCount = 0;
      p.dominatedSolutions = [];

      for (const q of this.population) {
        if (p.id !== q.id) {
          if (this.dominates(p.fitness, q.fitness)) {
            p.dominatedSolutions.push(q.id);
          } else if (this.dominates(q.fitness, p.fitness)) {
            p.dominationCount++;
          }
        }
      }

      if (p.dominationCount === 0) {
        p.rank = 0;
        fronts[0].push(p);
      }
    }

    // Build subsequent fronts
    let frontIndex = 0;
    while (fronts[frontIndex].length > 0) {
      const nextFront: ParetoSolution[] = [];

      for (const p of fronts[frontIndex]) {
        for (const qId of p.dominatedSolutions) {
          const q = this.population.find((s) => s.id === qId)!;
          q.dominationCount--;

          if (q.dominationCount === 0) {
            q.rank = frontIndex + 1;
            nextFront.push(q);
          }
        }
      }

      frontIndex++;
      fronts.push(nextFront);
    }
  }

  private dominates(fitnessA: Fitness, fitnessB: Fitness): boolean {
    const aValues = [fitnessA.okr, fitnessA.cost, fitnessA.carbon];
    const bValues = [fitnessB.okr, fitnessB.cost, fitnessB.carbon];

    // A dominates B if A is >= B in all objectives and > B in at least one
    const allGreaterOrEqual = aValues.every((a, i) => a >= bValues[i]);
    const someGreater = aValues.some((a, i) => a > bValues[i]);

    return allGreaterOrEqual && someGreater;
  }

  private calculateCrowdingDistance(): void {
    const objectives = ['okr', 'cost', 'carbon'];

    for (const solution of this.population) {
      (solution as any).crowdingDistance = 0;
    }

    for (const objective of objectives) {
      // Sort by objective value
      const sortedPopulation = [...this.population].sort(
        (a, b) => (b.fitness as any)[objective] - (a.fitness as any)[objective],
      );

      // Set boundary solutions to infinity
      (sortedPopulation[0] as any).crowdingDistance = Infinity;
      (sortedPopulation[sortedPopulation.length - 1] as any).crowdingDistance =
        Infinity;

      // Calculate distances for intermediate solutions
      const maxValue = (sortedPopulation[0].fitness as any)[objective];
      const minValue = (
        sortedPopulation[sortedPopulation.length - 1].fitness as any
      )[objective];
      const range = maxValue - minValue;

      if (range > 0) {
        for (let i = 1; i < sortedPopulation.length - 1; i++) {
          const distance =
            ((sortedPopulation[i - 1].fitness as any)[objective] -
              (sortedPopulation[i + 1].fitness as any)[objective]) /
            range;
          (sortedPopulation[i] as any).crowdingDistance += distance;
        }
      }
    }
  }

  private async selectionAndReproduction(): Promise<ParetoSolution[]> {
    const newPopulation: ParetoSolution[] = [];

    // Keep the best solutions (elitism)
    const sortedByRank = [...this.population].sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return (
        ((b as any).crowdingDistance || 0) - ((a as any).crowdingDistance || 0)
      );
    });

    // Add top 50% to new population
    const eliteCount = Math.floor(this.population.length * 0.5);
    newPopulation.push(...sortedByRank.slice(0, eliteCount));

    // Generate offspring for the remaining slots
    while (newPopulation.length < this.population.length) {
      const parent1 = this.tournamentSelection();
      const parent2 = this.tournamentSelection();
      const offspring = await this.crossover(parent1, parent2);
      await this.mutate(offspring);
      newPopulation.push(offspring);
    }

    return newPopulation;
  }

  private tournamentSelection(): ParetoSolution {
    const tournamentSize = 3;
    const tournament: ParetoSolution[] = [];

    for (let i = 0; i < tournamentSize; i++) {
      const randomIndex = Math.floor(Math.random() * this.population.length);
      tournament.push(this.population[randomIndex]);
    }

    return tournament.sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return (
        ((b as any).crowdingDistance || 0) - ((a as any).crowdingDistance || 0)
      );
    })[0];
  }

  private async crossover(
    parent1: ParetoSolution,
    parent2: ParetoSolution,
  ): Promise<ParetoSolution> {
    const offspring: ParetoSolution = {
      id: `offspring-${Date.now()}-${Math.random()}`,
      actions: [],
      fitness: { okr: 0, cost: 0, carbon: 0 },
      feasible: true,
      kneePoint: false,
      dominationCount: 0,
      dominatedSolutions: [],
      rank: 0,
    };

    // Uniform crossover
    for (let i = 0; i < parent1.actions.length; i++) {
      offspring.actions[i] =
        Math.random() < 0.5 ? parent1.actions[i] : parent2.actions[i];
    }

    return offspring;
  }

  private async mutate(solution: ParetoSolution): Promise<void> {
    const mutationRate = 0.1;

    for (let i = 0; i < solution.actions.length; i++) {
      if (Math.random() < mutationRate) {
        solution.actions[i] = Math.random();
      }
    }
  }

  private extractParetoFrontier(): ParetoSolution[] {
    return this.population.filter(
      (solution) => solution.rank === 0 && solution.feasible,
    );
  }

  private markKneePoint(): void {
    if (this.paretoFrontier.length === 0) return;

    // Find knee point (solution with best compromise)
    let bestKnee: ParetoSolution | null = null;
    let bestUtility = -Infinity;

    for (const solution of this.paretoFrontier) {
      // Calculate weighted utility
      const utility =
        this.weights.okr * solution.fitness.okr +
        this.weights.cost * solution.fitness.cost +
        this.weights.carbon * solution.fitness.carbon;

      if (utility > bestUtility) {
        bestUtility = utility;
        bestKnee = solution;
      }
    }

    if (bestKnee) {
      bestKnee.kneePoint = true;
    }
  }

  /**
   * Select the knee point solution (best compromise)
   */
  selectKneePoint(frontier: ParetoSolution[]): ParetoSolution {
    const kneePoint = frontier.find((s) => s.kneePoint);
    return kneePoint || frontier[0]; // Fallback to first solution
  }

  /**
   * Optimize for a specific PR
   */
  async optimizeForPR(
    prData: any,
  ): Promise<{ utility: number; tradeoffs: any[] }> {
    // Simplified optimization for individual PR
    const actions = [Math.random(), Math.random(), Math.random()]; // Mock actions
    const fitness = await this.evaluateFitness(
      {
        id: 'pr-temp',
        actions,
        fitness: { okr: 0, cost: 0, carbon: 0 },
      } as ParetoSolution,
      [
        { id: 'quality', target: 1, current: 0.8, weight: 0.4 },
        { id: 'speed', target: 1, current: 0.7, weight: 0.3 },
        { id: 'reliability', target: 1, current: 0.9, weight: 0.3 },
      ],
      { usd: 1000, carbon: 100, ci: 60 },
    );

    const utility =
      this.weights.okr * fitness.okr +
      this.weights.cost * fitness.cost +
      this.weights.carbon * fitness.carbon;

    const tradeoffs = [
      { from: 'cost', to: 'okr', ratio: fitness.cost / fitness.okr },
      { from: 'carbon', to: 'okr', ratio: fitness.carbon / fitness.okr },
    ];

    return { utility, tradeoffs };
  }

  /**
   * Get analysis of the current Pareto frontier
   */
  async getAnalysis(): Promise<{
    frontier: ParetoSolution[];
    kneePoint: ParetoSolution;
    tradeoffs: Array<{ from: string; to: string; ratio: number }>;
  }> {
    const kneePoint =
      this.paretoFrontier.find((s) => s.kneePoint) || this.paretoFrontier[0];

    // Calculate average tradeoff ratios across frontier
    const tradeoffs = [];
    if (this.paretoFrontier.length > 1) {
      const avgCostOkr =
        this.paretoFrontier.reduce(
          (sum, s) => sum + s.fitness.cost / Math.max(0.001, s.fitness.okr),
          0,
        ) / this.paretoFrontier.length;
      const avgCarbonOkr =
        this.paretoFrontier.reduce(
          (sum, s) => sum + s.fitness.carbon / Math.max(0.001, s.fitness.okr),
          0,
        ) / this.paretoFrontier.length;

      tradeoffs.push(
        { from: 'cost', to: 'okr', ratio: avgCostOkr },
        { from: 'carbon', to: 'okr', ratio: avgCarbonOkr },
      );
    }

    return {
      frontier: this.paretoFrontier,
      kneePoint,
      tradeoffs,
    };
  }

  /**
   * Recalibrate the optimizer with new weights
   */
  async recalibrate(): Promise<void> {
    // Reset population and re-evaluate with current conditions
    this.generation = 0;
    this.population = [];
    this.paretoFrontier = [];
    this.emit('recalibrated');
  }
}

export default ParetoOptimizer;
