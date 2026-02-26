export type CoordinationSeverity = "low" | "medium" | "high" | "critical";

export interface CoordinationEvent {
  id: string;
  actors: string[];
  dependencyIds: string[];
  decisionLatencyMs: number;
  resolved: boolean;
  createdAt: string;
  updatedAt?: string;
  severity?: CoordinationSeverity;
  evidenceId: "EVD-HBR-AI-COORD-001" | "EVD-HBR-AI-COORD-002" | "EVD-HBR-AI-COORD-003";
  metadata?: Record<string, unknown>;
}

export interface CoordinationSla {
  maxDecisionLatencyMs: number;
  maxUnresolvedDependencies: number;
}

export interface CoordinationValidationResult {
  valid: boolean;
  violations: string[];
}

export function validateCoordinationEvent(
  event: CoordinationEvent,
  sla: CoordinationSla
): CoordinationValidationResult {
  const violations: string[] = [];

  if (event.actors.length === 0) {
    violations.push("actors must include at least one attributed actor");
  }

  if (event.decisionLatencyMs < 0) {
    violations.push("decisionLatencyMs must be non-negative");
  }

  if (event.decisionLatencyMs > sla.maxDecisionLatencyMs) {
    violations.push("decisionLatencyMs exceeds SLA threshold");
  }

  if (!event.resolved && event.dependencyIds.length > sla.maxUnresolvedDependencies) {
    violations.push("unresolved dependency count exceeds SLA threshold");
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}
