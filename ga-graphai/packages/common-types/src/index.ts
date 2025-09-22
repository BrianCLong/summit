export type LanguageTag = 'en' | 'es' | 'fr' | 'de' | 'unknown';

export interface EvidenceLink {
  id: string;
  description: string;
  uri: string;
}

export type PolicyTag =
  | 'retention:short-30d'
  | 'retention:standard-365d'
  | 'retention:archive'
  | 'purpose:engineering'
  | 'purpose:compliance'
  | 'purpose:security'
  | 'license:mit-ok'
  | 'license:restricted'
  | 'pii:present'
  | 'pii:absent';

export interface PolicyMetadata {
  purpose: 'engineering' | 'analytics' | 'support';
  retention: 'short-30d' | 'standard-365d' | 'archive';
  licenseClass: 'MIT-OK' | 'RESTRICTED' | 'CUSTOM';
  pii: boolean;
  safetyTier?: 'low' | 'medium' | 'high';
  residency?: 'global' | 'us' | 'eu';
}

export interface AcceptanceCriteria {
  id: string;
  statement: string;
  verify: 'cmd' | 'test' | 'assert' | 'manual';
  metric: string;
  threshold: string;
}

export interface RiskItem {
  id: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface RaciMatrix {
  owner: string;
  reviewers: string[];
}

export interface SlaMetadata {
  due: string;
}

export interface TaskInputReference {
  type: 'code' | 'log' | 'pdf' | 'url' | 'adr' | 'sbom';
  uri: string;
  hash?: string;
  estimatedTokens?: number;
  latencyMs?: number;
}

export interface TaskConstraints {
  latencyP95Ms: number;
  budgetUSD: number;
  contextTokensMax: number;
}

export interface TaskSpec {
  taskId: string;
  tenantId: string;
  title: string;
  goal: string;
  nonGoals: string[];
  inputs: TaskInputReference[];
  constraints: TaskConstraints;
  policy: PolicyMetadata;
  acceptanceCriteria: AcceptanceCriteria[];
  risks: RiskItem[];
  raci: RaciMatrix;
  sla: SlaMetadata;
  policyTags: PolicyTag[];
  language: LanguageTag;
}

export interface TicketInput {
  ticketId: string;
  tenantId: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface Ticket {
  id: string;
  tenantId: string;
  language: LanguageTag;
  title: string;
  summary: string;
  goal: string;
  nonGoals: string[];
  constraints: Partial<TaskConstraints>;
  policyTags: PolicyTag[];
  evidenceLinks: EvidenceLink[];
  ambiguities: string[];
}

export interface ClarifyingQuestion {
  question: string;
  reason: string;
  priority: 'low' | 'medium' | 'high';
}

export interface NormalizedTask {
  ticket: Ticket;
  taskSpec: TaskSpec;
  clarifyingQuestions: ClarifyingQuestion[];
}

export interface CapabilityProfile {
  id: string;
  displayName: string;
  type: 'foundation' | 'fine-tuned' | 'tool' | 'human';
  skills: string[];
  costUSDPer1kTokens: number;
  latencyMsP95: number;
  contextWindowTokens: number;
  safety: 'low' | 'medium' | 'high';
  residency: 'global' | 'us' | 'eu';
  maxConcurrency: number;
  reliabilityScore: number;
}

export interface RouterBid {
  modelId: string;
  est: {
    quality: number;
    latencyMs: number;
    costUSD: number;
  };
  confidence: number;
  fitTags: string[];
  rationale: string;
  sample?: string;
}

export interface RoutingDecision {
  mode: CooperationMode;
  primaryAssignments: string[];
  supportAssignments: string[];
  expectedCostUSD: number;
  expectedLatencyMs: number;
  provenanceRef: string;
}

export type CooperationMode =
  | 'auction-of-experts'
  | 'semantic-braid'
  | 'counterfactual-shadowing'
  | 'causal-challenge-games'
  | 'cross-entropy-swaps'
  | 'proof-of-useful-workbook'
  | 'federated-deliberation';

export interface CooperationArtifact {
  mode: CooperationMode;
  content: string;
  supportingEvidence: EvidenceLink[];
  acceptanceCriteriaSatisfied: string[];
  residualRisks: string[];
}

export interface EvaluatorScore {
  axis: 'accuracy' | 'safety' | 'compliance' | 'readability' | 'performance';
  score: number;
  rationale?: string;
}

export interface ProvenanceRecord {
  reqId: string;
  step: 'critic' | 'router' | 'generator' | 'evaluator' | 'planner';
  inputHash: string;
  outputHash: string;
  modelId: string;
  ckpt: string;
  promptHash: string;
  params: Record<string, unknown>;
  scores: Partial<Record<'accuracy' | 'safety' | 'readability' | 'compliance' | 'performance', number>>;
  policy: PolicyMetadata;
  time: {
    start: string;
    end: string;
  };
  tags?: PolicyTag[];
}

export interface WorkbookCommand {
  description: string;
  command: string;
  expectedOutcome: string;
}

export interface WorkbookReceipt {
  id: string;
  commands: WorkbookCommand[];
  status: 'passed' | 'failed';
  artifacts: EvidenceLink[];
  startedAt: string;
  completedAt: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const REQUIRED_AC_THRESHOLD = 0.01;

export function validateTaskSpec(spec: TaskSpec): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!spec.taskId.trim()) {
    errors.push('taskId is required');
  }
  if (!spec.tenantId.trim()) {
    errors.push('tenantId is required');
  }
  if (!spec.goal.trim()) {
    errors.push('goal is required');
  }
  if (spec.acceptanceCriteria.length === 0) {
    errors.push('at least one acceptance criteria is required');
  }
  spec.acceptanceCriteria.forEach((ac) => {
    if (!ac.statement.trim()) {
      errors.push(`${ac.id} statement is empty`);
    }
    if (parseFloat(ac.threshold) < REQUIRED_AC_THRESHOLD) {
      warnings.push(`${ac.id} threshold appears too low`);
    }
  });

  if (spec.constraints.budgetUSD <= 0) {
    errors.push('budget must be positive');
  }
  if (spec.constraints.latencyP95Ms <= 0) {
    errors.push('latencyP95Ms must be positive');
  }
  if (spec.constraints.contextTokensMax <= 0) {
    errors.push('contextTokensMax must be positive');
  }

  if (!spec.policy.retention) {
    errors.push('policy.retention missing');
  }
  if (spec.policy.pii) {
    if (!spec.policyTags.includes('pii:present')) {
      warnings.push('PII flagged but policy tag missing');
    }
  } else if (!spec.policyTags.includes('pii:absent')) {
    warnings.push('PII absent but missing explicit policy tag');
  }

  const due = Date.parse(spec.sla.due);
  if (Number.isNaN(due)) {
    errors.push('sla.due must be ISO date');
  }

  const coverage = new Set<string>();
  for (const ac of spec.acceptanceCriteria) {
    coverage.add(ac.id);
  }
  if (coverage.size !== spec.acceptanceCriteria.length) {
    errors.push('acceptance criteria ids must be unique');
  }

  spec.policyTags.forEach((tag) => {
    if (tag.startsWith('license') && spec.policy.licenseClass === 'RESTRICTED') {
      warnings.push('license tag indicates restrictions; verify downstream routing');
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
