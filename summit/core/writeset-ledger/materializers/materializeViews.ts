export type GraphTarget = "RG" | "BG" | "NG" | "TG" | "PG";
export type ClaimStatus =
  | "candidate"
  | "supported"
  | "contested"
  | "validated"
  | "rejected";

export interface NodeRef {
  kind:
    | "entity"
    | "claim"
    | "event"
    | "document"
    | "narrative"
    | "belief"
    | "goal"
    | "strategy"
    | "action";
  id: string;
}

export interface LiteralValue {
  type: "string" | "number" | "boolean" | "json";
  value: unknown;
}

export interface Claim {
  claim_id: string;
  subject: NodeRef;
  predicate: string;
  object?: NodeRef | LiteralValue;
  valid_time_start?: string;
  valid_time_end?: string;
  record_time: string;
  confidence: number;
  uncertainty: number;
  status: ClaimStatus;
  supports?: string[];
  contradicts?: string[];
  supersedes?: string[];
  graph_target?: GraphTarget;
  tags?: string[];
  provenance_refs: string[];
}

export interface ProvenanceRef {
  provenance_id: string;
  source_type:
    | "pdf"
    | "web"
    | "tweet"
    | "video"
    | "audio"
    | "sensor"
    | "report"
    | "chat"
    | "manual"
    | "derived";
  source_uri: string;
  content_hash: string;
}

export interface WriteSet {
  writeset_id: string;
  batch_signature?: string;
  record_time: string;
  writer: {
    actor_id: string;
    type: "human" | "agent" | "extractor" | "model";
    version: string;
  };
  claims: Claim[];
  provenance: ProvenanceRef[];
}

export interface MaterializedEdge {
  edge_id: string;
  claim_id: string;
  subject: NodeRef;
  predicate: string;
  object?: NodeRef | LiteralValue;
  record_time: string;
  valid_time_start?: string;
  valid_time_end?: string;
  confidence: number;
  uncertainty: number;
  provenance_refs: string[];
  status: ClaimStatus;
}

export interface MaterializedView {
  target: GraphTarget;
  edges: MaterializedEdge[];
}

export interface MaterializedViews {
  RG: MaterializedView;
  BG: MaterializedView;
  NG: MaterializedView;
  TG: MaterializedView;
  PG: MaterializedView;
  contradictions: Array<{ claim_id: string; contradicts: string[] }>;
  supersession: Array<{ claim_id: string; supersedes: string[] }>;
}

export interface MaterializeOptions {
  asOfRecordTime?: string;
  includeStatuses?: ClaimStatus[];
  excludeRejected?: boolean;
}

/**
 * Deterministic materialization entry point.
 * Rules:
 * 1. Append-only claims in, no mutation.
 * 2. Filter by asOfRecordTime if provided.
 * 3. Exclude rejected by default.
 * 4. If claim supersedes another, both remain in ledger, but downstream consumers can prefer latest non-rejected claim.
 */
export function materializeViews(
  writesets: WriteSet[],
  options: MaterializeOptions = {},
): MaterializedViews {
  const includeStatuses = new Set(
    options.includeStatuses ?? ["candidate", "supported", "contested", "validated"],
  );

  const allClaims = writesets
    .filter((ws) => !options.asOfRecordTime || ws.record_time <= options.asOfRecordTime)
    .flatMap((ws) => ws.claims)
    .filter((claim) => !options.asOfRecordTime || claim.record_time <= options.asOfRecordTime)
    .filter((claim) => includeStatuses.has(claim.status))
    .filter((claim) => !(options.excludeRejected ?? true) || claim.status !== "rejected");

  const views: MaterializedViews = {
    RG: { target: "RG", edges: [] },
    BG: { target: "BG", edges: [] },
    NG: { target: "NG", edges: [] },
    TG: { target: "TG", edges: [] },
    PG: { target: "PG", edges: [] },
    contradictions: [],
    supersession: [],
  };

  for (const claim of allClaims) {
    const target = claim.graph_target ?? inferGraphTarget(claim);
    const edge: MaterializedEdge = {
      edge_id: `${target}:${claim.claim_id}`,
      claim_id: claim.claim_id,
      subject: claim.subject,
      predicate: claim.predicate,
      object: claim.object,
      record_time: claim.record_time,
      valid_time_start: claim.valid_time_start,
      valid_time_end: claim.valid_time_end,
      confidence: claim.confidence,
      uncertainty: claim.uncertainty,
      provenance_refs: claim.provenance_refs,
      status: claim.status,
    };

    views[target].edges.push(edge);

    if (claim.contradicts?.length) {
      views.contradictions.push({
        claim_id: claim.claim_id,
        contradicts: [...claim.contradicts],
      });
    }

    if (claim.supersedes?.length) {
      views.supersession.push({
        claim_id: claim.claim_id,
        supersedes: [...claim.supersedes],
      });
    }
  }

  for (const key of ["RG", "BG", "NG", "TG", "PG"] as const) {
    views[key].edges.sort((a, b) => {
      if (a.record_time !== b.record_time) return a.record_time.localeCompare(b.record_time);
      return a.claim_id.localeCompare(b.claim_id);
    });
  }

  return views;
}

export function inferGraphTarget(claim: Claim): GraphTarget {
  const p = claim.predicate.toLowerCase();

  if (p.includes("believes") || p.includes("assesses") || p.includes("expects")) return "BG";
  if (p.includes("narrates") || p.includes("frames") || p.includes("amplifies")) return "NG";
  if (p.includes("seeks") || p.includes("wants") || p.includes("intends")) return "TG";
  if (p.includes("uses_strategy") || p.includes("takes_action") || p.includes("executes")) return "PG";
  return "RG";
}

/**
 * Return the best-known active claim in a supersession chain as of a time.
 * Very small starter implementation; later replace with chain-aware materializer.
 */
export function resolveActiveClaims(
  claims: Claim[],
  asOfRecordTime?: string,
): Map<string, Claim> {
  const eligible = claims
    .filter((c) => !asOfRecordTime || c.record_time <= asOfRecordTime)
    .sort((a, b) => a.record_time.localeCompare(b.record_time));

  const superseded = new Set<string>();
  for (const claim of eligible) {
    for (const prev of claim.supersedes ?? []) superseded.add(prev);
  }

  const active = new Map<string, Claim>();
  for (const claim of eligible) {
    if (!superseded.has(claim.claim_id) && claim.status !== "rejected") {
      active.set(claim.claim_id, claim);
    }
  }
  return active;
}

/**
 * Rejection / explainability helper.
 */
export function explainClaimLineage(
  claimId: string,
  claims: Claim[],
): {
  claim?: Claim;
  supportedBy: Claim[];
  contradictedBy: Claim[];
  supersededBy: Claim[];
} {
  const target = claims.find((c) => c.claim_id === claimId);
  if (!target) return { claim: undefined, supportedBy: [], contradictedBy: [], supersededBy: [] };

  const supportedBy = claims.filter((c) => (c.supports ?? []).includes(claimId));
  const contradictedBy = claims.filter((c) => (c.contradicts ?? []).includes(claimId));
  const supersededBy = claims.filter((c) => (c.supersedes ?? []).includes(claimId));

  return { claim: target, supportedBy, contradictedBy, supersededBy };
}
