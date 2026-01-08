const os = require("os");

function formatMachineReadable(report) {
  return JSON.stringify(report, null, 2);
}

function formatHumanSummary(report) {
  const lines = [];
  lines.push("Disaster Recovery Drill Summary");
  lines.push(`Environment: ${report.env}`);
  lines.push(`Status: ${report.overallStatus}`);
  lines.push(`Started: ${report.startedAt}`);
  lines.push(`Completed: ${report.completedAt}`);
  lines.push(`Duration (ms): ${report.durationMs}`);
  lines.push("Stages:");
  lines.push(`  Backup: ${report.stages.backup.status}`);
  lines.push(`  Wipe: ${report.stages.wipe.status}`);
  lines.push(`  Restore: ${report.stages.restore.status}`);
  lines.push("  Invariants:");
  report.stages.invariants.forEach((inv) => {
    lines.push(`    - ${inv.name}: ${inv.status}${inv.details ? ` (${inv.details})` : ""}`);
  });
  lines.push(`  Corruption Check: ${report.stages.corruptionCheck.status}`);
  return lines.join(os.EOL);
}

module.exports = {
  formatMachineReadable,
  formatHumanSummary,
};
