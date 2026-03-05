import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { analyzeBoundary } from "./react_boundary_analyzer.ts";
import { validateReactPractices } from "./react_cache_validator.ts";

const RULES_VERSION = "1.0.0";
const REPORT_DIR = path.join("reports", "react-best-practices");

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function getCommit(): string {
  return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function main(): number {
  const root = path.resolve(process.argv[2] ?? process.cwd());
  const boundary = analyzeBoundary(root);
  const practices = validateReactPractices(root);

  const report = {
    violations: [...boundary.violations, ...practices.violations].sort((a, b) => {
      const fileCmp = a.file.localeCompare(b.file);
      if (fileCmp !== 0) return fileCmp;
      const ruleCmp = a.ruleId.localeCompare(b.ruleId);
      if (ruleCmp !== 0) return ruleCmp;
      return (("importPath" in a ? a.importPath : "") as string).localeCompare(
        ("importPath" in b ? b.importPath : "") as string
      );
    }),
    summary: {
      scannedFiles: boundary.scannedFiles,
      routeFiles: practices.summary.totalFiles,
      boundaryViolations: boundary.violations.length,
      cacheViolations: practices.violations.filter((v) => v.ruleId === "RBP-002").length,
      streamingViolations: practices.violations.filter((v) => v.ruleId === "RBP-003").length,
      totalViolations: boundary.violations.length + practices.violations.length,
    },
  };

  const streamingCoveragePercent =
    practices.summary.streamingEligibleRoutes === 0
      ? 100
      : Number(
          (
            (practices.summary.streamingCoveredRoutes / practices.summary.streamingEligibleRoutes) *
            100
          ).toFixed(2)
        );

  const metrics = {
    boundaryViolations: boundary.violations.length,
    cacheViolations: practices.violations.filter((v) => v.ruleId === "RBP-002").length,
    streamingCoveragePercent,
  };

  const stamp = {
    commit: getCommit(),
    rulesVersion: RULES_VERSION,
  };

  const reportDir = path.join(root, REPORT_DIR);
  ensureDir(reportDir);
  writeJson(path.join(reportDir, "report.json"), report);
  writeJson(path.join(reportDir, "metrics.json"), metrics);
  writeJson(path.join(reportDir, "stamp.json"), stamp);

  const hasViolations = report.summary.totalViolations > 0;
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  return hasViolations ? 1 : 0;
}

process.exitCode = main();
