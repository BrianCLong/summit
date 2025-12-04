export type LayerSignal = PhysicalSignal | DigitalSignal | CognitiveSignal;

export interface PhysicalSignal {
  readonly type: 'physical';
  readonly sourceId: string;
  readonly timestamp: number;
  readonly metrics: Record<string, number>;
}

export interface DigitalSignal {
  readonly type: 'digital';
  readonly modelId: string;
  readonly timestamp: number;
  readonly stateVector: Record<string, number>;
}

export interface CognitiveSignal {
  readonly type: 'cognitive';
  readonly agentId: string;
  readonly timestamp: number;
  readonly intent: string;
  readonly recommendations: string[];
  readonly confidence: number;
}

export interface TripletDefinition {
  readonly id: string;
  readonly asset: string;
  readonly controlLoopMs: number;
  readonly digitalModels: string[];
  readonly agents: string[];
}

export interface TripletState {
  readonly id: string;
  readonly lastPhysical?: PhysicalSignal;
  readonly lastDigital?: DigitalSignal;
  readonly lastCognitive?: CognitiveSignal;
  readonly driftScore: number;
  readonly resilienceScore: number;
  readonly resilienceForecast: number;
  readonly fusionSignature: string;
  readonly provenanceHash: string;
  readonly anomalyCount: number;
  readonly adversarialFindings: number;
  readonly intentBudget: number;
  readonly volatilityScore: number;
  readonly healthIndex: number;
  readonly cohesionScore: number;
  readonly entropyScore: number;
  readonly recoveryReadiness: number;
  readonly antifragilityIndex: number;
  readonly assuranceScore: number;
  readonly lastAuditAt: number;
}

export interface TripletSnapshot {
  readonly definition: TripletDefinition;
  readonly state: TripletState;
}

export interface FeedbackAction {
  readonly target: 'physical' | 'digital' | 'cognitive';
  readonly summary: string;
  readonly severity: 'info' | 'warn' | 'critical';
  readonly controlVector?: Record<string, number>;
  readonly alignmentToken?: string;
}

export interface IntentResolution {
  readonly nextActions: FeedbackAction[];
  readonly updatedResilience: number;
  readonly budgetUsed?: number;
}

export interface MetricsSink {
  record(event: MetricEvent): void;
}

export interface MetricEvent {
  readonly type:
    | 'triplet-registered'
    | 'signal-ingested'
    | 'feedback-emitted'
    | 'control-loop-heartbeat'
    | 'policy-evaluation'
    | 'fusion-updated'
    | 'consensus-formed'
    | 'anomaly-detected'
    | 'state-audited'
    | 'cohesion-updated'
    | 'entropy-updated'
    | 'recovery-prepared'
    | 'attestation-updated'
    | 'adversary-detected'
    | 'antifragility-updated'
    | 'assurance-updated';
  readonly tripletId: string;
  readonly at: number;
  readonly attributes?: Record<string, number | string>;
}

export interface TripletPersister {
  persist(state: TripletState): Promise<void> | void;
  load(tripletId: string): Promise<TripletState | undefined> | TripletState | undefined;
}

export interface ControlLoopHandle {
  readonly tripletId: string;
  readonly stop: () => void;
  readonly intervalMs: number;
}

export interface ConsensusResult {
  readonly actions: FeedbackAction[];
  readonly remainingBudget: number;
}

export interface RecoveryPlan {
  readonly actions: FeedbackAction[];
  readonly readiness: number;
  readonly rationale: string;
}
