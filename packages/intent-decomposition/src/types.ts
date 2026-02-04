export type LocaleTag = string;

export interface UIElementPointer {
  elementId: string;
  description?: string;
  role?: string;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface UIFrame {
  id: string;
  timestamp: string;
  locale: LocaleTag;
  app: string;
  url?: string;
  screenshotRef?: string;
  screenshotEmbeddingRef?: string;
  accessibilityTree?: {
    rootId: string;
    nodes: Array<{
      id: string;
      role?: string;
      name?: string;
      value?: string;
      bounds?: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
      children?: string[];
    }>;
  };
  metadata?: Record<string, string>;
}

export type UIActionType =
  | 'tap'
  | 'scroll'
  | 'type'
  | 'back'
  | 'navigate'
  | 'submit'
  | 'hover'
  | 'drag'
  | 'drop'
  | 'select'
  | 'keypress';

export interface UIAction {
  id: string;
  type: UIActionType;
  targetElementId?: string;
  coordinates?: { x: number; y: number };
  valueTyped?: string;
  timestamp: string;
  metadata?: Record<string, string>;
}

export interface SummaryField<T> {
  value: T;
  factuality: 'observed' | 'inferred';
  evidencePointers: UIElementPointer[];
  uncertainty: number;
}

export interface StepSummary {
  schemaVersion: string;
  screenContext: Array<SummaryField<string>>;
  actions: Array<SummaryField<string>>;
  speculationText: string;
  locale: LocaleTag;
  provenance: {
    modelId: string;
    promptHash: string;
    promptId: string;
    promptVersion: string;
    window: {
      previousFrameId?: string;
      currentFrameId: string;
      nextFrameId?: string;
    };
    generatedAt: string;
  };
}

export interface StepSummaryFactual {
  schemaVersion: string;
  screenContext: Array<SummaryField<string>>;
  actions: Array<SummaryField<string>>;
  locale: LocaleTag;
  provenance: StepSummary['provenance'];
}

export interface IntentStatement {
  schemaVersion: string;
  intent: string;
  atomicFacts: string[];
  confidence: number;
  policy: {
    policyVersion: string;
    redactions: string[];
    allowed: boolean;
    decisionId: string;
  };
  provenance: {
    modelId: string;
    promptHash: string;
    promptId: string;
    promptVersion: string;
    generatedAt: string;
  };
}

export interface BiFactEntailment {
  fact: string;
  entails: boolean;
  rationale: string;
}

export interface BiFactEval {
  schemaVersion: string;
  referenceFacts: string[];
  predictedFacts: string[];
  referenceEntailedByPrediction: BiFactEntailment[];
  predictionEntailedByReference: BiFactEntailment[];
  precision: number;
  recall: number;
  f1: number;
  errorPropagation: {
    missedFacts: string[];
    hallucinatedFacts: string[];
  };
  evaluatedAt: string;
  judge: {
    modelId: string;
    promptHash: string;
    promptId: string;
    promptVersion: string;
  };
}

export interface TrajectoryInput {
  frames: UIFrame[];
  actions: UIAction[];
}
