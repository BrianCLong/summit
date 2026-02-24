import fs from "node:fs";
import path from "node:path";

const BASE_DIR = "summit";
const dir = path.join(BASE_DIR, "telemetry");
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f=>f.endsWith(".json")) : [];
if (files.length === 0) { console.error("No telemetry artifacts found."); process.exit(1); }

let fail = false;
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(dir,f)));
  if (j.decision !== "allow") { console.error(`Policy denied: ${f}`); fail = true; }
  if (j.duration_ms && j.duration_ms > 60000) { console.error(`Budget exceeded: ${f}`); fail = true; }
  for (const k of ["runId","agent","tool","start_ts","duration_ms","cpu_ms","mem_bytes","io_hash","decision"]) {
    if (!(k in j)) { console.error(`Missing ${k} in ${f}`); fail = true; }
  }
}
process.exit(fail ? 2 : 0);
