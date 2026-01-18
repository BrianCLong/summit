import type {
  Adjudicator,
  Aggregator,
  EvidenceArtifact,
  LaneResult,
  PolicyGate,
  ProvenanceRecorder,
  ReasoningContext,
  ReasoningLane,
  ReasoningRunResult,
} from './types.js';
import { defaultAggregator } from './aggregator.js';
import { InMemoryProvenanceRecorder } from './provenance.js';

const defaultAdjudicator: Adjudicator = {
  adjudicate: async () => [],
};

const defaultPolicyGate: PolicyGate = {
  requiredLanes: () => ['narrative', 'program', 'symbolic'],
};

const collectEvidence = (results: LaneResult[]): EvidenceArtifact[] => {
  return results.flatMap((result) => result.evidenceArtifacts);
};

export class ReasoningCrew {
  private lanes: Map<string, ReasoningLane>;
  private aggregator: Aggregator;
  private adjudicator: Adjudicator;
  private policyGate: PolicyGate;
  private provenance: ProvenanceRecorder;

  constructor(options: {
    lanes: ReasoningLane[];
    aggregator?: Aggregator;
    adjudicator?: Adjudicator;
    policyGate?: PolicyGate;
    provenance?: ProvenanceRecorder;
  }) {
    this.lanes = new Map(options.lanes.map((lane) => [lane.id, lane]));
    this.aggregator = options.aggregator ?? defaultAggregator;
    this.adjudicator = options.adjudicator ?? defaultAdjudicator;
    this.policyGate = options.policyGate ?? defaultPolicyGate;
    this.provenance = options.provenance ?? new InMemoryProvenanceRecorder();
  }

  async run(
    context: ReasoningContext,
    runtime: Parameters<ReasoningLane['run']>[1],
  ): Promise<ReasoningRunResult> {
    const timestamp = runtime.now?.() ?? new Date().toISOString();
    this.provenance.record({
      type: 'run-start',
      timestamp,
      payload: {
        prompt: context.prompt,
        model: context.model,
        taskClass: context.taskClass,
      },
    });

    const requiredLaneIds = this.policyGate.requiredLanes(context);
    const lanesToRun = requiredLaneIds
      .map((laneId) => this.lanes.get(laneId))
      .filter((lane): lane is ReasoningLane => Boolean(lane));

    const laneResults = await Promise.all(
      lanesToRun.map(async (lane) => {
        const result = await lane.run(context, runtime);
        this.provenance.record({
          type: 'lane-result',
          timestamp: runtime.now?.() ?? new Date().toISOString(),
          payload: {
            laneId: lane.id,
            structuredClaims: result.structuredClaims,
            confidence: result.confidence,
          },
        });
        return result;
      }),
    );

    let decision = this.aggregator.aggregate(laneResults);

    if (decision.disagreement) {
      const adjudicationResults = await this.adjudicator.adjudicate(
        context,
        laneResults,
        runtime,
      );
      adjudicationResults.forEach((result) => laneResults.push(result));
      this.provenance.record({
        type: 'adjudication',
        timestamp: runtime.now?.() ?? new Date().toISOString(),
        payload: {
          addedLanes: adjudicationResults.map((result) => result.laneId),
        },
      });
      decision = this.aggregator.aggregate(laneResults);
    }

    this.provenance.record({
      type: 'aggregation',
      timestamp: runtime.now?.() ?? new Date().toISOString(),
      payload: decision,
    });

    return {
      finalAnswer: decision.finalAnswer,
      decision,
      laneResults,
      evidenceBundle: collectEvidence(laneResults),
      provenance: this.provenance.snapshot?.(),
    };
  }
}
