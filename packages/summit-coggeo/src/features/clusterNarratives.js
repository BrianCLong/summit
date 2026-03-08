"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clusterNarratives = clusterNarratives;
function clusterNarratives(signals) {
    return signals
        .filter((signal) => signal.kind === "narrative")
        .map((signal) => ({
        id: signal.id,
        label: String(signal.payload.label ?? "unlabeled narrative"),
        evidence_refs: [signal.obs_id],
    }));
}
