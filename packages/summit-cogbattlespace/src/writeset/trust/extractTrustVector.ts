import type { ProvenanceStrength, SourceTrustTier, TrustVector } from "./types";

function normalizeTier(value: unknown): SourceTrustTier {
  const s = String(value ?? "").toUpperCase();
  if (s === "UNTRUSTED") return "UNTRUSTED";
  if (s === "LOW") return "LOW";
  if (s === "MEDIUM") return "MEDIUM";
  if (s === "HIGH") return "HIGH";
  if (s === "VERIFIED") return "VERIFIED";
  return "LOW";
}

function normalizeProv(value: unknown): ProvenanceStrength {
  const s = String(value ?? "").toUpperCase();
  if (s === "WEAK") return "WEAK";
  if (s === "MODERATE") return "MODERATE";
  if (s === "STRONG") return "STRONG";
  if (s === "ATTESTED") return "ATTESTED";
  return "WEAK";
}

export function extractTrustVector(payload: Record<string, unknown>): TrustVector {
  const provenance = (payload.provenance ?? {}) as Record<string, unknown>;
  const metrics = (payload.metrics ?? {}) as Record<string, unknown>;

  const confidenceScore =
    typeof payload.confidence === "number"
      ? Number(payload.confidence)
      : typeof metrics.confidence === "number"
      ? Number(metrics.confidence)
      : 0.5;

  const evidenceRefs = Array.isArray(payload.evidenceRefs) ? payload.evidenceRefs : [];
  const evidenceArtifacts = Array.isArray(provenance.evidenceArtifacts) ? provenance.evidenceArtifacts : [];
  const derivedFromArtifacts = Array.isArray(provenance.derivedFromArtifacts)
    ? provenance.derivedFromArtifacts
    : [];

  const evidenceCount = Math.max(
    evidenceRefs.length,
    evidenceArtifacts.length,
    derivedFromArtifacts.length
  );

  const attested =
    Boolean(provenance.attested) ||
    normalizeProv(provenance.provenanceStrength) === "ATTESTED";

  return {
    collector: typeof provenance.collector === "string" ? provenance.collector : undefined,
    sourceTrustTier: normalizeTier(provenance.sourceTrustTier),
    provenanceStrength: normalizeProv(provenance.provenanceStrength),
    confidenceScore: Math.max(0, Math.min(1, confidenceScore)),
    evidenceCount,
    attested
  };
}
