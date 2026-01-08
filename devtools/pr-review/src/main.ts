import parseDiff from "parse-diff";
import * as fs from "fs";
import { Reviewer } from "./reviewer";
import { ReviewFinding, ReviewOutput } from "./types";

function generateMarkdown(findings: ReviewFinding[]): string {
  if (findings.length === 0) {
    return "## PR Review\n\n✅ No issues found by the automated reviewer.";
  }

  let md = "## PR Review Findings\n\n";

  // Group by severity
  const critical = findings.filter((f) => f.severity === "critical");
  const warning = findings.filter((f) => f.severity === "warning");
  const info = findings.filter((f) => f.severity === "info");

  if (critical.length > 0) {
    md += "### 🚨 Critical Issues (Must Fix)\n";
    critical.forEach((f) => {
      md += `- **${f.ruleId}**: ${f.message} (${f.file}${f.line ? `:${f.line}` : ""})\n`;
    });
    md += "\n";
  }

  if (warning.length > 0) {
    md += "### ⚠️ Warnings\n";
    warning.forEach((f) => {
      md += `- **${f.ruleId}**: ${f.message} (${f.file}${f.line ? `:${f.line}` : ""})\n`;
    });
    md += "\n";
  }

  if (info.length > 0) {
    md += "### ℹ️ Suggestions\n";
    info.forEach((f) => {
      md += `- **${f.ruleId}**: ${f.message} (${f.file}${f.line ? `:${f.line}` : ""})\n`;
    });
    md += "\n";
  }

  return md;
}

async function main() {
  const args = process.argv.slice(2);
  const diffFile = args[0];

  if (!diffFile) {
    console.error("Usage: scan <diff-file>");
    process.exit(1);
  }

  try {
    const diffContent = fs.readFileSync(diffFile, "utf8");
    const files = parseDiff(diffContent);

    // Convert to internal format if needed, but parse-diff matches our needs mostly
    // We cast to our type which is structurally compatible enough or we map it
    const diffFiles = files.map((f) => ({
      to: f.to,
      from: f.from,
      chunks: f.chunks.map((c) => ({
        content: c.content,
        changes: c.changes.map((ch) => ({
          type: ch.type,
          content: ch.content,
          ln1: (ch as any).ln1 || (ch as any).ln, // parse-diff types might vary
          ln2: (ch as any).ln2 || (ch as any).ln,
        })),
      })),
    }));

    const reviewer = new Reviewer(diffFiles as any);
    const findings = reviewer.review();

    const output: ReviewOutput = {
      summary: generateMarkdown(findings),
      findings: findings,
      passed: !findings.some((f) => f.severity === "critical"),
    };

    // Output JSON
    fs.writeFileSync("review_findings.json", JSON.stringify(output, null, 2));

    // Output Markdown
    fs.writeFileSync("review_findings.md", output.summary);

    console.log(output.summary);

    if (!output.passed) {
      console.error("CRITICAL ISSUES FOUND");
      process.exit(1);
    }
  } catch (error) {
    console.error("Error processing diff:", error);
    process.exit(1);
  }
}

main();
