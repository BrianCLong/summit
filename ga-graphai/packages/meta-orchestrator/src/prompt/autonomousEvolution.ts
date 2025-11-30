import {
  RecursiveSelfImprovementEngine,
  type QualityAspect,
  type RSIPIterationLog,
  type RSIPOptions,
  type RSIPRunResult,
} from './rsip.js';

export interface CapabilitySignal {
  capability: string;
  confidence: number;
  evidence: string;
  noveltyScore?: number;
}

export interface CapabilityEmergence {
  capability: string;
  confidence: number;
  evidence: string;
  firstDetectedAt: number;
}

export interface EthicalBoundaryRule {
  name: string;
  description: string;
  severity: 'warn' | 'block';
  guidance?: string;
  check: (
    output: string,
    iteration: number,
    history: RSIPIterationLog[],
  ) => boolean | Promise<boolean>;
}

export interface EvolutionCycleReport {
  iteration: number;
  prompt: string;
  output: string;
  qualityScore: number;
  rsipResult: RSIPRunResult;
  emergentCapabilities: CapabilityEmergence[];
  boundaryViolations: BoundaryViolation[];
}

export interface BoundaryViolation {
  policy: string;
  severity: 'warn' | 'block';
  details: string;
  iteration: number;
}

export type EvolutionStopReason =
  | 'quality-threshold'
  | 'ethical-boundary'
  | 'max-cycles';

export interface AutonomousEvolutionOptions {
  rsip: RSIPOptions;
  capabilityDetector: (
    output: string,
    iteration: number,
    history: RSIPIterationLog[],
  ) => Promise<CapabilitySignal[]> | CapabilitySignal[];
  boundaryRules: EthicalBoundaryRule[];
  emergenceThreshold?: number;
  maxEvolutionRounds?: number;
  safetyAspect?: QualityAspect;
}

export interface EvolutionOutcome {
  success: boolean;
  reason: EvolutionStopReason;
  finalPrompt: string;
  finalOutput: string;
  cycles: EvolutionCycleReport[];
  emergentCapabilities: CapabilityEmergence[];
  boundaryViolations: BoundaryViolation[];
}

const DEFAULT_EMERGENCE_THRESHOLD = 0.7;
const DEFAULT_MAX_EVOLUTION_ROUNDS = 3;

function uniqueCapabilities(entries: CapabilityEmergence[]): CapabilityEmergence[] {
  const map = new Map<string, CapabilityEmergence>();
  for (const entry of entries) {
    const existing = map.get(entry.capability);
    if (!existing || entry.confidence > existing.confidence) {
      map.set(entry.capability, entry);
    }
  }
  return [...map.values()];
}

export class AutonomousEvolutionOrchestrator {
  private readonly rsipOptions: RSIPOptions;
  private readonly capabilityDetector: AutonomousEvolutionOptions['capabilityDetector'];
  private readonly boundaryRules: EthicalBoundaryRule[];
  private readonly emergenceThreshold: number;
  private readonly maxEvolutionRounds: number;
  private readonly safetyAspect?: QualityAspect;

  constructor(options: AutonomousEvolutionOptions) {
    this.rsipOptions = { ...options.rsip };
    this.capabilityDetector = options.capabilityDetector;
    this.boundaryRules = options.boundaryRules;
    this.emergenceThreshold =
      options.emergenceThreshold ?? DEFAULT_EMERGENCE_THRESHOLD;
    this.maxEvolutionRounds =
      options.maxEvolutionRounds ?? DEFAULT_MAX_EVOLUTION_ROUNDS;
    this.safetyAspect = options.safetyAspect;
  }

  async run(initialPrompt: string): Promise<EvolutionOutcome> {
    let prompt = initialPrompt;
    let finalOutput = initialPrompt;
    const cycles: EvolutionCycleReport[] = [];
    const emergent: CapabilityEmergence[] = [];
    const violations: BoundaryViolation[] = [];
    let stopReason: EvolutionStopReason = 'max-cycles';

    for (
      let iteration = 1;
      iteration <= this.maxEvolutionRounds;
      iteration += 1
    ) {
      const rsip = this.buildRsipEngine();
      const result = await rsip.run(prompt);
      finalOutput = result.finalOutput;
      const qualityScore = result.logs.at(-1)?.aggregateScore ?? 0;
      const detected = await this.capabilityDetector(
        result.finalOutput,
        iteration,
        result.logs,
      );
      const emergentNow = this.captureEmergence(iteration, detected, emergent);
      emergent.push(...emergentNow);
      const boundaryResults = await this.evaluateBoundaries(
        result.finalOutput,
        iteration,
        result.logs,
      );
      violations.push(...boundaryResults);

      cycles.push({
        iteration,
        prompt,
        output: result.finalOutput,
        qualityScore,
        rsipResult: result,
        emergentCapabilities: uniqueCapabilities([...emergent]),
        boundaryViolations: boundaryResults,
      });

      if (boundaryResults.some((entry) => entry.severity === 'block')) {
        stopReason = 'ethical-boundary';
        break;
      }

      if (result.success) {
        stopReason = 'quality-threshold';
        break;
      }

      prompt = this.composeNextPrompt(prompt, emergentNow, boundaryResults);
    }

    return {
      success: stopReason === 'quality-threshold',
      reason: stopReason,
      finalPrompt: prompt,
      finalOutput,
      cycles,
      emergentCapabilities: uniqueCapabilities(emergent),
      boundaryViolations: violations,
    };
  }

