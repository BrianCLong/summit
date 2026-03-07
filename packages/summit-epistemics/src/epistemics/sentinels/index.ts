import type { SentinelConfig, Signal } from "./signals.js";
import type { WriteSetEnvelope } from "../../writeset/types.js";
import { burstDetector } from "./detectors/burstDetector.js";
import { provenanceDetector } from "./detectors/provenanceDetector.js";
import { coordinationDetector } from "./detectors/coordinationDetector.js";

/**
 * Runs all registered sentinel detectors against a WriteSetEnvelope and returns
 * the union of fired signals. Each detector is independent; order does not matter.
 */
export function runSentinels(ws: WriteSetEnvelope, cfg: SentinelConfig): Signal[] {
  const out: Signal[] = [];

  const s1 = burstDetector(ws, cfg);
  if (s1) out.push(s1);

  const s2 = provenanceDetector(ws, cfg);
  if (s2) out.push(s2);

  const s3 = coordinationDetector(ws);
  if (s3) out.push(s3);

  return out;
}
