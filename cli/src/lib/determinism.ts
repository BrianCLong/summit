/**
 * Determinism Harness Module
 *
 * Provides a deterministic test harness that:
 * - Runs a CLI command N times
 * - Verifies byte-identical output across runs
 * - Emits evidence artifacts for PR documentation
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { spawn, SpawnOptions } from "child_process";

/**
 * Exit codes for determinism harness
 */
export const DETERMINISM_EXIT_CODES = {
  SUCCESS: 0,
  UNEXPECTED_ERROR: 1,
  MISMATCH: 2,
} as const;

/**
 * Hash algorithms supported
 */
export type HashAlgorithm = "sha256" | "sha512" | "md5";

/**
 * Determinism harness options
 */
export interface DeterminismOptions {
  /** Number of runs (default: 3) */
  runs: number;
  /** Output directory for evidence (default: .claude/determinism/<id>/) */
  outputDir?: string;
  /** Fail on first mismatch (default: true) */
  failFast: boolean;
  /** Hash algorithm (default: sha256) */
  hashAlgo: HashAlgorithm;
  /** Include full stdout in evidence (default: false) */
  includeStdout: boolean;
  /** Package name to run tests for (optional) */
  packageName?: string;
  /** Require package tests to pass (default: false) */
  requireTestsPass: boolean;
  /** Include timestamps in output (default: false) */
  includeTimestamps: boolean;
  /** Working directory */
  cwd?: string;
}

/**
 * Default options
 */
export const DEFAULT_DETERMINISM_OPTIONS: DeterminismOptions = {
  runs: 3,
  failFast: true,
  hashAlgo: "sha256",
  includeStdout: false,
  requireTestsPass: false,
  includeTimestamps: false,
};

/**
 * Result of a single run
 */
export interface RunResult {
  runNumber: number;
  stdout: string;
  stderr: string;
  exitCode: number;
  hash: string;
  durationMs: number | null;
}

/**
 * Package test result
 */
export interface PackageTestResult {
  name: string;
  runs: number;
  passes: number;
  failures: number;
  results: Array<{
    runNumber: number;
    passed: boolean;
    exitCode: number;
  }>;
}

/**
 * Evidence artifact schema
 */
export interface EvidenceArtifact {
  v: 1;
  runs: number;
  command: string;
  hash_algo: HashAlgorithm;
  hashes: string[];
  match: boolean;
  env: {
    tz: string;
    locale: string;
  };
  package_test: {
    name: string;
    runs: number;
    passes: number;
  } | null;
}

/**
 * Determinism harness result
 */
export interface DeterminismResult {
  success: boolean;
  match: boolean;
  runs: RunResult[];
  hashes: string[];
  firstMismatchRun?: number;
  packageTest: PackageTestResult | null;
  evidenceDir: string;
}

/**
 * Generate a deterministic session ID (no timestamps)
 */
export function generateDeterministicId(command: string, runs: number): string {
  const hash = crypto.createHash("sha256");
  hash.update(`${command}:${runs}:${process.pid}`);
  return `det-${hash.digest("hex").slice(0, 12)}`;
}

/**
 * Compute hash of content
 */
export function computeHash(content: string, algo: HashAlgorithm): string {
  return crypto.createHash(algo).update(content, "utf8").digest("hex");
}

/**
 * Get deterministic environment variables
 */
export function getDeterministicEnv(): Record<string, string> {
  return {
    ...process.env,
    TZ: "UTC",
    LC_ALL: "C",
    LANG: "C",
    // Ensure no color codes
    NO_COLOR: "1",
    FORCE_COLOR: "0",
    // CI mode for consistent behavior
    CI: "true",
  } as Record<string, string>;
}

/**
 * Run a command and capture output
 */
export async function runCommand(
  command: string,
  args: string[],
  options: { cwd?: string; env?: Record<string, string> }
): Promise<{ stdout: string; stderr: string; exitCode: number; durationMs: number }> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const proc = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      env: options.env || getDeterministicEnv(),
      shell: false,
    } as SpawnOptions);

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("error", (error) => {
      reject(error);
    });

    proc.on("close", (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 1,
        durationMs: Date.now() - startTime,
      });
    });
  });
}

/**
 * Canonicalize JSON for stable comparison
 */
export function canonicalizeJson(jsonString: string): string {
  try {
    const parsed = JSON.parse(jsonString);
    return JSON.stringify(sortObjectKeys(parsed), null, 2);
  } catch {
    // If not valid JSON, return as-is
    return jsonString;
  }
}

/**
 * Sort object keys recursively for deterministic output
 */
function sortObjectKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  if (obj !== null && typeof obj === "object") {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    for (const key of keys) {
      sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return obj;
}

/**
 * Find first differing key between two JSON objects
 */
export function findFirstDiff(
  json1: string,
  json2: string
): { path: string; value1: unknown; value2: unknown } | null {
  try {
    const obj1 = JSON.parse(json1);
    const obj2 = JSON.parse(json2);
    return findDiffRecursive(obj1, obj2, "");
  } catch {
    // Not valid JSON
    if (json1 !== json2) {
      return { path: "<root>", value1: json1.slice(0, 100), value2: json2.slice(0, 100) };
    }
    return null;
  }
}

function findDiffRecursive(
  obj1: unknown,
  obj2: unknown,
  currentPath: string
): { path: string; value1: unknown; value2: unknown } | null {
  if (typeof obj1 !== typeof obj2) {
    return { path: currentPath || "<root>", value1: obj1, value2: obj2 };
  }

  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) {
      return {
        path: `${currentPath}.length`,
        value1: obj1.length,
        value2: obj2.length,
      };
    }
    for (let i = 0; i < obj1.length; i++) {
      const diff = findDiffRecursive(obj1[i], obj2[i], `${currentPath}[${i}]`);
      if (diff) return diff;
    }
    return null;
  }

  if (obj1 !== null && typeof obj1 === "object" && obj2 !== null && typeof obj2 === "object") {
    const keys1 = Object.keys(obj1 as Record<string, unknown>).sort();
    const keys2 = Object.keys(obj2 as Record<string, unknown>).sort();

    if (keys1.length !== keys2.length || keys1.some((k, i) => k !== keys2[i])) {
      return {
        path: `${currentPath}.<keys>`,
        value1: keys1,
        value2: keys2,
      };
    }

    for (const key of keys1) {
      const newPath = currentPath ? `${currentPath}.${key}` : key;
      const diff = findDiffRecursive(
        (obj1 as Record<string, unknown>)[key],
        (obj2 as Record<string, unknown>)[key],
        newPath
      );
      if (diff) return diff;
    }
    return null;
  }

  if (obj1 !== obj2) {
    return { path: currentPath || "<root>", value1: obj1, value2: obj2 };
  }

  return null;
}

/**
 * Generate diff.md content for mismatched runs
 */
export function generateDiffMarkdown(runs: RunResult[], firstMismatchRun: number): string {
  const lines: string[] = [
    "# Determinism Mismatch Report",
    "",
    `## First Mismatch`,
    "",
    `Run ${firstMismatchRun} differs from Run 1.`,
    "",
  ];

  const run1 = runs[0];
  const mismatchRun = runs[firstMismatchRun - 1];

  if (run1 && mismatchRun) {
    lines.push("## Hashes");
    lines.push("");
    lines.push(`- Run 1: \`${run1.hash}\``);
    lines.push(`- Run ${firstMismatchRun}: \`${mismatchRun.hash}\``);
    lines.push("");

    const diff = findFirstDiff(run1.stdout, mismatchRun.stdout);
    if (diff) {
      lines.push("## First Differing Key");
      lines.push("");
      lines.push(`Path: \`${diff.path}\``);
      lines.push("");
      lines.push("Run 1 value:");
      lines.push("```json");
      lines.push(JSON.stringify(diff.value1, null, 2));
      lines.push("```");
      lines.push("");
      lines.push(`Run ${firstMismatchRun} value:`);
      lines.push("```json");
      lines.push(JSON.stringify(diff.value2, null, 2));
      lines.push("```");
    }
  }

  return lines.join("\n");
}

/**
 * Generate evidence.json content
 */
export function generateEvidenceJson(
  command: string,
  options: DeterminismOptions,
  result: DeterminismResult
): EvidenceArtifact {
  return {
    v: 1,
    runs: options.runs,
    command,
    hash_algo: options.hashAlgo,
    hashes: result.hashes,
    match: result.match,
    env: {
      tz: "UTC",
      locale: "C",
    },
    package_test: result.packageTest
      ? {
          name: result.packageTest.name,
          runs: result.packageTest.runs,
          passes: result.packageTest.passes,
        }
      : null,
  };
}

/**
 * Generate evidence.md content
 */
export function generateEvidenceMarkdown(
  command: string,
  options: DeterminismOptions,
  result: DeterminismResult
): string {
  const lines: string[] = [
    "# Determinism Evidence",
    "",
    "## Command",
    "",
    "```",
    command,
    "```",
    "",
    "## Results",
    "",
    `- **Runs**: ${options.runs}`,
    `- **Match**: ${result.match ? "Yes" : "No"}`,
    `- **Hash Algorithm**: ${options.hashAlgo}`,
    "",
    "## Hashes",
    "",
  ];

  for (let i = 0; i < result.hashes.length; i++) {
    const status = i === 0 || result.hashes[i] === result.hashes[0] ? "✓" : "✗";
    lines.push(`${i + 1}. \`${result.hashes[i]}\` ${status}`);
  }

  if (result.packageTest) {
    lines.push("");
    lines.push("## Package Tests");
    lines.push("");
    lines.push(`- **Package**: ${result.packageTest.name}`);
    lines.push(`- **Runs**: ${result.packageTest.runs}`);
    lines.push(`- **Passes**: ${result.packageTest.passes}/${result.packageTest.runs}`);
  }

  lines.push("");

  return lines.join("\n");
}

