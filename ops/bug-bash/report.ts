import fs from "fs";
import path from "path";

interface BugBashEntry {
  issueId: string;
  title: string;
  severity: string;
  component: string;
  status: string;
  openedAt?: Date;
  closedAt?: Date;
  owner?: string;
  score?: number;
  notes?: string;
}

interface CliOptions {
  input: string;
  outputDir: string;
  eventName?: string;
  eventDate?: string;
}

const DEFAULT_OUTPUT_DIR = path.join("docs", "process", "bug-bash-reports");

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { input: "", outputDir: DEFAULT_OUTPUT_DIR };

  argv.forEach((arg, index) => {
    if (arg === "--input" && argv[index + 1]) options.input = argv[index + 1];
    if (arg === "--outputDir" && argv[index + 1]) options.outputDir = argv[index + 1];
    if (arg === "--event" && argv[index + 1]) options.eventName = argv[index + 1];
    if (arg === "--date" && argv[index + 1]) options.eventDate = argv[index + 1];
  });

  if (!options.input) {
    throw new Error("--input <csv file> is required");
  }

  return options;
}

function sanitizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseCsvRow(row: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < row.length; i += 1) {
    const char = row[i];

    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function parseCsv(content: string): BugBashEntry[] {
  const [headerLine, ...rows] = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (!headerLine) {
    throw new Error("CSV is empty or missing a header row.");
  }

  const headers = parseCsvRow(headerLine).map((header) => header.toLowerCase());

  return rows.map((row) => {
    const values = parseCsvRow(row);
    const record: Record<string, string> = {};

    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
    });

    const severity = record["severity"] || record["sev"] || "unknown";
    const status = record["status"] || record["state"] || "";

    return {
      issueId: record["issue_id"] || record["issue"] || record["id"] || "",
      title: record["title"] || record["summary"] || "",
      severity,
      component: record["component"] || record["service"] || record["area"] || "",
      status,
      openedAt: parseDate(
        record["opened_at"] || record["created_at"] || record["opened"] || record["created"]
      ),
      closedAt: parseDate(
        record["closed_at"] || record["resolved_at"] || record["closed"] || record["resolved"]
      ),
      owner: record["owner"] || record["assignee"] || record["developer"],
      score: record["score"] ? Number(record["score"]) : undefined,
      notes: record["notes"] || record["summary"] || "",
    };
  });
}

function formatHours(hours: number): string {
  if (!Number.isFinite(hours) || hours < 0) return "N/A";
  return `${hours.toFixed(1)}h`;
}

function computeMetrics(entries: BugBashEntry[]) {
  const closed = entries.filter(
    (entry) => entry.closedAt || /closed|resolved|done/i.test(entry.status)
  );
  const total = entries.length;
  const mttrHours =
    closed.reduce((acc, entry) => {
      if (!entry.openedAt || !entry.closedAt) return acc;
      const diff = entry.closedAt.getTime() - entry.openedAt.getTime();
      return acc + diff / (1000 * 60 * 60);
    }, 0) / (closed.length || 1);

  const severityMap = new Map<string, number>();
  entries.forEach((entry) => {
    const sev = (entry.severity || "UNKNOWN").toUpperCase();
    severityMap.set(sev, (severityMap.get(sev) || 0) + 1);
  });

  const contributorScores = new Map<string, { score: number; closed: number }>();
  entries.forEach((entry) => {
    const owner = entry.owner?.trim();
    if (!owner) return;
    const current = contributorScores.get(owner) || { score: 0, closed: 0 };
    contributorScores.set(owner, {
      score: current.score + (entry.score || 0),
      closed:
        current.closed + (entry.closedAt || /closed|resolved|done/i.test(entry.status) ? 1 : 0),
    });
  });

  const componentCounts = new Map<string, number>();
  entries.forEach((entry) => {
    if (!entry.component) return;
    componentCounts.set(entry.component, (componentCounts.get(entry.component) || 0) + 1);
  });

  return {
    total,
    closedCount: closed.length,
    mttrHours,
    severityMap,
    contributorScores,
    componentCounts,
    openEntries: entries.filter(
      (entry) => !(entry.closedAt || /closed|resolved|done/i.test(entry.status))
    ),
  };
}

