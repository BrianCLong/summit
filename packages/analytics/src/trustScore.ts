export type TrustSignal = {
  kind: string;
  value: number;
  weight?: number;
  provenance?: string[];
};

export type TrustScoreResult = {
  score: number;
  breakdown: Array<{ kind: string; weighted: number; provenance?: string[] }>;
  rationale: string;
};

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function computeTrustScore(signals: TrustSignal[]): TrustScoreResult {
  const cleaned = (signals || [])
    .filter((s) => s && typeof s.kind === "string")
    .map((s) => ({
      kind: s.kind.trim(),
      value: clamp01(s.value),
      weight: clamp01(s.weight ?? 1),
      provenance: s.provenance?.slice(0, 50),
    }))
    .filter((s) => s.kind.length > 0);

  const weightsum = cleaned.reduce((a, s) => a + s.weight, 0);
  const denom = weightsum > 0 ? weightsum : 1;

  const breakdown = cleaned.map((s) => ({
    kind: s.kind,
    weighted: (s.value * s.weight) / denom,
    provenance: s.provenance,
  }));

  const score = clamp01(breakdown.reduce((a, b) => a + b.weighted, 0));

  const top = [...breakdown].sort((a, b) => b.weighted - a.weighted).slice(0, 3);
  const rationale =
    top.length === 0
      ? "No trust signals provided."
      : `Top signals: ${top.map((t) => `${t.kind}=${t.weighted.toFixed(2)}`).join(", ")}.`;

  return { score, breakdown, rationale };
}
