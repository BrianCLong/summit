#!/usr/bin/env node
 
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

if (!process.argv[2]) {
  console.error("Usage: pr-risk-score.js <PR_NUMBER>");
  process.exit(1);
}

const prNumber = process.argv[2];

// Verify gh CLI
try {
  execSync("gh --version", { stdio: "ignore" });
} catch (err) {
  console.error("GitHub CLI (gh) is required.");
  process.exit(1);
}

function getFiles() {
  const json = execSync(`gh pr view ${prNumber} --json files`, {
    encoding: "utf8",
  });
  const data = JSON.parse(json);
  return data.files.map((f) => f.path);
}

function fileRisk(count) {
  if (count > 20) return 2;
  if (count > 5) return 1;
  return 0;
}

function coreRisk(files) {
  const CORE_PATHS = ["server/src", "client/src"];
  const hasCore = files.some((f) => CORE_PATHS.some((cp) => f.startsWith(cp)));
  return { hasCore, score: hasCore ? 2 : 0 };
}

function coverageRisk() {
  const base = parseFloat(process.env.BASE_COVERAGE || "0");
  let current = 0;
  let delta = 0;
  let score = 0;
  const candidates = [
    "coverage/coverage-summary.json",
    "server/coverage/coverage-summary.json",
    "client/coverage/coverage-summary.json",
  ];
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      try {
        const cov = JSON.parse(fs.readFileSync(file, "utf8"));
        current = cov.total.lines.pct;
        break;
      } catch (err) {
        // ignore
      }
    }
  }
  if (current) {
    delta = current - base;
    if (delta < 0) score = 2;
  }
  return { current, delta, score };
}

const files = getFiles();
const fileCount = files.length;
const fileScore = fileRisk(fileCount);
const { hasCore, score: coreScore } = coreRisk(files);
const { delta: covDelta, score: covScore } = coverageRisk();

const total = fileScore + coreScore + covScore;
let level = "low";
if (total >= 5) level = "high";
else if (total >= 3) level = "medium";

const comment = `### PR Risk Assessment\n- Files changed: ${fileCount}\n- Core system files touched: ${hasCore ? "yes" : "no"}\n- Test coverage delta: ${covDelta.toFixed(2)}%\n- **Risk Score:** ${total} (${level})`;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "risk-"));
const commentPath = path.join(tmp, "comment.md");
fs.writeFileSync(commentPath, comment);
execSync(`gh pr comment ${prNumber} --body-file ${commentPath}`);
console.log(comment);