/**
 * Stable JSON stringify with sorted keys
 */
function stableStringify(obj: unknown): string {
  return JSON.stringify(sortObjectKeys(obj), null, 2);
}

/**
 * Write evidence artifacts to output directory
 */
export function writeEvidenceArtifacts(
  outputDir: string,
  command: string,
  options: DeterminismOptions,
  result: DeterminismResult
): void {
  // Ensure output directory exists
  fs.mkdirSync(outputDir, { recursive: true });

  // Write evidence.json with sorted keys for determinism
  const evidenceJson = generateEvidenceJson(command, options, result);
  fs.writeFileSync(path.join(outputDir, "evidence.json"), stableStringify(evidenceJson) + "\n");

  // Write evidence.md
  const evidenceMd = generateEvidenceMarkdown(command, options, result);
  fs.writeFileSync(path.join(outputDir, "evidence.md"), evidenceMd);

  // Write diff.md if mismatch
  if (!result.match && result.firstMismatchRun !== undefined) {
    const diffMd = generateDiffMarkdown(result.runs, result.firstMismatchRun);
    fs.writeFileSync(path.join(outputDir, "diff.md"), diffMd);
  }

  // Write per-run outputs if requested or on mismatch
  if (options.includeStdout || !result.match) {
    for (const run of result.runs) {
      const canonical = canonicalizeJson(run.stdout);
      fs.writeFileSync(path.join(outputDir, `run-${run.runNumber}.json`), canonical + "\n");
    }
  }
}

/**
 * Run package tests N times
 */
export async function runPackageTests(
  packageName: string,
  runs: number,
  options: { cwd?: string }
): Promise<PackageTestResult> {
  const results: PackageTestResult["results"] = [];
  let passes = 0;

  for (let i = 1; i <= runs; i++) {
    const { exitCode } = await runCommand("pnpm", ["-w", "test", "-F", packageName], {
      cwd: options.cwd,
      env: getDeterministicEnv(),
    });
    const passed = exitCode === 0;
    if (passed) passes++;
    results.push({ runNumber: i, passed, exitCode });
  }

  return {
    name: packageName,
    runs,
    passes,
    failures: runs - passes,
    results,
  };
}

/**
 * Main determinism harness function
 */
export async function runDeterminismHarness(
  command: string,
  args: string[],
  options: Partial<DeterminismOptions> = {}
): Promise<DeterminismResult> {
  const opts: DeterminismOptions = { ...DEFAULT_DETERMINISM_OPTIONS, ...options };

  // Generate output directory
  const id = generateDeterministicId(`${command} ${args.join(" ")}`, opts.runs);
  const outputDir = opts.outputDir || path.join(process.cwd(), ".claude", "determinism", id);

  // Force deterministic flags
  const deterministicArgs = [...args];
  if (!deterministicArgs.includes("--output")) {
    deterministicArgs.push("--output", "json");
  }
  if (!deterministicArgs.includes("--ci")) {
    deterministicArgs.push("--ci");
  }

  const runs: RunResult[] = [];
  const hashes: string[] = [];
  let firstMismatchRun: number | undefined;
  let match = true;

  // Run command N times
  for (let i = 1; i <= opts.runs; i++) {
    const result = await runCommand(command, deterministicArgs, {
      cwd: opts.cwd,
      env: getDeterministicEnv(),
    });

    const canonical = canonicalizeJson(result.stdout);
    const hash = computeHash(canonical, opts.hashAlgo);

    const runResult: RunResult = {
      runNumber: i,
      stdout: canonical,
      stderr: result.stderr,
      exitCode: result.exitCode,
      hash,
      durationMs: opts.includeTimestamps ? result.durationMs : null,
    };

    runs.push(runResult);
    hashes.push(hash);

    // Check for mismatch
    if (i > 1 && hash !== hashes[0]) {
      match = false;
      if (firstMismatchRun === undefined) {
        firstMismatchRun = i;
      }
      if (opts.failFast) {
        break;
      }
    }
  }

  // Run package tests if specified
  let packageTest: PackageTestResult | null = null;
  if (opts.packageName) {
    packageTest = await runPackageTests(opts.packageName, opts.runs, {
      cwd: opts.cwd,
    });
  }

  const result: DeterminismResult = {
    success:
      match && (!opts.requireTestsPass || !packageTest || packageTest.passes === packageTest.runs),
    match,
    runs,
    hashes,
    firstMismatchRun,
    packageTest,
    evidenceDir: outputDir,
  };

  // Write evidence artifacts
  writeEvidenceArtifacts(outputDir, `${command} ${deterministicArgs.join(" ")}`, opts, result);

  return result;
}

/**
 * Create determinism harness with options
 */
export function createDeterminismHarness(options: Partial<DeterminismOptions> = {}) {
  return {
    run: (command: string, args: string[]) => runDeterminismHarness(command, args, options),
    options: { ...DEFAULT_DETERMINISM_OPTIONS, ...options },
  };
}
