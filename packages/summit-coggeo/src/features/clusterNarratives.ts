import type { Narrative } from "../api/types";
import type { ExtractedSignal } from "../extract/extractSignals";

export function clusterNarratives(signals: ExtractedSignal[]): Narrative[] {
  return signals
    .filter((signal) => signal.kind === "narrative")
    .map((signal) => ({
      id: signal.id,
      label: String(signal.payload.label ?? "unlabeled narrative"),
      evidence_refs: [signal.obs_id],
    }));
}
