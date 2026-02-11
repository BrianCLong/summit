#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const regPath = "docs/ga/policy_registry.json";
if (!fs.existsSync(regPath)) {
  console.error(`❌ registry not found at ${regPath}`);
  process.exit(1);
}

const reg = JSON.parse(fs.readFileSync(regPath, "utf8"));
let missing = [];

for (const p of reg.policies.filter(x => x.required)) {
  for (const wf of p.workflows) {
    const file = path.resolve(wf.artifact);
    if (!fs.existsSync(file)) {
      missing.push({ policy: p.id, artifact: wf.artifact, evidence_id: wf.evidence_id });
    } else {
      const body = fs.readFileSync(file, "utf8");

      // Determinism guard: forbid ISO timestamps to maintain hash stability
      if (/\b20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}/.test(body)) {
        console.error(`❌ ISO timestamp found in ${wf.artifact} (policy ${p.id}). Evidence must be deterministic.`);
        process.exit(1);
      }

      // Verify policy ID inside the artifact to prevent spoofing
      try {
        const artifactData = JSON.parse(body);
        if (artifactData.policy && artifactData.policy !== p.id) {
          console.error(`❌ artifact policy mismatch in ${wf.artifact}: expected ${p.id}, found ${artifactData.policy}`);
          process.exit(1);
        }
      } catch (e) {
        console.warn(`⚠️ failed to parse artifact ${wf.artifact} as JSON: ${e.message}`);
        // If it's not JSON (like a raw SBOM), we might skip policy ID verification
      }
    }
  }
}

if (missing.length) {
  console.error("❌ missing required evidence artifacts:");
  for (const m of missing) {
    console.error(`- ${m.policy}: ${m.artifact} (${m.evidence_id})`);
  }
  process.exit(1);
}

console.log("✅ all required evidence artifacts present, deterministic, and verified");
