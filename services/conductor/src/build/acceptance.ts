import { AcceptanceCriteria, BuildTicket } from "./schema";

let seq = 0;

export interface AcceptanceSynthesisOptions {
  existing?: AcceptanceCriteria[];
  defaultWindow?: number;
}

export function synthesizeAcceptanceCriteria(
  ticket: BuildTicket,
  options: AcceptanceSynthesisOptions = {}
): AcceptanceCriteria[] {
  const text = `${ticket.title}\n${ticket.body}`;
  const criteria: AcceptanceCriteria[] = [];

  const patterns: { regex: RegExp; metric: string; verify: string; unit?: (m: RegExpMatchArray) => number }[] = [
    {
      regex: /(p(?:90|95|99))\s+build latency\s*(?:<=|<|under)\s*(\d+(?:\.\d+)?)(ms|s)/i,
      metric: "buildLatencyP95Ms",
      verify: "latency-metrics",
      unit: (m) => (m[3].toLowerCase() === "s" ? Number(m[2]) * 1000 : Number(m[2])),
    },
    {
      regex: /flake rate\s*(?:<=|<|under)\s*(\d+(?:\.\d+)?)%\s*(?:over|across)?\s*(\d+)?/i,
      metric: "flakeRate",
      verify: "repro-suite",
      unit: (m) => Number(m[1]) / 100,
    },
    {
      regex: /coverage\s*(?:>=|>|at least)\s*(\d+(?:\.\d+)?)%/i,
      metric: "coverage",
      verify: "coverage",
      unit: (m) => Number(m[1]) / 100,
    },
    {
      regex: /0\s+high\s+cve/i,
      metric: "highCves",
      verify: "scanner",
      unit: () => 0,
    },
    {
      regex: /error\s+budget\s+impact\s*(?:<=|<)\s*(\d+(?:\.\d+)?)%/i,
      metric: "errorBudget",
      verify: "slo-monitor",
      unit: (m) => Number(m[1]) / 100,
    },
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    if (!match) continue;
    const threshold = pattern.unit?.(match);
    const statement = match[0].trim();
    const id = nextId();
    criteria.push({ id, statement, verify: pattern.verify, metric: pattern.metric, threshold });
  }

  if (/pass(?:ing)?\s+tests/i.test(text)) {
    addUnique(criteria, {
      id: nextId(),
      statement: "All impacted unit and integration tests pass",
      verify: "test-suite",
      metric: "testStatus",
      threshold: 1,
    });
  }

  if (!criteria.length) {
    addUnique(criteria, {
      id: nextId(),
      statement: "Demonstrate fix with reproducible failing case turned green",
      verify: "repro-suite",
      metric: "flakeRate",
      threshold: 0,
    });
  }

  if (options.existing) {
    for (const ac of options.existing) addUnique(criteria, ac);
  }

  return criteria;
}

function nextId(): string {
  seq += 1;
  return `AC${seq.toString().padStart(3, "0")}`;
}

function addUnique(criteria: AcceptanceCriteria[], candidate: AcceptanceCriteria): void {
  if (criteria.some((c) => c.statement === candidate.statement)) return;
  criteria.push(candidate);
}
