// Public API of @intelgraph/summit-epistemics

// WriteSet types and entry point
export type {
  UUID,
  GraphDomain,
  ArtifactRef,
  WriteOp,
  WriteSetEnvelope,
  RejectionReport,
  QuarantineReport,
  AllowReport,
  WriteDecision,
} from "./writeset/types.js";
export { writeArtifacts } from "./writeset/writeArtifacts.js";

// Quarantine store
export type { QuarantineCase, QuarantineDisposition } from "./epistemics/quarantine/types.js";
export type { QuarantineStore } from "./epistemics/quarantine/quarantineStore.js";
export { MemoryQuarantineStore } from "./epistemics/quarantine/quarantineStore.js";

// Sentinel config + signal types
export type { Signal, SignalCode, SentinelConfig } from "./epistemics/sentinels/signals.js";
export { runSentinels } from "./epistemics/sentinels/index.js";

// Immune engine
export type { ImmuneDecision } from "./epistemics/immune/types.js";
export type { ImmuneEngineDeps } from "./epistemics/immune/immuneEngine.js";
export { runImmuneEngine } from "./epistemics/immune/immuneEngine.js";
export { immuneGate } from "./epistemics/immune/immuneGate.js";
