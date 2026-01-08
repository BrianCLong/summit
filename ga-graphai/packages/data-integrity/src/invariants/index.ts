export type InvariantSeverity = "info" | "warn" | "block";

export interface InvariantViolation {
  ruleId: string;
  message: string;
  affectedIds: string[];
  severity: InvariantSeverity;
  remediation?: string;
}

export interface InvariantRule<T> {
  id: string;
  description: string;
  severity: InvariantSeverity;
  checkBoundary?: (candidate: T) => InvariantViolation | undefined;
  checkAudit?: (candidates: T[]) => InvariantViolation | undefined;
}

export class InvariantEngine<T> {
  constructor(private readonly rules: InvariantRule<T>[]) {}

  runBoundaryChecks(candidate: T): InvariantViolation[] {
    const violations: InvariantViolation[] = [];
    for (const rule of this.rules) {
      if (!rule.checkBoundary) continue;
      const violation = rule.checkBoundary(candidate);
      if (violation) {
        violations.push(violation);
      }
    }
    return violations;
  }

  runAudit(candidates: T[]): InvariantViolation[] {
    const violations: InvariantViolation[] = [];
    for (const rule of this.rules) {
      if (!rule.checkAudit) continue;
      const violation = rule.checkAudit(candidates);
      if (violation) {
        violations.push(violation);
      }
    }
    return violations;
  }
}

export interface GraphEdge {
  from: string;
  to: string;
}

export function uniquenessRule<T extends { id: string }>(
  scope: string,
  severity: InvariantSeverity = "block"
): InvariantRule<T> {
  return {
    id: `${scope}-unique-id`,
    description: "IDs must be unique within scope",
    severity,
    checkAudit: (candidates) => {
      const seen = new Set<string>();
      const duplicates: string[] = [];
      for (const candidate of candidates) {
        if (seen.has(candidate.id)) {
          duplicates.push(candidate.id);
        }
        seen.add(candidate.id);
      }
      if (duplicates.length > 0) {
        return {
          ruleId: `${scope}-unique-id`,
          message: `Duplicate IDs detected: ${duplicates.join(", ")}`,
          affectedIds: duplicates,
          severity,
          remediation: "Normalize upstream ID generation or de-duplicate records",
        };
      }
      return undefined;
    },
  };
}

export function requiredRelationshipRule<T extends { id: string }>(
  relation: string,
  requiredIds: Set<string>,
  severity: InvariantSeverity = "block"
): InvariantRule<T> {
  return {
    id: `${relation}-required`,
    description: `Entities must reference ${relation}`,
    severity,
    checkBoundary: (candidate) => {
      if (!requiredIds.has(candidate.id)) {
        return {
          ruleId: `${relation}-required`,
          message: `Missing required relationship ${relation}`,
          affectedIds: [candidate.id],
          severity,
          remediation: `Provide a valid ${relation} reference before persisting`,
        };
      }
      return undefined;
    },
  };
}

export function cycleRule(
  edges: GraphEdge[],
  severity: InvariantSeverity = "warn"
): InvariantRule<{ id: string }> {
  return {
    id: "graph-cycle-check",
    description: "Detect bounded cycles",
    severity,
    checkAudit: () => {
      const adjacency = new Map<string, Set<string>>();
      for (const edge of edges) {
        if (!adjacency.has(edge.from)) adjacency.set(edge.from, new Set());
        adjacency.get(edge.from)!.add(edge.to);
      }
      const visited = new Set<string>();
      const stack = new Set<string>();

      const detect = (node: string, depth: number): boolean => {
        if (depth > 10) return false;
        if (!adjacency.has(node)) return false;
        visited.add(node);
        stack.add(node);
        for (const neighbor of adjacency.get(node)!) {
          if (!visited.has(neighbor) && detect(neighbor, depth + 1)) return true;
          if (stack.has(neighbor)) return true;
        }
        stack.delete(node);
        return false;
      };

      for (const node of adjacency.keys()) {
        if (detect(node, 0)) {
          return {
            ruleId: "graph-cycle-check",
            message: "Cycle detected in bounded traversal",
            affectedIds: Array.from(stack),
            severity,
            remediation: "Review recent relationships and remove circular dependencies",
          };
        }
      }
      return undefined;
    },
  };
}
