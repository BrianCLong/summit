
export const scenarioCategories = [
  "prompt-injection",
  "tool-misuse",
  "attribution",
  "redaction",
] as const;

export type ScenarioCategory = (typeof scenarioCategories)[number];

export type PolicyMode = "strict" | "permissive";

export type Decision = "allow" | "deny";

export type Severity = "low" | "medium" | "high" | "critical";

export interface ToolRequest {
  name: string;
  action?: string;
  resources?: string[];
  budget?: number;
}

export interface ScenarioAssertion {
  type: "decision" | "finding" | "trace" | "redaction";
  expectedDecision?: Decision;
  findingCategory?: ScenarioCategory | string;
  minSeverity?: Severity;
  traceTag?: string;
  redactionToken?: string;
}

export interface ExpectedFinding {
  category: ScenarioCategory | string;
  severity: Severity;
  evidence?: string;
  remediation?: string;
}

export interface ExpectedOutcome {
  decision: Decision;
  rationaleIncludes?: string[];
  requiredFindings?: ExpectedFinding[];
  assertions?: ScenarioAssertion[];
  redactions?: string[];
  classification?: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  category: ScenarioCategory;
  intent: string;
  policyMode: PolicyMode;
  initialPrompt: string;
  toolRequest: {
    requested: ToolRequest[];
    allowlist: string[];
    maxBudget?: number;
  };
  attribution?: {
    principal?: string;
    correlationIds?: string[];
    enforce?: boolean;
    spoofed?: boolean;
  };
  toolResponse?: {
    output: string;
  };
  expected: ExpectedOutcome;
}

export interface ScenarioTrace {
  scenarioId: string;
  step: string;
  detail: string;
  tags?: string[];
}

export interface Finding {
  severity: Severity;
  category: ScenarioCategory | string;
  evidence: string;
  remediation?: string;
  traceIds?: string[];
}

export interface EvaluationResult {
  scenario: Scenario;
  passed: boolean;
  decision: Decision;
  findings: Finding[];
  traces: ScenarioTrace[];
  classification?: string;
  error?: string;
}

export interface HarnessConfig {
  seed?: string;
  policyModeOverride?: PolicyMode;
  coverageThresholds?: Partial<Record<ScenarioCategory, number>>;
}

export type ScenarioInput = Scenario;
