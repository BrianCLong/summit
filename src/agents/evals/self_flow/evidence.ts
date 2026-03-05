import fs from "fs";
import path from "path";

export function writeEvidencePack(evidenceId: string, traj: any, score: number) {
  const dir = path.join(process.cwd(), "evidence", evidenceId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "report.json"), JSON.stringify({ score, valid: true }));
  fs.writeFileSync(path.join(dir, "metrics.json"), JSON.stringify({ accuracy: score }));
  fs.writeFileSync(path.join(dir, "artifacts.stamp.json"), JSON.stringify({ id: evidenceId }));
}
