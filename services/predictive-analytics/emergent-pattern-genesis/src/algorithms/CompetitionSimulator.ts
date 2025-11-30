/**
 * Competition Simulator
 * Models interactions between competing proto-patterns
 */

import { ProtoPatternModel } from '../models/ProtoPattern.js';
import { PatternCompetitionModel, CompetitionOutcome } from '../models/PatternCompetition.js';

export interface CompetitionConfig {
  resourceModel: 'limited' | 'unlimited';
  cooperationAllowed: boolean;
  inhibitionEnabled: boolean;
  timeHorizon: number;
  iterations: number;
}

export interface CompetitorState {
  patternId: string;
  strength: number;
  growthRate: number;
  carryingCapacity: number;
}

export class CompetitionSimulator {
  /**
   * Simulate competition between proto-patterns
   */
  async simulateCompetition(
    protoPatterns: ProtoPatternModel[],
    config: CompetitionConfig
  ): Promise<PatternCompetitionModel> {
    // Initialize competition
    const competition = new PatternCompetitionModel({
      competitorIds: protoPatterns.map((p) => p.id),
    });

    // Calculate overlaps
    const overlaps = this.calculateOverlaps(protoPatterns);

    // Initialize competition matrix
    competition.initializeCompetitionMatrix(overlaps);

    // Initialize competitor states
    const initialStates = protoPatterns.map((p) => ({
      patternId: p.id,
      strength: p.confidence,
      growthRate: this.estimateGrowthRate(p),
      carryingCapacity: this.estimateCarryingCapacity(p, config),
    }));

    // Run simulation
    const trajectory = competition.simulateLotkaVolterra(
      initialStates.map((s) => s.strength),
      initialStates.map((s) => s.growthRate),
      initialStates.map((s) => s.carryingCapacity),
      config.timeHorizon,
      0.1
    );

    // Determine outcome
    const equilibrium = trajectory[trajectory.length - 1];
    competition.determineOutcome(equilibrium);

    // Apply cooperation/inhibition if enabled
    if (config.cooperationAllowed || config.inhibitionEnabled) {
      this.adjustForInteractions(
        competition,
        protoPatterns,
        config
      );
    }

    return competition;
  }

  /**
   * Calculate overlaps between proto-patterns
   */
  private calculateOverlaps(
    protoPatterns: ProtoPatternModel[]
  ): Map<string, Map<string, number>> {
    const overlaps = new Map<string, Map<string, number>>();

    for (let i = 0; i < protoPatterns.length; i++) {
      const p1 = protoPatterns[i];
      overlaps.set(p1.id, new Map());

      for (let j = 0; j < protoPatterns.length; j++) {
        if (i === j) {
          overlaps.get(p1.id)!.set(p1.id, 1.0);
          continue;
        }

        const p2 = protoPatterns[j];
        const overlap = this.calculatePairwiseOverlap(p1, p2);
        overlaps.get(p1.id)!.set(p2.id, overlap);
      }
    }

    return overlaps;
  }

  /**
   * Calculate overlap between two proto-patterns
   */
  private calculatePairwiseOverlap(
    p1: ProtoPatternModel,
    p2: ProtoPatternModel
  ): number {
    // Calculate weak signal overlap
    const signals1 = new Set(
      p1.weakSignals.map((s) => `${s.type}_${JSON.stringify(s.location)}`)
    );
    const signals2 = new Set(
      p2.weakSignals.map((s) => `${s.type}_${JSON.stringify(s.location)}`)
    );

    const intersection = new Set(
      [...signals1].filter((x) => signals2.has(x))
    );
    const union = new Set([...signals1, ...signals2]);

    const signalOverlap = union.size > 0 ? intersection.size / union.size : 0;

    // Calculate structural overlap
    const nodes1 = p1.partialMotif.subgraph?.nodes || [];
    const nodes2 = p2.partialMotif.subgraph?.nodes || [];

    const nodeIds1 = new Set(nodes1.map((n: any) => n.id));
    const nodeIds2 = new Set(nodes2.map((n: any) => n.id));

    const nodeIntersection = new Set(
      [...nodeIds1].filter((x) => nodeIds2.has(x))
    );
    const nodeUnion = new Set([...nodeIds1, ...nodeIds2]);

    const structuralOverlap =
      nodeUnion.size > 0 ? nodeIntersection.size / nodeUnion.size : 0;

    // Weighted combination
    return 0.6 * signalOverlap + 0.4 * structuralOverlap;
  }

