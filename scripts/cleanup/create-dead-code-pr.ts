import fs from "fs";
import path from "path";
import { execSync } from "child_process";

type Confidence = "high" | "medium" | "low";

type DeadCodeType = "unused-export" | "unreferenced-module";

interface DeadCodeCandidate {
  type: DeadCodeType;
  file: string;
  symbolName?: string;
  reason: string;
  confidence: Confidence;
  owner?: string;
}

interface DeadCodeReport {
  generatedAt: string;
  summary: {
    unusedExportCount: number;
    unreferencedModuleCount: number;
  };
  candidates: {
    unusedExports: DeadCodeCandidate[];
    unreferencedModules: DeadCodeCandidate[];
  };
}

interface CliOptions {
  reportPath: string;
  branchName: string;
  dryRun: boolean;
  maxDeletes: number;
}

const projectRoot = process.cwd();
const defaultReportPath = path.join(projectRoot, "reports", "dead-code-report.json");

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    reportPath: defaultReportPath,
    branchName: process.env.DEAD_CODE_BRANCH || "feature/dead-code-detector-pr-bot-01",
    dryRun: true,
    maxDeletes: 50,
  };

  argv.forEach((arg) => {
    if (arg === "--execute" || arg === "--no-dry-run") {
      options.dryRun = false;
    }
    if (arg.startsWith("--report=")) {
      options.reportPath = path.resolve(projectRoot, arg.replace("--report=", ""));
    }
    if (arg.startsWith("--branch=")) {
      options.branchName = arg.replace("--branch=", "");
    }
    if (arg.startsWith("--max-deletes=")) {
      const parsed = Number.parseInt(arg.replace("--max-deletes=", ""), 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        options.maxDeletes = parsed;
      }
    }
  });

  return options;
}

function loadReport(reportPath: string): DeadCodeReport {
  if (!fs.existsSync(reportPath)) {
    throw new Error(`Dead code report not found at ${reportPath}`);
  }
  return JSON.parse(fs.readFileSync(reportPath, "utf8")) as DeadCodeReport;
}

function runCommand(command: string): void {
  execSync(command, { stdio: "inherit", cwd: projectRoot });
}

function ensureBranch(branchName: string): void {
  try {
    execSync(`git rev-parse --verify ${branchName}`, { stdio: "ignore", cwd: projectRoot });
    runCommand(`git checkout ${branchName}`);
  } catch {
    runCommand(`git checkout -b ${branchName}`);
  }
}

function buildPrBody(
  candidates: DeadCodeCandidate[],
  report: DeadCodeReport,
  reportPath: string
): string {
  const bulletList = candidates
    .slice(0, 20)
    .map(
      (candidate) =>
        `- ${candidate.file}${candidate.symbolName ? ` :: ${candidate.symbolName}` : ""} (${candidate.reason})`
    )
    .join("\n");

  return [
    "# Dead-code cleanup (dry run)",
    "",
    `Generated from report ${path.relative(projectRoot, reportPath)}`,
    "",
    "## Proposed removals (high confidence)",
    bulletList || "- None identified",
    "",
    "## Policy",
    "- See docs/architecture/dead-code-policy.md",
    "",
    "_Dry-run mode: PR will not be opened until enabled._",
  ].join("\n");
}

function collectHighConfidence(report: DeadCodeReport): DeadCodeCandidate[] {
  const combined = [...report.candidates.unusedExports, ...report.candidates.unreferencedModules];
  return combined.filter((candidate) => candidate.confidence === "high");
}

function deleteTarget(filePath: string): void {
  const fullPath = path.join(projectRoot, filePath);
  if (!fs.existsSync(fullPath)) {
    return;
  }
  const content = fs.readFileSync(fullPath, "utf8");
  if (/@experimental|@keep|KEEP/.test(content)) {
    console.log(`Skipping protected file ${filePath}`);
    return;
  }
  fs.rmSync(fullPath, { recursive: true, force: true });
  runCommand(`git add ${JSON.stringify(filePath)}`);
}

function executeCleanup(
  branchName: string,
  candidates: DeadCodeCandidate[],
  maxDeletes: number
): void {
  ensureBranch(branchName);

  const deletions = candidates
    .filter((candidate) => candidate.type === "unreferenced-module")
    .slice(0, maxDeletes);
  if (deletions.length === 0) {
    console.log("No file-level deletions to apply.");
    return;
  }

  deletions.forEach((candidate) => deleteTarget(candidate.file));

  runCommand("pnpm lint");
  runCommand("pnpm typecheck");

  const resolvedReportPath = path.join(projectRoot, "reports", "dead-code-report.json");
  const prBody = buildPrBody(deletions, loadReport(resolvedReportPath), resolvedReportPath);
  const prTitle = "cleanup: Dead-code detection & automated cleanup bot";

  try {
    runCommand(`gh pr create --title "${prTitle}" --body "${prBody.replace(/"/g, '\\"')}"`);
  } catch (error) {
    console.error("Failed to create PR automatically. Please create it manually.");
    console.error(error);
  }
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const report = loadReport(options.reportPath);
  const highConfidence = collectHighConfidence(report);

  if (highConfidence.length === 0) {
    console.log("No high-confidence dead code candidates found.");
    return;
  }

  console.log(`Found ${highConfidence.length} high-confidence candidates.`);
  highConfidence.forEach((candidate) => {
    console.log(
      ` - ${candidate.type}: ${candidate.file}${candidate.symbolName ? ` (${candidate.symbolName})` : ""}`
    );
  });

  if (options.dryRun) {
    console.log("Dry-run enabled. No branch, deletion, or PR actions were taken.");
    console.log("Disable dry-run with --execute once the workflow is vetted.");
    return;
  }

  executeCleanup(options.branchName, highConfidence, options.maxDeletes);
}

main();