function renderSeverityTable(severityMap: Map<string, number>): string {
  const rows: string[] = [];
  rows.push("| Severity | Count |");
  rows.push("| --- | ---: |");
  const sorted = Array.from(severityMap.entries()).sort((a, b) => b[1] - a[1]);
  sorted.forEach(([severity, count]) => {
    rows.push(`| ${severity} | ${count} |`);
  });
  return rows.join("\n");
}

function renderContributorTable(
  contributorScores: Map<string, { score: number; closed: number }>
): string {
  const rows: string[] = [];
  rows.push("| Contributor | Score | Closed |");
  rows.push("| --- | ---: | ---: |");
  const sorted = Array.from(contributorScores.entries()).sort((a, b) => b[1].score - a[1].score);
  sorted.forEach(([name, stats]) => {
    rows.push(`| ${name} | ${stats.score.toFixed(1)} | ${stats.closed} |`);
  });
  return rows.join("\n");
}

function renderComponentTable(componentCounts: Map<string, number>): string {
  const rows: string[] = [];
  rows.push("| Component | Findings |");
  rows.push("| --- | ---: |");
  const sorted = Array.from(componentCounts.entries()).sort((a, b) => b[1] - a[1]);
  sorted.forEach(([component, count]) => {
    rows.push(`| ${component} | ${count} |`);
  });
  return rows.join("\n");
}

function renderFollowUps(entries: BugBashEntry[]): string {
  if (!entries.length) return "All findings were closed during the session.";
  const bulletList = entries
    .slice(0, 15)
    .map((entry) => {
      const owner = entry.owner ? `Owner: ${entry.owner}` : "Owner: TBD";
      const sla = entry.severity.toUpperCase() === "SEV-1" ? "SLA: 4h" : "SLA: 5d/7d";
      return `- ${entry.issueId || entry.title} (${entry.severity}) — ${owner}; ${sla}`;
    })
    .join("\n");
  return `${bulletList}\n\nPush all open items into GitHub Projects with owners and SLAs.`;
}

function buildReport(options: CliOptions, entries: BugBashEntry[]): string {
  const eventName = options.eventName || "bug-bash";
  const date = options.eventDate || new Date().toISOString().slice(0, 10);
  const {
    total,
    closedCount,
    mttrHours,
    severityMap,
    contributorScores,
    componentCounts,
    openEntries,
  } = computeMetrics(entries);

  return `# ${eventName} Bug Bash Report (${date})

## Summary
- Findings logged: **${total}**
- Issues closed during session: **${closedCount}**
- Mean time to resolve (closed items): **${formatHours(mttrHours)}**
- Open follow-ups pushed to GitHub Projects: **${openEntries.length}**

## Severity Distribution
${renderSeverityTable(severityMap)}

## Top Contributors (Score & Closures)
${renderContributorTable(contributorScores)}

## Component Hotspots
${renderComponentTable(componentCounts)}

## Open Follow-Ups
${renderFollowUps(openEntries)}

## Notes
- Export source: ${options.input}
- Generate report with: \`ops/bug-bash/report.ts --input ${options.input} --event "${eventName}" --date ${date}\`
`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const csvContent = await fs.promises.readFile(options.input, "utf8");
  const entries = parseCsv(csvContent);

  if (!entries.length) {
    throw new Error(
      "No records found in CSV; ensure the file has a header row and at least one entry."
    );
  }

  const report = buildReport(options, entries);

  await fs.promises.mkdir(options.outputDir, { recursive: true });
  const outputName =
    sanitizeName(options.eventName || path.basename(options.input, path.extname(options.input))) ||
    "bug-bash";
  const outputPath = path.join(options.outputDir, `${outputName}-report.md`);
  await fs.promises.writeFile(outputPath, report, "utf8");

  // eslint-disable-next-line no-console
  console.log(`Report written to ${outputPath}`);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error.message || error);
  process.exit(1);
});