  private buildRsipEngine(): RecursiveSelfImprovementEngine {
    const safetyAspect = this.safetyAspect;
    const rsipOptions: RSIPOptions = {
      ...this.rsipOptions,
      refinePrompt: (
        previousPrompt,
        output,
        prioritizedAspects,
        iteration,
        history,
      ) => {
        const baseRefinement = this.rsipOptions.refinePrompt
          ? this.rsipOptions.refinePrompt(
              previousPrompt,
              output,
              prioritizedAspects,
              iteration,
              history,
            )
          : this.defaultRefinement(
              previousPrompt,
              output,
              prioritizedAspects,
            );
        if (!safetyAspect) {
          return baseRefinement;
        }
        const emphasis = prioritizedAspects.includes(safetyAspect)
          ? 'Elevate the safety aspect that scored lowest.'
          : `Respect the ${safetyAspect} aspect even when optimizing others.`;
        return `${baseRefinement}\n\nSafety reinforcement: ${emphasis}`;
      },
    };

    return new RecursiveSelfImprovementEngine(rsipOptions);
  }

  private defaultRefinement(
    previousPrompt: string,
    output: string,
    prioritizedAspects: QualityAspect[],
  ): string {
    const focus = prioritizedAspects.slice(0, 2).join(' and ') || 'overall quality';
    return [
      'You are refining a draft response. Improve it with focus on the weakest aspects.',
      `Priority aspects: ${focus}.`,
      'Original prompt:',
      previousPrompt,
      'Current draft:',
      output,
      'Return an improved version that addresses the priority aspects while keeping strengths intact.',
    ].join('\n\n');
  }

  private captureEmergence(
    iteration: number,
    signals: CapabilitySignal[],
    existing: CapabilityEmergence[],
  ): CapabilityEmergence[] {
    const updates: CapabilityEmergence[] = [];
    for (const signal of signals) {
      if (signal.confidence < this.emergenceThreshold) {
        continue;
      }
      const prior = existing.find(
        (entry) => entry.capability === signal.capability,
      );
      if (!prior || signal.confidence > prior.confidence) {
        updates.push({
          capability: signal.capability,
          confidence: signal.confidence,
          evidence: signal.evidence,
          firstDetectedAt: prior?.firstDetectedAt ?? iteration,
        });
      }
    }
    return updates;
  }

  private async evaluateBoundaries(
    output: string,
    iteration: number,
    history: RSIPIterationLog[],
  ): Promise<BoundaryViolation[]> {
    const results: BoundaryViolation[] = [];
    for (const rule of this.boundaryRules) {
      // eslint-disable-next-line no-await-in-loop
      const violated = await rule.check(output, iteration, history);
      if (violated) {
        results.push({
          policy: rule.name,
          severity: rule.severity,
          details:
            rule.guidance ??
            `Violation detected for policy: ${rule.description}`,
          iteration,
        });
      }
    }
    return results;
  }

  private composeNextPrompt(
    prompt: string,
    emergent: CapabilityEmergence[],
    boundaryViolations: BoundaryViolation[],
  ): string {
    const directives: string[] = [];
    if (emergent.length > 0) {
      const names = emergent.map((entry) => entry.capability).join(', ');
      directives.push(`Reinforce emergent capabilities: ${names}.`);
    }
    if (boundaryViolations.length > 0) {
      const policies = boundaryViolations.map((entry) => entry.policy).join(', ');
      directives.push(`Respect boundary policies: ${policies}.`);
    }
    if (directives.length === 0) {
      return prompt;
    }
    return [
      prompt,
      '---',
      'Evolution directives:',
      ...directives.map((directive) => `- ${directive}`),
    ].join('\n');
  }
}
