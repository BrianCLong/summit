import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import os from "node:os";

// ============================================================================
// Configuration
// ============================================================================

const ARTIFACTS_TO_COLLECT = [
  "SECURITY.md",
  "docs/compliance",
  "docs/risk",
  "docs/ops",
  "invariants",
  "policy",
  "policies", // Include both policy dirs just in case
  "CODEOWNERS",
  ".github/dependabot.yml",
];

const SECRET_PATTERNS = [
  /ghp_[a-zA-Z0-9]{36}/g,
  /sk_live_[0-9a-zA-Z]{24}/g,
  /xoxb-[0-9]{11}-[0-9]{11}-[0-9a-zA-Z]{24}/g,
  /ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, // JWT-like
];

// ============================================================================
// Types
// ============================================================================

type Mode = "live" | "offline";

interface EvidencePackConfig {
  mode: Mode;
  fixturesDir?: string;
  outputDirBase: string;
}

interface FileHash {
  path: string;
  sha256: string;
}

// ============================================================================
// Helpers
// ============================================================================

function getTimestamp(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${mm}${ss}`;
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function computeSha256(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash("sha256");
  hashSum.update(fileBuffer);
  return hashSum.digest("hex");
}

function redact(text: string): string {
  let redacted = text;
  for (const pattern of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, "[REDACTED]");
  }
  return redacted;
}

function copyRecursive(src: string, dest: string, filesCollected: FileHash[]) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    ensureDir(dest);
    const files = fs.readdirSync(src).sort(); // Deterministic order
    for (const file of files) {
      copyRecursive(path.join(src, file), path.join(dest, file), filesCollected);
    }
  } else {
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
    filesCollected.push({
      path: path.relative(process.cwd(), src), // Store relative path
      sha256: computeSha256(src),
    });
  }
}

// ============================================================================
// Main Logic
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const config: EvidencePackConfig = {
    mode: "live",
    outputDirBase: "evidence/security",
  };

  for (const arg of args) {
    if (arg.startsWith("--mode=")) {
      config.mode = arg.split("=")[1] as Mode;
    } else if (arg.startsWith("--fixturesDir=")) {
      config.fixturesDir = arg.split("=")[1];
    } else if (arg.startsWith("--outputDir=")) {
      config.outputDirBase = arg.split("=")[1];
    }
  }

  if (config.mode === "offline" && !config.fixturesDir) {
    console.error("Error: --fixturesDir is required in offline mode");
    process.exit(1);
  }

  const timestamp = getTimestamp();
  const packDir = path.join(config.outputDirBase, timestamp);
  const artifactsDir = path.join(packDir, "artifacts");
  const outputsDir = path.join(packDir, "outputs");

  console.log(`Starting Security Evidence Pack Generation (${config.mode})...`);
  console.log(`Output Directory: ${packDir}`);

  ensureDir(artifactsDir);
  ensureDir(outputsDir);

  const collectedFiles: FileHash[] = [];

  // 1. Collect Artifacts
  console.log("Phase 1: Collecting Artifacts...");
  if (config.mode === "live") {
    for (const artifactPath of ARTIFACTS_TO_COLLECT) {
      if (fs.existsSync(artifactPath)) {
        console.log(`  Found: ${artifactPath}`);
        // Preserve directory structure in artifactsDir
        const destPath = path.join(artifactsDir, artifactPath);
        copyRecursive(artifactPath, destPath, collectedFiles);
      } else {
        console.warn(`  Missing: ${artifactPath}`);
      }
    }
  } else {
    // Offline mode: copy from fixtures
    console.log(`  Using fixtures from: ${config.fixturesDir}`);
    // We assume fixturesDir mirrors the repo structure for artifacts
    const fixturesArtifacts = path.join(config.fixturesDir!, "artifacts");
    if (fs.existsSync(fixturesArtifacts)) {
      // Copy everything from fixtures/artifacts to artifactsDir
      // We need to walk the fixtures and reconstruct the relative paths as if they came from root
      const fixtureFiles = fs.readdirSync(fixturesArtifacts);
      for (const f of fixtureFiles) {
        const src = path.join(fixturesArtifacts, f);
        const dest = path.join(artifactsDir, f); // e.g. artifacts/SECURITY.md
        copyRecursive(src, dest, collectedFiles);
      }
    }
  }

  // 2. Run Verification Commands
  console.log("Phase 2: Running Verification Commands...");
  const commandOutputs: { command: string; stdout: string; stderr: string; exitCode: number }[] =
    [];

  if (config.mode === "live") {
    // Command 1: Baseline Check
    try {
      console.log("  Running: scripts/security/baseline-check.sh");
      const env = { ...process.env, REPORT_DIR: outputsDir };
      // Try to use bash directly
      const cmd = "bash scripts/security/baseline-check.sh";
      const output = execSync(cmd, { env, encoding: "utf-8", stdio: "pipe" });
      commandOutputs.push({ command: cmd, stdout: redact(output), stderr: "", exitCode: 0 });
    } catch (e: any) {
      console.warn("  Failed: scripts/security/baseline-check.sh");
      commandOutputs.push({
        command: "scripts/security/baseline-check.sh",
        stdout: redact(e.stdout?.toString() || ""),
        stderr: redact(e.stderr?.toString() || ""),
        exitCode: e.status || 1,
      });
    }

    // Command 2: Tenant Isolation Scan
    try {
      console.log("  Running: scripts/security/scan-tenant-isolation.ts");
      // Use npx tsx to run typescript file
      const cmd = "npx tsx scripts/security/scan-tenant-isolation.ts";
      const output = execSync(cmd, { encoding: "utf-8", stdio: "pipe" });
      commandOutputs.push({ command: cmd, stdout: redact(output), stderr: "", exitCode: 0 });

      // Copy the report if it was generated
      // The script writes to ../../reports/tenant-scan-static.json relative to itself
      // So it's reports/tenant-scan-static.json from root
      const reportSrc = "reports/tenant-scan-static.json";
      if (fs.existsSync(reportSrc)) {
        const reportDest = path.join(outputsDir, "tenant-scan-static.json");
        fs.copyFileSync(reportSrc, reportDest);
        console.log(`  Captured report: ${reportSrc}`);
      }
    } catch (e: any) {
      console.warn("  Failed: scripts/security/scan-tenant-isolation.ts");
      commandOutputs.push({
        command: "scripts/security/scan-tenant-isolation.ts",
        stdout: redact(e.stdout?.toString() || ""),
        stderr: redact(e.stderr?.toString() || ""),
        exitCode: e.status || 1,
      });
    }
  } else {
    // Offline: Copy fixture outputs
    console.log("  Using fixture outputs...");
    const fixturesOutputs = path.join(config.fixturesDir!, "outputs");
    if (fs.existsSync(fixturesOutputs)) {
      const files = fs.readdirSync(fixturesOutputs);
      for (const file of files) {
        fs.copyFileSync(path.join(fixturesOutputs, file), path.join(outputsDir, file));
        commandOutputs.push({
          command: `mock ${file}`,
          stdout: `[MOCK] Content of ${file}`,
          stderr: "",
          exitCode: 0,
        });
      }
    }
  }

  // 3. Generate Environment JSON
  const environment = {
    timestamp,
    mode: config.mode,
    nodeVersion: process.version,
    platform: os.platform(),
    arch: os.arch(),
    // Best effort git sha
    gitSha: "unknown",
  };

  try {
    environment.gitSha = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
  } catch (e) {
    // Ignore if no git
  }

  fs.writeFileSync(path.join(packDir, "environment.json"), JSON.stringify(environment, null, 2));

  // 4. Generate Index JSON
  // Sort collected files for determinism
  collectedFiles.sort((a, b) => a.path.localeCompare(b.path));

  const index = {
    meta: environment,
    artifacts: collectedFiles,
    commands: commandOutputs.map((c) => ({ command: c.command, exitCode: c.exitCode })),
  };

  fs.writeFileSync(path.join(packDir, "index.json"), JSON.stringify(index, null, 2));

  // 5. Generate INDEX.md (Human Readable)
  let md = `# Security Evidence Pack\n\n`;
  md += `**Timestamp**: ${timestamp}\n`;
  md += `**Mode**: ${config.mode}\n`;
  md += `**Commit**: ${environment.gitSha}\n\n`;

  md += `## 1. Collected Artifacts\n\n`;
  md += `| File | SHA256 |\n`;
  md += `|------|--------|\n`;
  for (const file of collectedFiles) {
    // In the table, show the path relative to the artifacts root (which mirrors repo root)
    // Actually, collectedFiles.path is relative to CWD (repo root).
    // When we copy to artifactsDir, we keep that structure.
    // So checking artifacts/SECURITY.md corresponds to SECURITY.md in repo.
    md += `| \`${file.path}\` | \`${file.sha256.substring(0, 12)}...\` |\n`;
  }

  md += `\n## 2. Verification Outputs\n\n`;
  for (const cmd of commandOutputs) {
    md += `### \`${cmd.command}\` (Exit: ${cmd.exitCode})\n`;
    if (cmd.stdout.trim()) {
      md += `**Stdout**:\n\`\`\`\n${cmd.stdout.trim().substring(0, 1000)}${cmd.stdout.length > 1000 ? "\n... (truncated)" : ""}\n\`\`\`\n`;
    }
    if (cmd.stderr.trim()) {
      md += `**Stderr**:\n\`\`\`\n${cmd.stderr.trim().substring(0, 1000)}${cmd.stderr.length > 1000 ? "\n... (truncated)" : ""}\n\`\`\`\n`;
    }
  }

  fs.writeFileSync(path.join(packDir, "INDEX.md"), md);

  console.log(`\nSuccess! Evidence pack generated at: ${packDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
