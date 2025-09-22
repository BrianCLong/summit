import { BuildTicket, BuildTargetRef, ConstraintSet } from "./schema";

export interface IntentExtraction {
  goal: string;
  nonGoals: string[];
  targets: BuildTargetRef[];
  constraints: ConstraintSet;
  risks: string[];
  raci: { owner: string; reviewers: string[] };
  sla?: { due: string };
}

const BUILD_FACET_KEYWORDS: Record<string, BuildTargetRef["job"]> = {
  test: "test",
  tests: "test",
  lint: "lint",
  build: "build",
  scan: "scan",
  package: "package",
  deploy: "deploy",
  release: "release",
  profile: "profile",
};

export function extractIntent(ticket: BuildTicket): IntentExtraction {
  const body = ticket.body || "";
  const goal = extractGoal(body, ticket.title);
  const nonGoals = extractNonGoals(body);
  const targets = extractTargets(body, ticket.metadata?.targets as string[] | undefined);
  const constraints = extractConstraints(body, ticket.metadata || {});
  const risks = extractRisks(body, ticket.labels || []);
  const raci = extractRaci(ticket.metadata?.raci);
  const sla = extractSla(ticket.metadata?.due, body);

  return { goal, nonGoals, targets, constraints, risks, raci, sla };
}

function extractGoal(body: string, title: string): string {
  const goalMatch = body.match(/goal:?\s*(.+)/i);
  if (goalMatch) return goalMatch[1].trim();
  const objectiveMatch = body.match(/(?:objective|fix):?\s*(.+)/i);
  if (objectiveMatch) return objectiveMatch[1].trim();
  return title.trim();
}

function extractNonGoals(body: string): string[] {
  const section = body.match(/non-?goals?:([\s\S]+?)(?:\n\n|$)/i);
  if (!section) return [];
  return section[1]
    .split(/\n|\*/)
    .map((line) => line.trim().replace(/^[-•]\s*/, ""))
    .filter((line) => line.length > 0);
}

function extractTargets(body: string, metadataTargets?: string[]): BuildTargetRef[] {
  const refs = new Map<string, BuildTargetRef>();
  const targetLines = [
    ...(metadataTargets || []),
    ...body.split(/\n/).filter((line) => /repo|module|job|target/i.test(line)),
  ];
  for (const line of targetLines) {
    const repoMatch = line.match(/repo[:=]\s*([\w\/.-]+)/i);
    const moduleMatch = line.match(/module[:=]\s*([\w\/.-]+)/i);
    const pathMatch = line.match(/path[:=]\s*([\w\/.-]+)/i);
    const jobMatch = line.match(/job[:=]\s*([\w]+)/i);
    const repo = repoMatch?.[1] || metadataTargets?.[0] || "";
    if (!repo) continue;
    const key = `${repo}:${moduleMatch?.[1] || ""}:${pathMatch?.[1] || ""}`;
    refs.set(key, {
      repo,
      module: moduleMatch?.[1],
      path: pathMatch?.[1],
      job: normalizeJob(jobMatch?.[1] || inferFacet(line)),
    });
  }
  if (refs.size === 0 && metadataTargets?.length) {
    refs.set(metadataTargets[0], { repo: metadataTargets[0] });
  }
  return [...refs.values()];
}

function normalizeJob(job?: string): BuildTargetRef["job"] {
  if (!job) return undefined;
  const normalized = job.toLowerCase();
  return BUILD_FACET_KEYWORDS[normalized];
}

function inferFacet(line: string): BuildTargetRef["job"] | undefined {
  const tokens = line.toLowerCase().split(/[^a-z]/);
  for (const token of tokens) {
    if (BUILD_FACET_KEYWORDS[token]) return BUILD_FACET_KEYWORDS[token];
  }
  return undefined;
}

function extractConstraints(body: string, metadata: Record<string, unknown>): ConstraintSet {
  const constraints: ConstraintSet = {};
  const latency = body.match(/p95[^\d]*(\d{2,5})\s*(ms|s)/i);
  if (latency) {
    const numeric = Number(latency[1]);
    constraints.latencyP95Ms = latency[2].toLowerCase() === "s" ? numeric * 1000 : numeric;
  }
  const budget = body.match(/\$(\d+(?:\.\d+)?)/);
  if (budget) constraints.budgetUSD = Number(budget[1]);
  const context = body.match(/context\s*limit[:=]?\s*(\d{3,6})/i);
  if (context) constraints.contextTokensMax = Number(context[1]);
  const cache = body.match(/cache\s*(prefer|force|disable)/i);
  if (cache) constraints.cache = cache[1].toLowerCase() as ConstraintSet["cache"];
  if (metadata.dataSensitivity && typeof metadata.dataSensitivity === "string") {
    constraints.dataSensitivity = metadata.dataSensitivity as ConstraintSet["dataSensitivity"];
  } else if (/pii|secret/i.test(body)) {
    constraints.dataSensitivity = "high";
  }
  return constraints;
}

function extractRisks(body: string, labels: string[]): string[] {
  const risks = new Set<string>();
  const riskSection = body.match(/risks?:([\s\S]+?)(?:\n\n|$)/i);
  if (riskSection) {
    for (const line of riskSection[1].split(/\n|\*/)) {
      const trimmed = line.trim().replace(/^[-•]\s*/, "");
      if (trimmed) risks.add(trimmed);
    }
  }
  for (const label of labels) {
    if (/risk/i.test(label)) risks.add(label);
  }
  if (/cache invalid/i.test(body)) risks.add("cache invalidation");
  if (/regression/i.test(body)) risks.add("regression");
  return [...risks];
}

function extractRaci(raw: unknown): { owner: string; reviewers: string[] } {
  if (raw && typeof raw === "object") {
    const owner = (raw as any).owner || "unknown";
    const reviewers = Array.isArray((raw as any).reviewers) ? (raw as any).reviewers : ["build-lead"];
    return { owner, reviewers };
  }
  return { owner: "build-system", reviewers: ["SRE", "Security", "Compliance", "DevEx"] };
}

function extractSla(metadataDue: unknown, body: string): { due: string } | undefined {
  if (typeof metadataDue === "string") return { due: metadataDue };
  const dueMatch = body.match(/due[:=]\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z?)/i);
  if (dueMatch) return { due: dueMatch[1] };
  return undefined;
}
