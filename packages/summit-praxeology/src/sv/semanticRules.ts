import { DEFAULT_PG_CONTENT_SAFETY } from "../policy/pgPolicy";

export type SVViolation = {
  code: string;
  message: string;
  path: string;
};

function containsForbiddenPhrases(text: string): string[] {
  const lower = text.toLowerCase();
  return DEFAULT_PG_CONTENT_SAFETY.prescriptiveLanguageHeuristics.forbiddenPhrases
    .filter(p => lower.includes(p));
}

export function validatePlaybookSemantics(playbook: any): SVViolation[] {
  const violations: SVViolation[] = [];

  // 1) Require explicit analytic-only flags
  if (playbook?.contentSafety?.analyticOnly !== true) {
    violations.push({
      code: "PG_SV_ANALYTIC_ONLY_REQUIRED",
      message: "Playbook must declare contentSafety.analyticOnly=true.",
      path: "/contentSafety/analyticOnly"
    });
  }
  if (playbook?.contentSafety?.forbidPrescriptive !== true) {
    violations.push({
      code: "PG_SV_FORBID_PRESCRIPTIVE_REQUIRED",
      message: "Playbook must declare contentSafety.forbidPrescriptive=true.",
      path: "/contentSafety/forbidPrescriptive"
    });
  }

  // 2) Heuristic prescriptive-language scanning
  const fieldsToScan: Array<{ path: string; value?: unknown }> = [
    { path: "/name", value: playbook?.name },
    { path: "/provenance/source", value: playbook?.provenance?.source }
  ];

  // scan outcome descriptions too (these often leak into “do X to achieve Y” language)
  if (Array.isArray(playbook?.outcomes)) {
    playbook.outcomes.forEach((o: any, i: number) => {
      fieldsToScan.push({ path: `/outcomes/${i}/description`, value: o?.description });
    });
  }

  for (const f of fieldsToScan) {
    if (typeof f.value === "string") {
      const hits = containsForbiddenPhrases(f.value);
      if (hits.length) {
        violations.push({
          code: "PG_SV_PRESCRIPTIVE_LANGUAGE",
          message: `Potentially prescriptive language detected (${hits.join(", ")}). This package is analytic/defensive only.`,
          path: f.path
        });
      }
    }
  }

  // 3) Use-case gate (belt-and-suspenders)
  const allowed = new Set(["detection", "attribution", "forecasting", "training"]);
  if (!allowed.has(playbook?.useCase)) {
    violations.push({
      code: "PG_SV_INVALID_USECASE",
      message: "useCase must be an allowed analytic/defensive value.",
      path: "/useCase"
    });
  }

  return violations;
}
