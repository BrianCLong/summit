import { execSync } from "node:child_process";
import * as fs from "node:fs";

function parseVer(v: string): [number, number, number] | null {
  const m = v.trim().match(/(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return m.slice(1).map(Number) as [number, number, number];
}

function cmp(a: [number, number, number], b: [number, number, number]): number {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

function inRange(v: [number, number, number], lo: [number, number, number], hi: [number, number, number]): boolean {
  return cmp(v, lo) >= 0 && cmp(v, hi) < 0;
}

function main() {
  let raw = "";
  try {
    try {
        // 2>/dev/null to avoid noise, but node ignores it if stdio is piped
        raw = execSync("melange version", { encoding: "utf8", stdio: ['ignore', 'pipe', 'ignore'] });
    } catch (e) {
        const evidence = {
            cve: "CVE-2026-25145",
            evidenceId: "EVID:melange-version",
            note: "Tool not present in environment",
            tool: "melange",
            version: "not-found",
            vulnerable: false
        };
        const json = JSON.stringify(evidence, Object.keys(evidence).sort(), 2);
        console.log(json);
        if (process.env.GATE_OUTPUT) {
            fs.writeFileSync(process.env.GATE_OUTPUT, json);
        }
        return;
    }

    const v = parseVer(raw);
    if (!v) {
        const evidence = {
             cve: "CVE-2026-25145",
             evidenceId: "EVID:melange-version",
             raw_output: raw.trim(),
             tool: "melange",
             version: "unknown",
             vulnerable: true
        };
        const json = JSON.stringify(evidence, Object.keys(evidence).sort(), 2);
        console.log(json);
        if (process.env.GATE_OUTPUT) {
            fs.writeFileSync(process.env.GATE_OUTPUT, json);
        }
        console.error(`Could not parse melange version: ${raw}`);
        process.exit(1);
    }

    const vulnerable = inRange(v, [0, 14, 0], [0, 40, 3]);
    const out = {
      cve: "CVE-2026-25145",
      evidenceId: "EVID:melange-version",
      requiredMin: "0.40.3",
      tool: "melange",
      version: v.join("."),
      vulnerable: vulnerable
    };

    const json = JSON.stringify(out, Object.keys(out).sort(), 2);
    console.log(json);
    if (process.env.GATE_OUTPUT) {
        fs.writeFileSync(process.env.GATE_OUTPUT, json);
    }

    if (vulnerable) {
      console.error(`Blocked: melange ${out.version} vulnerable to ${out.cve}; upgrade to >= ${out.requiredMin}`);
      process.exit(2);
    }

  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
