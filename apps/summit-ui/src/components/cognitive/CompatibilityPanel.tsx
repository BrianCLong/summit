import React from "react";
import type { CompatibilityBreakdown } from "../../types/cultural";

export function CompatibilityPanel({ data }: { data: CompatibilityBreakdown | null }) {
  if (!data) {
    return <div className="rounded-2xl border p-4">Select a region/population.</div>;
  }

  const rows = [
    ["Value alignment", data.valueAlignment],
    ["Linguistic authenticity", data.linguisticAuthenticity],
    ["Historical resonance", data.historicalResonance],
    ["Economic relevance", data.economicRelevance],
    ["Media channel fit", data.mediaChannelFit],
    ["Identity congruence", data.identityCongruence],
    ["Final score", data.finalScore]
  ];

  return (
    <div className="rounded-2xl border p-4 space-y-3">
      <div className="text-lg font-semibold">Cultural Compatibility</div>
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{label}</span>
              <span>{Number(value).toFixed(2)}</span>
            </div>
            <div className="h-2 rounded bg-muted">
              <div
                className="h-2 rounded bg-foreground"
                style={{ width: `${Math.max(0, Math.min(100, Number(value) * 100))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div>
        <div className="font-medium text-sm mb-1">Explanation</div>
        <ul className="text-sm list-disc ml-5 space-y-1">
          {data.explanation.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
