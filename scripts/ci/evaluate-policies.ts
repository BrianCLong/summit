import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// --- Configuration ---
const POLICY_DIR = "policy/ci";
const ARTIFACT_PATH = "pr-provenance.json";
const FAIL_CATALOG_DOC = "docs/ga/CI-FAILURE-CATALOG.md";

// --- Helpers ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");

function runGit(command) {
  try {
    return execSync(command, { encoding: "utf8", cwd: rootDir }).trim();
  } catch (e) {
    console.error(`Git command failed: ${command}`);
    return "";
  }
}

function loadJson(filepath) {
  const fullPath = path.resolve(rootDir, filepath);
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function getChangedFiles(baseRef, headRef) {
  // If in GitHub Actions, use the refs provided.
  // Fallback to local diff against main or HEAD~1
  let cmd = "";
  if (baseRef && headRef) {
    cmd = `git diff --name-only ${baseRef}...${headRef}`;
  } else {
    // Local fallback
    cmd = `git diff --name-only HEAD~1`;
  }

  const output = runGit(cmd);
  return output.split("\n").filter((f) => f.trim() !== "");
}

function getFileContent(filepath) {
  const fullPath = path.resolve(rootDir, filepath);
  if (fs.existsSync(fullPath)) {
    return fs.readFileSync(fullPath, "utf8");
  }
  return "";
}

function matchGlob(filename, pattern) {
  // Simple glob matcher (convert to regex)
  // strict glob matching isn't native to JS, implementing basic * support
  const regexString =
    "^" + pattern.replace(/\./g, "\\.").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*") + "$";
  return new RegExp(regexString).test(filename);
}

// --- Checks ---

function checkDependencyPinning(changedFiles, violations) {
  if (changedFiles.includes("package.json")) {
    const content = getFileContent("package.json");
    try {
      const pkg = JSON.parse(content);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      const looseDeps = [];

      for (const [name, version] of Object.entries(deps)) {
        if (version.startsWith("^") || version.startsWith("~")) {
          looseDeps.push(name);
        }
      }

      if (looseDeps.length > 0) {
        violations.push({
          code: "SEC-002",
          message: `Loose dependencies found in package.json: ${looseDeps.join(", ")}`,
          file: "package.json",
        });
      }
    } catch (e) {
      violations.push({
        code: "PROV-001", // Generic integrity
        message: "Invalid package.json format",
        file: "package.json",
      });
    }
  }
}

function checkAgentRules(changedFiles, violations, actor) {
  const rulesConfig = loadJson(path.join(POLICY_DIR, "agent-rules.json"));
  if (!rulesConfig) return;

  const isAgent =
    actor === "Jules" || actor === "github-actions[bot]" || process.env.IS_AGENT === "true";

  for (const rule of rulesConfig.rules) {
    // File path checks
    if (rule.files) {
      const protectedMatches = changedFiles.filter((file) =>
        rule.files.some((pattern) => matchGlob(file, pattern))
      );

      if (protectedMatches.length > 0) {
        // Check if agent is allowed
        const allowed = rule.allow_agents && rule.allow_agents.includes(actor);

        // If it's the "protect-root-configs" rule and we are an agent (and not allowed), flag it
        // Or if it's "enforce-zone-containment" (we assume generic agents have restricted zones)

        if (rule.id === "protect-root-configs" && isAgent && !allowed) {
          violations.push({
            code: "AGENT-002",
            message: `${rule.description} Files: ${protectedMatches.join(", ")}`,
            ruleId: rule.id,
          });
        }
      }
    }

    // Content checks (pattern matching)
    if (rule.pattern) {
      // Check all changed files for this pattern
      for (const file of changedFiles) {
        // optimization: skip binary files or large files if needed
        // Filter based on file rule if exists? No, pattern applies to all or specified files
        let filesToCheck = [file];
        if (rule.files) {
          filesToCheck = [file].filter((f) => rule.files.some((p) => matchGlob(f, p)));
        }

        if (filesToCheck.length === 0) continue;

        const content = getFileContent(file);
        if (content.includes(rule.pattern)) {
          violations.push({
            code: rule.id === "no-todos-in-critical-paths" ? "PROV-003" : "AGENT-001", // Map to closest code
            message: `${rule.description} Found "${rule.pattern}" in ${file}`,
            file: file,
            ruleId: rule.id,
          });
        }
      }
    }
  }
}

// --- Main ---

function main() {
  console.log("Starting Governance Evaluation...");

  const baseRef = process.env.BASE_REF || "origin/main";
  const headRef = process.env.HEAD_REF || "HEAD";
  const actor = process.env.GITHUB_ACTOR || "unknown";

  console.log(`Diffing ${baseRef}...${headRef}`);
  const changedFiles = getChangedFiles(baseRef, headRef);
  console.log(`Found ${changedFiles.length} changed files.`);

  const violations = [];

  // Run Checks
  checkDependencyPinning(changedFiles, violations);
  checkAgentRules(changedFiles, violations, actor);

  // Generate Provenance
  const provenance = {
    timestamp: new Date().toISOString(),
    actor: actor,
    context: {
      baseRef,
      headRef,
      ciJob: process.env.GITHUB_JOB || "local",
    },
    changedFilesCount: changedFiles.length,
    changedFiles: changedFiles,
    violations: violations,
    status: violations.length === 0 ? "VERIFIED" : "REJECTED",
  };

  fs.writeFileSync(ARTIFACT_PATH, JSON.stringify(provenance, null, 2));
  console.log(`Provenance artifact written to ${ARTIFACT_PATH}`);

  // Report
  if (violations.length > 0) {
    console.error("\n❌ GOVERNANCE VIOLATIONS FOUND:");
    violations.forEach((v) => {
      console.error(` - [${v.code}] ${v.message} (${v.file || "General"})`);
    });
    console.error(`\nSee ${FAIL_CATALOG_DOC} for remediation steps.`);
    process.exit(1);
  } else {
    console.log("\n✅ Governance checks passed.");
  }
}

main();
