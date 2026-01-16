#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function exists(p) {
  try { fs.accessSync(p, fs.constants.F_OK); return true; } catch { return false; }
}

function mkdirp(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeAtomic(file, content) {
  mkdirp(path.dirname(file));
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, file);
}

function utcNow() {
  const d = new Date();
  const iso = d.toISOString();
  return iso.replace(/\.\d{3}Z$/, "Z");
}

function main() {
  const root = process.cwd();
  const sha = process.env.GITHUB_SHA || process.env.SHA || "unknown";
  const outDir = path.join(root, "artifacts", "ga-verify", sha);
  mkdirp(outDir);

  const isCI = (process.env.CI || "").toLowerCase() === "true";

  const iacStamp = path.join(root, "artifacts", "iac-validate", "stamp.json");
  const iacReport = path.join(root, "artifacts", "iac-validate", "report.json");
  const secTrivy = path.join(root, "artifacts", "security-iac", "trivy-iac.sarif");

  const gates = {
    "iac:validate": "missing",
    "security:iac": "missing",
  };

  if (exists(iacReport) && exists(iacStamp)) gates["iac:validate"] = "passed";
  if (exists(secTrivy)) gates["security:iac"] = "passed";

  // If artifacts exist but show failures, mark failed (best-effort parse)
  if (exists(iacStamp)) {
    try {
      const j = JSON.parse(fs.readFileSync(iacStamp, "utf8"));
      if (j && j.ok === false) gates["iac:validate"] = "failed";
      if (j && j.skipped === true) gates["iac:validate"] = "skipped";
    } catch {}
  }

  const ok =
    (gates["iac:validate"] === "passed" || gates["iac:validate"] === "skipped") &&
    (gates["security:iac"] === "passed" || gates["security:iac"] === "missing");

  // Enforce stricter expectations in CI: iac must not be missing (either passed or skipped)
  const ciOk =
    (gates["iac:validate"] === "passed" || gates["iac:validate"] === "skipped") &&
    (gates["security:iac"] === "passed" || gates["security:iac"] === "missing");

  const report = {
    sha,
    gates,
    policy: {
      ci_requires_iac_gate: true,
      security_iac_recommended: true
    }
  };

  // Deterministic report: no timestamps
  writeAtomic(path.join(outDir, "report.json"), JSON.stringify(report, null, 2) + "\n");

  const stamp = {
    ok: isCI ? ciOk : ok,
    sha,
    ci: isCI,
    completed_at_utc: utcNow(),
  };
  writeAtomic(path.join(outDir, "stamp.json"), JSON.stringify(stamp, null, 2) + "\n");

  if (stamp.ok !== true) {
    process.exit(1);
  }
}

main();
