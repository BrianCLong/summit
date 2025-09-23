import { createHash } from "crypto";
import { ensureTaskSpec, ensureTicket, BuildTicket, BuildTaskSpec, NormalizedTicket, computeTaskSpecHash } from "./schema";
import { extractIntent } from "./intent";
import { synthesizeAcceptanceCriteria } from "./acceptance";
import { derivePolicy, PolicyContext } from "./policy";
import { recordProvenance, hashObject } from "../provenance/ledger";

export interface RawTicketInput extends Partial<BuildTicket> {
  ticketId: string;
  tenantId: string;
  title: string;
  body: string;
  reportedAt: string;
}

export interface NormalizeTicketOptions {
  knownDigests?: Set<string>;
  policy?: PolicyContext;
  defaultOwner?: string;
  entityResolver?: (hint: { repo?: string; module?: string }) => Promise<{ repo: string; module?: string } | null>;
  clock?: () => Date;
}

export interface NormalizationMetadata {
  clarifyingQuestions: string[];
  detectedLanguage: string;
  ambiguityScore: number;
}

export async function normalizeTicket(
  raw: RawTicketInput,
  opts: NormalizeTicketOptions = {}
): Promise<NormalizedTicket> {
  const ticket = ensureTicket({
    ticketId: raw.ticketId,
    tenantId: raw.tenantId,
    title: raw.title.trim(),
    body: raw.body.trim(),
    reportedAt: raw.reportedAt,
    artifacts: raw.artifacts || [],
    priority: raw.priority,
    source: raw.source,
    labels: raw.labels || [],
    metadata: raw.metadata || {},
  });

  const digest = hashTicket(ticket);
  if (opts.knownDigests?.has(digest)) {
    throw new Error("duplicate-ticket");
  }
  opts.knownDigests?.add(digest);

  const language = detectLanguage(ticket.body);
  const intent = extractIntent(ticket);
  if (!intent.targets.length && opts.entityResolver) {
    const fallback = await opts.entityResolver({ repo: ticket.metadata?.repo as string, module: ticket.metadata?.module as string });
    if (fallback) {
      intent.targets.push({ repo: fallback.repo, module: fallback.module });
    }
  }

  const acceptance = synthesizeAcceptanceCriteria(ticket, { existing: ticket.metadata?.acceptance as any });
  const policy = derivePolicy(ticket, opts.policy);
  const clarifyingQuestions = buildClarifyingQuestions(ticket, intent.targets.length, acceptance.length);

  const baseSpec: BuildTaskSpec = {
    taskId: `task:${ticket.ticketId}`,
    tenantId: ticket.tenantId,
    title: ticket.title,
    goal: intent.goal,
    nonGoals: intent.nonGoals,
    targets: intent.targets,
    inputs: ticket.artifacts || [],
    constraints: intent.constraints,
    policy,
    acceptanceCriteria: acceptance,
    risks: intent.risks,
    raci: intent.raci,
    sla: intent.sla,
    clarifyingQuestions: clarifyingQuestions.length ? clarifyingQuestions : undefined,
    language,
    provenanceHash: "",
  };

  const spec = ensureTaskSpec({ ...baseSpec, provenanceHash: computeTaskSpecHash(baseSpec) });

  recordProvenance({
    reqId: spec.taskId,
    step: "normalizer",
    inputHash: digest,
    outputHash: spec.provenanceHash,
    policy: { retention: spec.policy.retention, purpose: spec.policy.purpose, licenseClass: spec.policy.licenseClass },
    time: {
      start: opts.clock?.().toISOString() || new Date().toISOString(),
      end: new Date().toISOString(),
    },
    tags: ["ticket", "normalize"],
  });

  return {
    digest,
    language,
    ticket,
    spec,
    clarifyingQuestions,
  };
}

export function detectLanguage(text: string): string {
  const ascii = text.match(/[\x00-\x7F]/g)?.length ?? 0;
  const nonAscii = text.length - ascii;
  if (!text.trim()) return "en";
  if (nonAscii > ascii * 0.3) return "multi";
  if (/\b(?:el|la|que|para)\b/i.test(text)) return "es";
  return "en";
}

function hashTicket(ticket: BuildTicket): string {
  const h = createHash("sha256");
  h.update(ticket.ticketId);
  h.update(ticket.title);
  h.update(ticket.body);
  h.update(ticket.tenantId);
  return `sha256:${h.digest("hex")}`;
}

function buildClarifyingQuestions(ticket: BuildTicket, targetCount: number, acCount: number): string[] {
  const questions: string[] = [];
  if (!targetCount) {
    questions.push("Which repository/module/job should Maestro scope for this task?");
  }
  if (!acCount) {
    questions.push("Provide verifiable acceptance criteria (latency, flake rate, CVE thresholds).");
  }
  if (!ticket.artifacts?.length) {
    questions.push("Can you attach failing logs, SARIF, or junit results to accelerate triage?");
  }
  return questions;
}
