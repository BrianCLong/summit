import { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

interface FlakyTestRecord {
  id: string;
  file: string;
  name: string;
  symptoms?: string;
  owner?: string;
  status: "quarantined" | "fixing" | "resolved";
  lastSeen: string;
  notes?: string;
}

interface FlakyReport {
  flakyTests?: {
    id: string;
    file: string;
    name: string;
    failureRate?: number;
  }[];
}

interface CliOptions {
  input?: string;
  tests: string[];
  owner?: string;
  symptoms?: string;
  status: FlakyTestRecord["status"];
  metadataPath: string;
  applyTags: boolean;
}

const loadMetadata = async (metadataPath: string): Promise<FlakyTestRecord[]> => {
  if (!existsSync(metadataPath)) {
    return [];
  }

  const content = await readFile(metadataPath, "utf8");
  try {
    const parsed = JSON.parse(content) as { tests?: FlakyTestRecord[] };
    return parsed.tests || [];
  } catch (error) {
    console.warn(
      `[quarantine] Unable to parse metadata at ${metadataPath}: ${(error as Error).message}`
    );
    return [];
  }
};

const persistMetadata = async (metadataPath: string, tests: FlakyTestRecord[]) => {
  const payload = { tests };
  await mkdir(path.dirname(metadataPath), { recursive: true });
  await writeFile(metadataPath, JSON.stringify(payload, null, 2));
};

const parseReport = async (reportPath?: string): Promise<FlakyTestRecord[]> => {
  if (!reportPath) {
    return [];
  }

  if (!existsSync(reportPath)) {
    console.warn(`[quarantine] Report not found at ${reportPath}`);
    return [];
  }

  const content = await readFile(reportPath, "utf8");
  try {
    const parsed = JSON.parse(content) as FlakyReport;
    return (parsed.flakyTests || []).map((test) => ({
      id: test.id,
      file: test.file,
      name: test.name,
      status: "quarantined",
      lastSeen: new Date().toISOString(),
    }));
  } catch (error) {
    console.warn(
      `[quarantine] Unable to parse report at ${reportPath}: ${(error as Error).message}`
    );
    return [];
  }
};

const extractTestsFromArgs = (tests: string[]): FlakyTestRecord[] =>
  tests.filter(Boolean).map((entry) => {
    const [file, ...nameParts] = entry.split("::");
    return {
      id: entry,
      file,
      name: nameParts.join("::") || entry,
      status: "quarantined" as const,
      lastSeen: new Date().toISOString(),
    };
  });

const parseArgs = (): CliOptions => {
  const args = process.argv.slice(2);
  const tests: string[] = [];
  const options: Partial<CliOptions> = { applyTags: false, status: "quarantined" };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--input" && args[i + 1]) {
      options.input = args[i + 1];
      i += 1;
    } else if (arg === "--test" && args[i + 1]) {
      tests.push(args[i + 1]);
      i += 1;
    } else if (arg === "--owner" && args[i + 1]) {
      options.owner = args[i + 1];
      i += 1;
    } else if (arg === "--symptoms" && args[i + 1]) {
      options.symptoms = args[i + 1];
      i += 1;
    } else if (arg === "--status" && args[i + 1]) {
      const status = args[i + 1] as FlakyTestRecord["status"];
      options.status = status;
      i += 1;
    } else if (arg === "--metadata" && args[i + 1]) {
      options.metadataPath = args[i + 1];
      i += 1;
    } else if (arg === "--applyTags") {
      options.applyTags = true;
    }
  }

  return {
    input: options.input,
    tests,
    owner: options.owner,
    symptoms: options.symptoms,
    status: options.status || "quarantined",
    metadataPath: options.metadataPath || path.join("testing", "flaky-metadata.json"),
    applyTags: Boolean(options.applyTags),
  };
};

const findTestInsertionPoint = (content: string, testName: string) => {
  const nameIndex = content.indexOf(testName);
  if (nameIndex === -1) {
    return null;
  }

  const startOfLine = content.lastIndexOf("\n", nameIndex) + 1;
  return startOfLine;
};

const tagTestInFile = async (filePath: string, testName: string) => {
  if (!existsSync(filePath)) {
    console.warn(`[quarantine] Unable to tag test; file not found: ${filePath}`);
    return;
  }

  const content = await readFile(filePath, "utf8");
  if (content.includes("@flaky") && content.includes(testName)) {
    return;
  }

  const insertionIndex = findTestInsertionPoint(content, testName);
  if (insertionIndex === null) {
    console.warn(`[quarantine] Could not find test declaration for "${testName}" in ${filePath}`);
    return;
  }

  const before = content.slice(0, insertionIndex);
  const indentMatch = before.slice(before.lastIndexOf("\n") + 1).match(/^[ \t]*/);
  const indent = indentMatch?.[0] || "";
  const taggedContent = `${before}// @flaky\n${indent}${content.slice(insertionIndex)}`;
  await writeFile(filePath, taggedContent);
};

const mergeRecords = (
  existing: FlakyTestRecord[],
  incoming: FlakyTestRecord[],
  defaults: Omit<FlakyTestRecord, "id" | "file" | "name" | "lastSeen">
) => {
  const lookup = new Map<string, FlakyTestRecord>();
  existing.forEach((record) => lookup.set(record.id, record));

  incoming.forEach((record) => {
    const prior = lookup.get(record.id);
    const next: FlakyTestRecord = {
      ...prior,
      ...record,
      symptoms: record.symptoms || prior?.symptoms || defaults.symptoms,
      owner: record.owner || prior?.owner || defaults.owner,
      status: (record.status || prior?.status || defaults.status) as FlakyTestRecord["status"],
      lastSeen: record.lastSeen || prior?.lastSeen || new Date().toISOString(),
      notes: record.notes || prior?.notes,
    };

    lookup.set(record.id, next);
  });

  return Array.from(lookup.values()).sort(
    (a, b) => a.file.localeCompare(b.file) || a.name.localeCompare(b.name)
  );
};

const main = async () => {
  const options = parseArgs();
  const defaults = {
    symptoms: options.symptoms,
    owner: options.owner,
    status: options.status,
  } as const;

  const metadata = await loadMetadata(options.metadataPath);
  const reported = await parseReport(options.input);
  const manual = extractTestsFromArgs(options.tests);
  const candidates = [...reported, ...manual];

  if (candidates.length === 0) {
    console.log("[quarantine] No tests provided to quarantine.");
    return;
  }

  const merged = mergeRecords(metadata, candidates, defaults);
  await persistMetadata(options.metadataPath, merged);

  if (options.applyTags) {
    for (const test of candidates) {
      await tagTestInFile(test.file, test.name);
    }
  }

  console.log(
    `[quarantine] Updated metadata at ${options.metadataPath} with ${candidates.length} test(s).`
  );
};

main().catch((error) => {
  console.error("[quarantine] Failed to update quarantine metadata", error);
  process.exit(1);
});
