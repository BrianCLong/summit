function formatChange(change) {
  const status = change.allowed ? "allowed" : change.severity === "breaking" ? "breaking" : "info";
  const rationale =
    change.details && "rationale" in change.details ? ` — ${change.details.rationale}` : "";
  const detail = change.details ? ` (${JSON.stringify(change.details)})` : "";
  return `- [${status}] (${change.code}) ${change.path}: ${change.message}${detail}${rationale}`;
}

function renderFileSection(result) {
  const lines = [`### ${result.file}`];
  if (result.breaking.length === 0 && result.nonBreaking.length === 0) {
    lines.push("No schema differences detected.");
    return lines.join("\n");
  }

  if (result.breaking.length) {
    lines.push("**Breaking**");
    for (const change of result.breaking) {
      lines.push(formatChange(change));
    }
  }

  if (result.nonBreaking.length) {
    lines.push("**Additive/Informational**");
    for (const change of result.nonBreaking) {
      lines.push(formatChange(change));
    }
  }

  return lines.join("\n");
}

export function buildReport(diff, baselineDir, currentDir) {
  const header = [
    "# Schema Compatibility Report",
    "",
    `Baseline: ${baselineDir}`,
    `Current: ${currentDir}`,
    "",
    `Breaking changes: ${diff.breaking.length}`,
    `Allowed (version bump or map): ${diff.allowed.length}`,
    `Unresolved breaking: ${diff.unresolved.length}`,
    `Additive/Informational: ${diff.nonBreaking.length}`,
    diff.versionBumped
      ? "- Major version bump detected; unresolved changes treated as allowed."
      : undefined,
    "",
  ].filter((line) => line !== undefined && line !== null);

  const fileSections = diff.results
    .sort((a, b) => a.file.localeCompare(b.file))
    .map((result) =>
      renderFileSection({
        ...result,
        breaking: [...result.breaking].sort((a, b) => a.path.localeCompare(b.path)),
        nonBreaking: [...result.nonBreaking].sort((a, b) => a.path.localeCompare(b.path)),
      })
    );

  const unresolvedSection = diff.unresolved.length
    ? ["## Unresolved breaking changes", ...diff.unresolved.map(formatChange), ""]
    : ["## Unresolved breaking changes", "None", ""];

  return [...header, ...unresolvedSection, ...fileSections, ""].join("\n");
}
