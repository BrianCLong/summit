import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

export function writeEvidence(evid: string, report: unknown, metrics: unknown, stamp: Record<string, unknown>) {
  const dir = path.join("artifacts", evid);
  fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(path.join(dir, "report.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(dir, "metrics.json"), JSON.stringify(metrics, null, 2));

  const stampWithHash = {
    ...stamp,
    evidence_id: evid,
    report_sha256: sha256(JSON.stringify(report)),
    metrics_sha256: sha256(JSON.stringify(metrics)),
  };
  fs.writeFileSync(path.join(dir, "stamp.json"), JSON.stringify(stampWithHash, null, 2));
}

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}
