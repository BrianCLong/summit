import type { WriteSetEnvelope, WriteDecision } from "./types.js";
import type { ImmuneEngineDeps } from "../epistemics/immune/immuneEngine.js";
import { runImmuneEngine } from "../epistemics/immune/immuneEngine.js";

/**
 * Primary WriteSet entry point.
 *
 * Pipeline:
 *   1. Schema validation (AJV shape check) — plug in your existing firewall here.
 *   2. Semantic validation (SV rules) — same.
 *   3. Epistemic Immune Engine — sentinel signals → allow / allow_with_flags / quarantine.
 *
 * On quarantine the write is NOT committed to RG/BG/NG.
 * The QuarantineCase is persisted in the quarantine store for review + challenge.
 *
 * On allow / allow_with_flags: commit ops to your graph store here (Neo4j / DuckDB).
 */
export async function writeArtifacts(
  ws: WriteSetEnvelope,
  deps: ImmuneEngineDeps
): Promise<WriteDecision> {
  // TODO(summit-team): wire AJV schema check → return { disposition: "reject", ... } on failure
  // TODO(summit-team): wire SV semantic rules → same

  return runImmuneEngine(ws, deps);
}
