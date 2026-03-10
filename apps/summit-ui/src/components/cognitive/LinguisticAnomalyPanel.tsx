import React from "react";
import type { LinguisticFingerprint } from "../../types/cultural";

export function LinguisticAnomalyPanel({ data }: { data: LinguisticFingerprint | null }) {
  if (!data) {
    return <div className="rounded-2xl border p-4">No linguistic anomaly loaded.</div>;
  }

  return (
    <div className="rounded-2xl border p-4 space-y-3">
      <div className="text-lg font-semibold">Linguistic Anomaly Detection</div>
      <div className="text-sm">
        Expected: <strong>{data.expectedLanguage}</strong> | Detected: <strong>{data.detectedLanguage}</strong>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>Dialect fit: {data.dialectFitScore.toFixed(2)}</div>
        <div>Idiom fit: {data.idiomFitScore.toFixed(2)}</div>
        <div>Syntax naturalness: {data.syntaxNaturalnessScore.toFixed(2)}</div>
        <div>Translation artifacts: {data.translationArtifactScore.toFixed(2)}</div>
        <div>Propaganda phrase score: {data.propagandaPhraseScore.toFixed(2)}</div>
        <div>Anomaly score: {data.anomalyScore.toFixed(2)}</div>
      </div>

      <div>
        <div className="font-medium text-sm mb-1">Flags</div>
        <ul className="text-sm list-disc ml-5 space-y-1">
          {data.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
