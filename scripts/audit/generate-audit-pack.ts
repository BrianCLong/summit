import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execSync } from "child_process";
import yaml from "js-yaml";

interface EvidenceEntry {
  id: string;
  description: string;
  source: string;
  artifact_path: string;
  retention: string;
  integrity: string;
}

interface ControlEntry {
  id: string;
  objective: string;
  soc2: string[];
  iso: string[];
  ai_governance: string;
  enforcement: unknown;
  evidence: string[];
  frequency: string;
  owner: string;
}

const ROOT = path.resolve(__dirname, "..", "..");
const OUTPUT_BASE = path.join(ROOT, "audit-packs");
const CONTROL_MAP = path.join(ROOT, "audit", "control-map.yaml");
const EVIDENCE_REGISTRY = path.join(ROOT, "audit", "evidence-registry.yaml");
const EXCEPTIONS = path.join(ROOT, "audit", "exceptions.yaml");
const ADDITIONAL_DOCS = [
  path.join(ROOT, "docs", "audit", "CONTROL-MAP.md"),
  path.join(ROOT, "docs", "audit", "EVIDENCE.md"),
  path.join(ROOT, "docs", "audit", "EXCEPTIONS.md"),
  path.join(ROOT, "docs", "audit", "AGENT-GOVERNANCE.md"),
  path.join(ROOT, "docs", "audit", "AUDIT-QUERIES.md"),
];

function loadYaml<T>(file: string): T {
  const raw = fs.readFileSync(file, "utf-8");
  return yaml.load(raw) as T;
}

function sha256(file: string): string {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(file));
  return hash.digest("hex");
}

function timestampFolder(): string {
  const iso = new Date().toISOString().replace(/[-:]/g, "").split(".")[0];
  return path.join(OUTPUT_BASE, iso);
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyIfExists(source: string, targetDir: string, artifacts: any[]) {
  if (!fs.existsSync(source)) return;
  const target = path.join(targetDir, path.basename(source));
  fs.cpSync(source, target, { recursive: true });
  artifacts.push({
    source: path.relative(ROOT, source),
    target: path.relative(ROOT, target),
    hash: sha256(source),
  });
}

function gitHistory(limit = 25): string {
  try {
    return execSync(`git log -n ${limit} --pretty=format:%h|%ad|%an|%s --date=iso`, {
      cwd: ROOT,
    }).toString();
  } catch (error) {
    return "git log unavailable";
  }
}

function gatherEvidenceCopies(evidence: EvidenceEntry[], outputDir: string, artifacts: any[]) {
  evidence.forEach((entry) => {
    const candidate = path.join(ROOT, entry.artifact_path);
    if (fs.existsSync(candidate)) {
      const destination = path.join(outputDir, path.basename(candidate));
      fs.cpSync(candidate, destination, { recursive: true });
      const hash = fs.statSync(candidate).isFile() ? sha256(candidate) : "directory";
      artifacts.push({
        evidence_id: entry.id,
        source: path.relative(ROOT, candidate),
        target: path.relative(ROOT, destination),
        hash,
        integrity: entry.integrity,
      });
    }
  });
}

function main() {
  const outDir = timestampFolder();
  ensureDir(outDir);

  const controlMap = loadYaml<{ controls: ControlEntry[] }>(CONTROL_MAP);
  const evidenceRegistry = loadYaml<{ evidence: EvidenceEntry[] }>(EVIDENCE_REGISTRY);
  const exceptions = loadYaml<{ exceptions: any[] }>(EXCEPTIONS);

  const artifacts: any[] = [];
  [CONTROL_MAP, EVIDENCE_REGISTRY, EXCEPTIONS, ...ADDITIONAL_DOCS].forEach((file) =>
    copyIfExists(file, outDir, artifacts)
  );
  gatherEvidenceCopies(evidenceRegistry.evidence, outDir, artifacts);

  const manifest = {
    generatedAt: new Date().toISOString(),
    outputDir: path.relative(ROOT, outDir),
    controls: controlMap.controls,
    evidenceRegistry: evidenceRegistry.evidence,
    exceptions: exceptions.exceptions,
    changeHistory: gitHistory(30).split("\n"),
    artifacts,
  };

  fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`Audit pack generated at ${path.relative(ROOT, outDir)}`);
}

if (require.main === module) {
  main();
}
