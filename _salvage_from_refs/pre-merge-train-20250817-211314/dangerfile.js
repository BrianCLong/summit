import { danger, warn, fail, markdown } from "danger";

const modifiedFiles = danger.git.modified_files.concat(
  danger.git.created_files,
);

// Warn if tests aren’t updated
const testChanges = modifiedFiles.filter((f) =>
  /(__tests__|test|spec)/i.test(f),
).length;
if (testChanges === 0) {
  warn("No tests were updated. Is this change tested?");
}

// Enforce documentation updates
const docsModified = modifiedFiles.some((f) => f.startsWith("docs/"));
if (!docsModified) {
  warn("Consider documenting this change in `docs/`.");
}

// PR size guard
const MAX_LOC = 700;
const changedLOC = danger.github.pr.additions + danger.github.pr.deletions;
const hasSizeOverride = danger.github.pr.labels.some(
  (l) => l.name === "size-override",
);
if (!hasSizeOverride && changedLOC > MAX_LOC) {
  fail(
    `PR changes ${changedLOC} LOC which exceeds the limit of ${MAX_LOC}. Add 'size-override' label to override.`,
  );
} else if (!hasSizeOverride && changedLOC > MAX_LOC * 0.8) {
  warn(`PR changes ${changedLOC} LOC; consider splitting if possible.`);
}

// Fail if TODO left
schedule(async () => {
  const results = await Promise.all(
    modifiedFiles.map(async (file) => {
      const diff = await danger.git.diffForFile(file);
      return diff && diff.includes("TODO");
    }),
  );
  if (results.some(Boolean)) {
    fail("Remove TODO comments before merging.");
  }
});

// Summary
markdown("## PR Review Automated by Danger :robot:");
