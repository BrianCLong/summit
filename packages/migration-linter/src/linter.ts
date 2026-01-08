import fg from "fast-glob";
import { promises as fs } from "node:fs";
import { normalizeWhitespace, stripSqlComments, hasOverride } from "./utils.js";
import type { LintFinding, LintOptions } from "./types.js";

const DEFAULT_PATTERNS = [
  "server/migrations/**/*.{sql,ts,js}",
  "server/src/**/migrations/**/*.{sql,ts,js}",
  "server/db/migrations/**/*.{sql,ts,js,cypher}",
];

const destructiveRules: Array<{
  id: string;
  description: string;
  detector: (content: string) => boolean;
  remediation: string;
}> = [
  {
    id: "drop-table",
    description: "DROP TABLE detected",
    detector: (content) => /\bDROP\s+TABLE\b/i.test(content),
    remediation: "Prefer soft-deletes or mark table unused; annotate if irreversible.",
  },
  {
    id: "drop-column",
    description: "DROP COLUMN detected",
    detector: (content) => /\bDROP\s+COLUMN\b/i.test(content),
    remediation: "Use expand/contract: add new column, backfill, switch reads, then remove later.",
  },
  {
    id: "rename",
    description: "RENAME TABLE/COLUMN detected",
    detector: (content) => /\bRENAME\s+(TABLE|COLUMN)\b/i.test(content),
    remediation: "Use dual-write or views; only rename after consumers switch.",
  },
  {
    id: "set-not-null",
    description: "ALTER COLUMN SET NOT NULL without default detected",
    detector: (content) =>
      /\bALTER\s+TABLE\b[\s\S]*?\bALTER\s+COLUMN\b[\s\S]*?\bSET\s+NOT\s+NULL\b/i.test(content) &&
      !/\bDEFAULT\b/i.test(content),
    remediation: "Backfill + add default, then enforce NOT NULL in a follow-up migration.",
  },
  {
    id: "add-not-null",
    description: "ADD COLUMN NOT NULL without default detected",
    detector: (content) =>
      /\bADD\s+COLUMN\b[\s\S]*?\bNOT\s+NULL\b/i.test(content) && !/\bDEFAULT\b/i.test(content),
    remediation: "Add column as NULLable, backfill, then add NOT NULL constraint later.",
  },
];

export function describeOverrides(): string {
  return "Add comment `-- APPROVED_DESTRUCTIVE_CHANGE: <ticket-id>` (or `// ...`) to permit intentional breakage.";
}

async function lintFile(file: string): Promise<LintFinding[]> {
  const raw = await fs.readFile(file, "utf8");
  if (hasOverride(raw)) {
    return [];
  }

  const normalized =
    file.endsWith(".sql") || file.endsWith(".cypher") ? stripSqlComments(raw) : raw;
  const compact = normalizeWhitespace(normalized);

  return destructiveRules
    .filter((rule) => rule.detector(compact))
    .map<LintFinding>((rule) => ({
      file,
      message: rule.description,
      rule: rule.id,
      remediation: rule.remediation,
    }));
}

export async function lintMigrations(options: Partial<LintOptions> = {}): Promise<LintFinding[]> {
  const patterns = options.patterns ?? DEFAULT_PATTERNS;
  const files = await fg(patterns, {
    dot: false,
    ignore: ["**/node_modules/**", "**/dist/**"],
    unique: true,
  });

  const results = await Promise.all(files.map((file) => lintFile(file)));
  return results.flat();
}
