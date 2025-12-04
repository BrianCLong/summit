/**
 * Pattern Genesis Engine - Core Engine
 * Predicts patterns that don't exist yet - future motifs of system behavior
 */

import { ProtoPatternDetector, ProtoPatternResult } from './algorithms/ProtoPatternDetector.js';
import { PatternEvolver, EvolutionResult } from './algorithms/PatternEvolver.js';
import { CompetitionSimulator, CompetitionResult } from './algorithms/CompetitionSimulator.js';
import { DominancePredictor, DominanceResult } from './algorithms/DominancePredictor.js';
import { ProtoPattern } from './models/ProtoPattern.js';
import { FutureMotif } from './models/FutureMotif.js';
import { PatternCompetition } from './models/PatternCompetition.js';
import { DominanceScore } from './models/DominanceScore.js';

export interface GenesisConfig {
  detectionSensitivity: number;
  evolutionSteps: number;
  competitionRounds: number;
  dominanceThreshold: number;
}

export interface GenesisResult {
  protoPatterns: ProtoPattern[];
  evolvedMotifs: FutureMotif[];
  competitions: PatternCompetition[];
  dominantPatterns: DominanceScore[];
}

export class PatternGenesisEngine {
  private detector: ProtoPatternDetector;
  private evolver: PatternEvolver;
  private simulator: CompetitionSimulator;
  private predictor: DominancePredictor;

  private protoPatterns: Map<string, ProtoPattern> = new Map();
  private motifs: Map<string, FutureMotif> = new Map();
  private competitions: Map<string, PatternCompetition> = new Map();

  private config: GenesisConfig;

  constructor(config?: Partial<GenesisConfig>) {
    this.config = {
      detectionSensitivity: 0.7,
      evolutionSteps: 10,
      competitionRounds: 5,
      dominanceThreshold: 0.6,
      ...config,
    };

    this.detector = new ProtoPatternDetector(this.config.detectionSensitivity);
    this.evolver = new PatternEvolver(this.config.evolutionSteps);
    this.simulator = new CompetitionSimulator(this.config.competitionRounds);
    this.predictor = new DominancePredictor(this.config.dominanceThreshold);
  }

  async detectProtoPatterns(
    data: unknown[],
    domain: string,
  ): Promise<ProtoPatternResult> {
    const result = await this.detector.detect(data, domain);

    for (const pattern of result.patterns) {
      this.protoPatterns.set(pattern.id, pattern);
    }

    return result;
  }

  async evolvePattern(
    patternId: string,
    environmentalFactors: Record<string, number>,
  ): Promise<EvolutionResult> {
    const pattern = this.protoPatterns.get(patternId);
    if (!pattern) {
      throw new Error(`Proto-pattern not found: ${patternId}`);
    }

    const result = await this.evolver.evolve(pattern, environmentalFactors);

    if (result.motif) {
      this.motifs.set(result.motif.id, result.motif);
    }

    return result;
  }

  async predictMotifs(
    domain: string,
    horizon: number,
  ): Promise<FutureMotif[]> {
    // Get all proto-patterns for domain
    const domainPatterns = [...this.protoPatterns.values()].filter(
      (p) => p.domain === domain,
    );

    const evolvedMotifs: FutureMotif[] = [];

    for (const pattern of domainPatterns) {
      const result = await this.evolver.evolve(pattern, { horizon });
      if (result.motif && result.motif.maturityScore >= 0.5) {
        evolvedMotifs.push(result.motif);
        this.motifs.set(result.motif.id, result.motif);
      }
    }

    return evolvedMotifs;
  }

  async runCompetition(
    patternIds: string[],
  ): Promise<CompetitionResult> {
    const patterns = patternIds
      .map((id) => this.protoPatterns.get(id) || this.motifs.get(id))
      .filter((p): p is ProtoPattern | FutureMotif => p !== undefined);

    if (patterns.length < 2) {
      throw new Error('Competition requires at least 2 patterns');
    }

    const result = await this.simulator.simulate(patterns);

    if (result.competition) {
      this.competitions.set(result.competition.id, result.competition);
    }

    return result;
  }

  async getDominantPatterns(domain?: string): Promise<DominanceScore[]> {
    let patterns = [...this.motifs.values()];

    if (domain) {
      patterns = patterns.filter((p) => p.domain === domain);
    }

    return this.predictor.predict(patterns);
  }

  seedPattern(
    name: string,
    domain: string,
    signature: unknown,
  ): ProtoPattern {
    const pattern: ProtoPattern = {
      id: crypto.randomUUID(),
      name,
      domain,
      signature,
      strength: 0.1,
      stability: 0.5,
      growthRate: 0.0,
      firstDetected: new Date(),
      lastUpdated: new Date(),
    };

    this.protoPatterns.set(pattern.id, pattern);
    return pattern;
  }

  getProtoPattern(patternId: string): ProtoPattern | undefined {
    return this.protoPatterns.get(patternId);
  }

  getMotif(motifId: string): FutureMotif | undefined {
    return this.motifs.get(motifId);
  }

  getCompetition(competitionId: string): PatternCompetition | undefined {
    return this.competitions.get(competitionId);
  }

  getAllProtoPatterns(): ProtoPattern[] {
    return [...this.protoPatterns.values()];
  }

  getAllMotifs(): FutureMotif[] {
    return [...this.motifs.values()];
  }

  getCompetitions(): PatternCompetition[] {
    return [...this.competitions.values()];
  }

  async runFullAnalysis(
    data: unknown[],
    domain: string,
    horizon: number,
  ): Promise<GenesisResult> {
    // 1. Detect proto-patterns
    const detectionResult = await this.detectProtoPatterns(data, domain);

    // 2. Evolve patterns to motifs
    const evolvedMotifs = await this.predictMotifs(domain, horizon);

    // 3. Run competitions if multiple motifs
    const competitions: PatternCompetition[] = [];
    if (evolvedMotifs.length >= 2) {
      const compResult = await this.runCompetition(
        evolvedMotifs.map((m) => m.id),
      );
      if (compResult.competition) {
        competitions.push(compResult.competition);
      }
    }

    // 4. Predict dominant patterns
    const dominantPatterns = await this.getDominantPatterns(domain);

    return {
      protoPatterns: detectionResult.patterns,
      evolvedMotifs,
      competitions,
      dominantPatterns,
    };
  }
}

export function createPatternGenesisEngine(
  config?: Partial<GenesisConfig>,
): PatternGenesisEngine {
  return new PatternGenesisEngine(config);
}
