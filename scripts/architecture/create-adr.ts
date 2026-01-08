#!/usr/bin/env npx ts-node

/**
 * ADR Auto-Generator Script
 *
 * Generates new Architecture Decision Records from template with:
 * - Sequential numbering
 * - Auto-linking to index
 * - Metadata population
 *
 * Usage:
 *   npx ts-node scripts/architecture/create-adr.ts --title "My Decision" --area "Data"
 *   pnpm adr:create --title "My Decision" --area "Data"
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const ADR_DIR = path.resolve(__dirname, "../../docs/architecture/adr");
const INDEX_FILE = path.resolve(__dirname, "../../docs/architecture/ADR_INDEX.md");
const TEMPLATE_FILE = path.join(ADR_DIR, "adr-template.md");

const VALID_AREAS = [
  "Data",
  "AI/ML",
  "Infrastructure",
  "Auth/Security",
  "API",
  "UX",
  "Observability",
  "Compliance",
];

const VALID_STATUSES = ["Proposed", "Accepted", "Deprecated", "Superseded"];

interface ADROptions {
  title: string;
  area: string;
  status?: string;
  owner?: string;
  tags?: string[];
}

/**
 * Parse command line arguments
 */
function parseArgs(): ADROptions {
  const args = process.argv.slice(2);
  const options: Partial<ADROptions> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const value = args[i + 1];

    switch (arg) {
      case "--title":
      case "-t":
        options.title = value;
        i++;
        break;
      case "--area":
      case "-a":
        options.area = value;
        i++;
        break;
      case "--status":
      case "-s":
        options.status = value;
        i++;
        break;
      case "--owner":
      case "-o":
        options.owner = value;
        i++;
        break;
      case "--tags":
        options.tags = value?.split(",").map((t) => t.trim());
        i++;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
    }
  }

  // Validate required fields
  if (!options.title) {
    console.error("Error: --title is required");
    printHelp();
    process.exit(1);
  }

  if (!options.area) {
    console.error("Error: --area is required");
    printHelp();
    process.exit(1);
  }

  if (!VALID_AREAS.includes(options.area)) {
    console.error(`Error: Invalid area "${options.area}"`);
    console.error(`Valid areas: ${VALID_AREAS.join(", ")}`);
    process.exit(1);
  }

  return {
    title: options.title,
    area: options.area,
    status: options.status || "Proposed",
    owner: options.owner || "TBD",
    tags: options.tags || [],
  };
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
ADR Auto-Generator

Usage:
  npx ts-node scripts/architecture/create-adr.ts [options]

Options:
  --title, -t    (required) Title of the ADR
  --area, -a     (required) Area: ${VALID_AREAS.join(", ")}
  --status, -s   Status: ${VALID_STATUSES.join(", ")} (default: Proposed)
  --owner, -o    Owner team/guild (default: TBD)
  --tags         Comma-separated tags
  --help, -h     Show this help

Examples:
  npx ts-node scripts/architecture/create-adr.ts --title "Event Sourcing" --area "Data"
  npx ts-node scripts/architecture/create-adr.ts -t "API Gateway" -a "Infrastructure" -o "Platform Team"
`);
}

/**
 * Get the next ADR number by scanning existing files
 */
function getNextADRNumber(): number {
  const files = fs.readdirSync(ADR_DIR);
  const adrNumbers = files
    .filter((f) => /^\d{4}-/.test(f))
    .map((f) => parseInt(f.substring(0, 4), 10))
    .filter((n) => !isNaN(n));

  if (adrNumbers.length === 0) {
    return 1;
  }

  return Math.max(...adrNumbers) + 1;
}

/**
 * Convert title to filename slug
 */
function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Get current date in YYYY-MM-DD format
 */
function getCurrentDate(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

/**
 * Read and populate the template
 */
function generateADRContent(options: ADROptions, number: number): string {
  let template: string;

  try {
    template = fs.readFileSync(TEMPLATE_FILE, "utf-8");
  } catch {
    // Fallback template if file doesn't exist
    template = `# ADR-NNNN: [Short Title of Decision]

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-XXXX
**Area:** Data | AI/ML | Infrastructure | Auth/Security | API | UX | Observability | Compliance
**Owner:** [Team/Guild name]
**Tags:** [comma, separated, tags]

## Context

What is the issue we're addressing?

## Decision

What is the change we're proposing/making?

## Alternatives Considered

What other options did we evaluate?

## Consequences

What becomes easier or harder?

## Code References

Links to the actual implementation.

## Tests & Validation

How do we enforce this decision?

## Related ADRs

- ADR-XXXX: Related decision

## References

