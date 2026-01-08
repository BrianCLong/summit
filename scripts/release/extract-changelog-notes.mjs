#!/usr/bin/env node

import fs from "fs";
import path from "path";

const TAG = process.env.TAG || process.argv[2];
const CHANGELOG_PATHS = process.env.CHANGELOG_PATHS
  ? process.env.CHANGELOG_PATHS.split(",")
  : ["CHANGELOG.md", "docs/CHANGELOG.md"];

if (!TAG) {
  console.error("Error: TAG argument or environment variable is required.");
  process.exit(1);
}

const version = TAG.startsWith("v") ? TAG.substring(1) : TAG;
const tagWithV = TAG.startsWith("v") ? TAG : `v${TAG}`;

function findChangelogFile(paths) {
  for (const p of paths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

function tryExtractSection(content, tagsToTry) {
  for (const t of tagsToTry) {
    const section = extractSection(content, t);
    if (section) {
      return section;
    }
  }
  return null;
}

function extractSection(content, tag) {
  const lines = content.split("\n");
  let insideSection = false;
  let sectionLines = [];

  // Patterns to match:
  // ## vX.Y.Z
  // ## [vX.Y.Z]
  // ## X.Y.Z
  // ## [X.Y.Z]

  const versionPatterns = [`## ${tag}`, `## \\[${tag}\\]`];

  if (tag.startsWith("v")) {
    const noV = tag.substring(1);
    versionPatterns.push(`## ${noV}`);
    versionPatterns.push(`## \\[${noV}\\]`);
  }

  // Regex to match start of the section
  const startRegex = new RegExp(`^(${versionPatterns.join("|")})`);

  // Regex to match start of the NEXT section (any ## header)
  const nextSectionRegex = /^##\s+/;

  for (const line of lines) {
    if (insideSection) {
      if (nextSectionRegex.test(line)) {
        break;
      }
      sectionLines.push(line);
    } else {
      if (startRegex.test(line)) {
        insideSection = true;
      }
    }
  }

  return insideSection ? sectionLines.join("\n").trim() : null;
}

function main() {
  const changelogPath = findChangelogFile(CHANGELOG_PATHS);

  if (!changelogPath) {
    console.error(`Error: No changelog found in paths: ${CHANGELOG_PATHS.join(", ")}`);
    process.exit(3);
  }

  const content = fs.readFileSync(changelogPath, "utf8");

  // Determine tags to try
  const tagsToTry = [tagWithV];

  // Handle RC fallback logic
  // "For RC tags, allow vX.Y.Z-rc.N headings if present; otherwise prefer GA section if the changelog only tracks GA."
  // If TAG is RC, we already have it in tagsToTry.
  // We should add the GA version as fallback.
  if (tagWithV.includes("-")) {
    const gaVersion = tagWithV.split("-")[0];
    tagsToTry.push(gaVersion);
  }

  const section = tryExtractSection(content, tagsToTry);

  if (section) {
    console.log(section);
    process.exit(0);
  } else {
    console.error(
      `Section for ${TAG} (or fallbacks: ${tagsToTry.join(", ")}) not found in ${changelogPath}`
    );
    process.exit(3);
  }
}

main();