  /**
   * Estimate growth rate for a proto-pattern
   */
  private estimateGrowthRate(protoPattern: ProtoPatternModel): number {
    // Growth rate based on confidence and signal strength
    const avgSignalStrength =
      protoPattern.weakSignals.length > 0
        ? protoPattern.weakSignals.reduce((sum, s) => sum + s.strength, 0) /
          protoPattern.weakSignals.length
        : 0.5;

    // Higher confidence and stronger signals = faster growth
    return protoPattern.confidence * avgSignalStrength * 0.5;
  }

  /**
   * Estimate carrying capacity
   */
  private estimateCarryingCapacity(
    protoPattern: ProtoPatternModel,
    config: CompetitionConfig
  ): number {
    if (config.resourceModel === 'unlimited') {
      return 100; // High carrying capacity
    }

    // Limited resources: capacity based on completeness
    // More complete patterns can grow larger
    return 10 + protoPattern.completeness * 40;
  }

  /**
   * Adjust competition for cooperation/inhibition
   */
  private adjustForInteractions(
    competition: PatternCompetitionModel,
    protoPatterns: ProtoPatternModel[],
    config: CompetitionConfig
  ): void {
    const n = protoPatterns.length;

    // Check for cooperation
    if (config.cooperationAllowed) {
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          if (this.areCooperative(protoPatterns[i], protoPatterns[j])) {
            // Reduce competition coefficient
            competition.competitionMatrix[i][j] *= 0.5;
            competition.competitionMatrix[j][i] *= 0.5;
          }
        }
      }
    }

    // Check for inhibition
    if (config.inhibitionEnabled) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i !== j && this.isInhibitory(protoPatterns[i], protoPatterns[j])) {
            // Increase competition coefficient
            competition.competitionMatrix[i][j] *= 1.5;
          }
        }
      }
    }
  }

  /**
   * Check if two patterns are cooperative
   */
  private areCooperative(
    p1: ProtoPatternModel,
    p2: ProtoPatternModel
  ): boolean {
    // Patterns are cooperative if they have complementary features
    // For now, check if they target different node types
    const types1 = p1.partialMotif.features?.nodeTypes || [];
    const types2 = p2.partialMotif.features?.nodeTypes || [];

    const overlap = types1.filter((t: string) => types2.includes(t)).length;
    return overlap === 0 && types1.length > 0 && types2.length > 0;
  }

  /**
   * Check if pattern p1 inhibits pattern p2
   */
  private isInhibitory(
    p1: ProtoPatternModel,
    p2: ProtoPatternModel
  ): boolean {
    // p1 inhibits p2 if p1 is stronger and has high overlap
    const overlap = this.calculatePairwiseOverlap(p1, p2);
    return p1.confidence > p2.confidence && overlap > 0.5;
  }

  /**
   * Run multiple competition scenarios
   */
  async runScenarios(
    protoPatterns: ProtoPatternModel[],
    scenarios: CompetitionConfig[]
  ): Promise<Map<string, PatternCompetitionModel>> {
    const results = new Map<string, PatternCompetitionModel>();

    for (const [index, config] of scenarios.entries()) {
      const competition = await this.simulateCompetition(
        protoPatterns,
        config
      );

      results.set(`scenario_${index}`, competition);
    }

    return results;
  }

  /**
   * Analyze competition sensitivity
   */
  async analyzeSensitivity(
    protoPatterns: ProtoPatternModel[],
    baseConfig: CompetitionConfig,
    perturbations: number
  ): Promise<any> {
    const results: any[] = [];

    for (let i = 0; i < perturbations; i++) {
      // Perturb initial conditions
      const perturbedPatterns = protoPatterns.map((p) => {
        const perturbed = new ProtoPatternModel(p.toJSON());
        perturbed.confidence *= 0.9 + Math.random() * 0.2; // ±10%
        return perturbed;
      });

      const competition = await this.simulateCompetition(
        perturbedPatterns,
        baseConfig
      );

      results.push({
        perturbation: i,
        outcome: competition.predictedOutcome,
        dominantPattern: competition.dominantPatternId,
        equilibrium: competition.equilibriumState,
      });
    }

    // Calculate outcome probabilities
    const outcomes = new Map<CompetitionOutcome, number>();
    for (const result of results) {
      outcomes.set(
        result.outcome,
        (outcomes.get(result.outcome) || 0) + 1
      );
    }

    const outcomeProbabilities = new Map<CompetitionOutcome, number>();
    for (const [outcome, count] of outcomes) {
      outcomeProbabilities.set(outcome, count / perturbations);
    }

    return {
      results: results,
      outcomeProbabilities: Object.fromEntries(outcomeProbabilities),
    };
  }
}
