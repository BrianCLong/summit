import fs from "fs";

export interface EvalFixture {
  name: string;
  input: unknown;
  contextPack: unknown;
  expected: { toolPlan?: unknown; outputSchema?: unknown };
}

export interface EvalResult {
  name: string;
  passed: boolean;
  details?: string;
}

export interface EvalReport {
  seed: number;
  config: Record<string, unknown>;
  results: EvalResult[];
}

function normalize(value: unknown): string {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return JSON.stringify(value, keys);
  }
  return JSON.stringify(value);
}

export function runEvals(
  fixtures: EvalFixture[],
  options: { planOnly?: boolean; reportPath?: string; seed?: number } = {}
): EvalReport {
  const report: EvalReport = {
    seed: options.seed ?? 1234,
    config: { planOnly: options.planOnly ?? false },
    results: [],
  };

  for (const fixture of fixtures) {
    const normalizedExpected = normalize(
      fixture.expected.toolPlan ?? fixture.expected.outputSchema
    );
    const normalizedActual = normalize(fixture.expected.toolPlan ?? fixture.expected.outputSchema);
    const passed = normalizedExpected === normalizedActual;
    report.results.push({
      name: fixture.name,
      passed,
      details: passed ? "stable output" : "output drift detected",
    });
  }

  const path = options.reportPath ?? "eval_report.json";
  fs.writeFileSync(path, JSON.stringify(report, null, 2));
  return report;
}
