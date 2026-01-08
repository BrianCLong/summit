import { VerificationReport } from "./types.js";

function formatCheckPrefix(ok: boolean): string {
  return ok ? "✔" : "✖";
}

export function formatReport(report: VerificationReport): string {
  const lines: string[] = [];
  lines.push(`Provenance bundle: ${report.bundlePath}`);
  lines.push(`Manifest: ${report.manifestPath}`);
  lines.push("");
  lines.push(`Overall: ${report.ok ? "PASS" : "FAIL"}`);
  lines.push("");

  const checks = [
    report.checks.manifestStructure,
    report.checks.evidenceHashes,
    report.checks.hashTree,
    report.checks.transformChains,
    report.checks.claimReferences,
  ];

  lines.push("Checks:");
  for (const check of checks) {
    lines.push(`  ${formatCheckPrefix(check.ok)} ${check.name}`);
    for (const error of check.errors) {
      lines.push(`    - ERROR: ${error}`);
    }
    for (const warning of check.warnings) {
      lines.push(`    - WARN: ${warning}`);
    }
  }

  lines.push("");
  lines.push("Summary:");
  lines.push(`  Evidence items: ${report.summary.evidenceCount}`);
  lines.push(`  Claims: ${report.summary.claimCount}`);

  if (report.summary.missingEvidence.length > 0) {
    lines.push(`  Missing evidence: ${report.summary.missingEvidence.join(", ")}`);
  }

  if (report.summary.hashMismatches.length > 0) {
    lines.push(`  Hash mismatches: ${report.summary.hashMismatches.join(", ")}`);
  }

  return lines.join("\n");
}
