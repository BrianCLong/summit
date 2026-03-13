import type { SentinelConfig, Signal } from "./signals";
import type { WriteSetEnvelope } from "../../writeset/types";
import { burstDetector } from "./detectors/burstDetector";
import { provenanceDetector } from "./detectors/provenanceDetector";
import { coordinationDetector } from "./detectors/coordinationDetector";

export function runSentinels(ws: WriteSetEnvelope, cfg: SentinelConfig): Signal[] {
  const out: Signal[] = [];
  const s1 = burstDetector(ws, cfg); if (s1) out.push(s1);
  const s2 = provenanceDetector(ws, cfg); if (s2) out.push(s2);
  const s3 = coordinationDetector(ws); if (s3) out.push(s3);

  // Optional: schema evasion attempt detector could be wired to firewall output.
  return out;
}
