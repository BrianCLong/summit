import type { WriteSetEnvelope, WriteDecision } from "./types";
import type { ImmuneEngineDeps } from "../epistemics/immune/immuneEngine";
import { runImmuneEngine } from "../epistemics/immune/immuneEngine";

// TODO: plug in your actual AJV + SV firewall. For now we assume "valid shape".
// If you already have firewall output types, call them first and return {disposition:"reject", ...} when needed.
export async function writeArtifacts(ws: WriteSetEnvelope, deps: ImmuneEngineDeps): Promise<WriteDecision> {
  // 1) AJV schema validate (shape)
  // 2) SV validate (semantic rules)
  // 3) If pass, run immune engine to decide allow/quarantine
  const immuneDecision = await runImmuneEngine(ws, deps);

  if (immuneDecision.disposition === "quarantine") {
    // IMPORTANT: do NOT write to RG/BG/NG. The quarantine store already captured it.
    return immuneDecision;
  }

  // If allow: commit ops to stores here (Neo4j/DuckDB/etc).
  // For demo we just return allow/allow_with_flags.
  return immuneDecision;
}
