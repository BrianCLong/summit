import React from "react";
import { LaneBadge } from "./LaneBadge";

type Claim = {
  text: string;
  strength: "CANONICAL" | "STRONG" | "PROVISIONAL" | "PRELIMINARY";
  citations: Array<{
    sourceId: string;
    lane: "CANDIDATE" | "OBSERVED" | "TRUSTED" | "PROMOTED";
    trustScore?: number;
    confidenceScore?: number;
  }>;
  refusal?: {
    shouldRefuseCanonicalTone: boolean;
    reason?: string;
  };
};

export function SynthesizedAnswerPanel(props: {
  summary: string;
  overallMode: "CANONICAL" | "CAUTIOUS" | "PRELIMINARY";
  claims: Claim[];
}) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Lane-Aware Answer</h3>
        <div className="text-xs px-2 py-1 rounded-xl border">{props.overallMode}</div>
      </div>

      <div className="mt-2 text-sm opacity-80">{props.summary}</div>

      <div className="mt-4 grid gap-3">
        {props.claims.map((claim, idx) => (
          <div key={idx} className="p-3 rounded-xl border">
            <div className="text-sm">{claim.text}</div>

            <div className="mt-2 flex gap-2 flex-wrap">
              {claim.citations.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <LaneBadge lane={c.lane} />
                  <span>{c.sourceId}</span>
                  {c.trustScore != null ? <span className="opacity-70">trust={c.trustScore.toFixed(2)}</span> : null}
                </div>
              ))}
            </div>

            {claim.refusal?.shouldRefuseCanonicalTone ? (
              <div className="mt-2 text-xs opacity-70">
                Canonical-tone refusal: {claim.refusal.reason}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