- [External documentation](url)

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| YYYY-MM-DD | Name | Initial version |
`;
  }

  const paddedNumber = String(number).padStart(4, "0");
  const date = getCurrentDate();
  const tags = options.tags?.length ? options.tags.join(", ") : "tbd";

  // Replace placeholders
  let content = template
    .replace("ADR-NNNN:", `ADR-${paddedNumber}:`)
    .replace("[Short Title of Decision]", options.title)
    .replace("YYYY-MM-DD", date)
    .replace(
      "Proposed | Accepted | Deprecated | Superseded by ADR-XXXX",
      options.status || "Proposed"
    )
    .replace(
      "Data | AI/ML | Infrastructure | Auth/Security | API | UX | Observability | Compliance",
      options.area
    )
    .replace("[Team/Guild name]", options.owner || "TBD")
    .replace("[comma, separated, tags]", tags);

  // Update revision history date
  content = content.replace(/\| YYYY-MM-DD \| Name \|/, `| ${date} | ${options.owner || "TBD"} |`);

  return content;
}

/**
 * Update the ADR index with the new entry
 */
function updateIndex(options: ADROptions, number: number, filename: string): void {
  if (!fs.existsSync(INDEX_FILE)) {
    console.warn("Warning: Index file not found, skipping index update");
    return;
  }

  let indexContent = fs.readFileSync(INDEX_FILE, "utf-8");
  const paddedNumber = String(number).padStart(4, "0");
  const date = getCurrentDate();

  // Find the table and add new entry
  const tablePattern =
    /(\| ---- \| ------------------------------------------------ \| -------- \| -------------- \| ---------- \|)/;

  if (!tablePattern.test(indexContent)) {
    console.warn("Warning: Could not find index table, skipping index update");
    return;
  }

  const newRow = `| ${paddedNumber} | [${options.title}](adr/${filename}) | ${options.status || "Proposed"} | ${options.area} | ${date} |`;

  // Find the last table row and add after it
  const lines = indexContent.split("\n");
  let lastTableRowIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("| 0")) {
      lastTableRowIndex = i;
    }
  }

  if (lastTableRowIndex === -1) {
    // No existing entries, add after header separator
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("| ---- |")) {
        lastTableRowIndex = i;
        break;
      }
    }
  }

  if (lastTableRowIndex !== -1) {
    lines.splice(lastTableRowIndex + 1, 0, newRow);
    indexContent = lines.join("\n");

    // Also add to the area section
    const areaSection = `### ${options.area}`;
    const areaIndex = indexContent.indexOf(areaSection);

    if (areaIndex !== -1) {
      const nextSectionIndex = indexContent.indexOf("\n### ", areaIndex + 1);
      const insertPoint = nextSectionIndex !== -1 ? nextSectionIndex : indexContent.length;

      // Find where to insert in the area section
      const areaContent = indexContent.substring(areaIndex, insertPoint);
      const areaLines = areaContent.split("\n");

      // Find the last list item or add after header
      let insertLineIndex = 1; // After the header
      for (let i = 1; i < areaLines.length; i++) {
        if (areaLines[i].startsWith("- [ADR-")) {
          insertLineIndex = i + 1;
        }
      }

      const newAreaEntry = `- [ADR-${paddedNumber}: ${options.title}](adr/${filename})`;

      // Check if there's a "No ADRs" message and remove it
      if (areaLines.some((l) => l.includes("No ADRs in this category"))) {
        areaLines[insertLineIndex] = newAreaEntry;
      } else {
        areaLines.splice(insertLineIndex, 0, newAreaEntry);
      }

      const newAreaContent = areaLines.join("\n");
      indexContent =
        indexContent.substring(0, areaIndex) + newAreaContent + indexContent.substring(insertPoint);
    }

    // Update the last updated date
    indexContent = indexContent.replace(
      /_Last updated: \d{4}-\d{2}-\d{2}_/,
      `_Last updated: ${date}_`
    );

    fs.writeFileSync(INDEX_FILE, indexContent);
    console.log(`Updated: ${INDEX_FILE}`);
  }
}

/**
 * Main function
 */
function main(): void {
  const options = parseArgs();
  const number = getNextADRNumber();
  const slug = titleToSlug(options.title);
  const filename = `${String(number).padStart(4, "0")}-${slug}.md`;
  const filepath = path.join(ADR_DIR, filename);

  // Check if file already exists
  if (fs.existsSync(filepath)) {
    console.error(`Error: File already exists: ${filepath}`);
    process.exit(1);
  }

  // Generate content
  const content = generateADRContent(options, number);

  // Ensure directory exists
  if (!fs.existsSync(ADR_DIR)) {
    fs.mkdirSync(ADR_DIR, { recursive: true });
  }

  // Write the ADR file
  fs.writeFileSync(filepath, content);
  console.log(`Created: ${filepath}`);

  // Update the index
  updateIndex(options, number, filename);

  console.log(`
ADR-${String(number).padStart(4, "0")} created successfully!

Next steps:
1. Edit ${filepath} with your decision details
2. Fill in Context, Decision, Alternatives, and Consequences sections
3. Add Code References and Tests
4. Submit a PR with your changes
`);
}

main();
