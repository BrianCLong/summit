import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { tmpdir } from "os";

interface CliOptions {
  iterations: number;
  command: string;
  pattern?: string;
  outputDir: string;
}

interface AssertionResult {
  fullName: string;
  status: "passed" | "failed" | "pending" | "skipped" | string;
  ancestorTitles?: string[];
  title?: string;
}

interface TestResultFile {
  name: string;
  assertionResults: AssertionResult[];
}

interface JestJsonOutput {
  testResults?: TestResultFile[];
}

interface AggregatedTestResult {
  id: string;
  file: string;
  name: string;
  passes: number;
  failures: number;
  iterations: number;
  flaky: boolean;
  failureRate: number;
}

interface ReportPayload {
  metadata: {
    iterations: number;
    command: string;
    pattern?: string;
    startedAt: string;
    finishedAt: string;
    outputDir: string;
  };
  iterations: {
    index: number;
    exitCode: number | null;
    durationMs: number;
    outputFile?: string;
  }[];
  tests: AggregatedTestResult[];
  flakyTests: AggregatedTestResult[];
  topOffenders: AggregatedTestResult[];
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\$&");

const parseArgs = (): CliOptions => {
  const args = process.argv.slice(2);
  const options: Partial<CliOptions> = {};

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--iterations" && args[i + 1]) {
      options.iterations = Number(args[i + 1]);
      i += 1;
    } else if (arg === "--command" && args[i + 1]) {
      options.command = args[i + 1];
      i += 1;
    } else if (arg === "--pattern" && args[i + 1]) {
      options.pattern = args[i + 1];
      i += 1;
    } else if (arg === "--outputDir" && args[i + 1]) {
      options.outputDir = args[i + 1];
      i += 1;
    }
  }

  return {
    iterations: options.iterations && options.iterations > 0 ? options.iterations : 10,
    command: options.command || "pnpm exec jest",
    pattern: options.pattern,
    outputDir: options.outputDir || "reports",
  };
};

const readJestOutput = async (outputFile: string): Promise<JestJsonOutput | null> => {
  if (!existsSync(outputFile)) {
    return null;
  }

  const content = await readFile(outputFile, "utf8");
  try {
    return JSON.parse(content) as JestJsonOutput;
  } catch (error) {
    console.warn(`Failed to parse JSON from ${outputFile}: ${(error as Error).message}`);
    return null;
  }
};

const collectResults = (json: JestJsonOutput, summary: Map<string, AggregatedTestResult>) => {
  const results = json.testResults || [];
  results.forEach((fileResult) => {
    fileResult.assertionResults.forEach((assertion) => {
      const id = `${fileResult.name}::${assertion.fullName}`;
      const current = summary.get(id) || {
        id,
        file: fileResult.name,
        name: assertion.fullName,
        passes: 0,
        failures: 0,
        iterations: 0,
        flaky: false,
        failureRate: 0,
      };

      current.iterations += 1;
      if (assertion.status === "passed") {
        current.passes += 1;
      } else if (assertion.status === "failed") {
        current.failures += 1;
      }

      summary.set(id, current);
    });
  });
};

const buildReport = (
  summary: Map<string, AggregatedTestResult>,
  metadata: ReportPayload["metadata"]
): ReportPayload => {
  const tests: AggregatedTestResult[] = [];
  const flakyTests: AggregatedTestResult[] = [];

  summary.forEach((result) => {
    const totalRuns = result.passes + result.failures;
    const failureRate = totalRuns === 0 ? 0 : result.failures / totalRuns;
    const enhanced: AggregatedTestResult = {
      ...result,
      iterations: totalRuns,
      flaky: result.passes > 0 && result.failures > 0,
      failureRate,
    };

    tests.push(enhanced);
    if (enhanced.flaky) {
      flakyTests.push(enhanced);
    }
  });

  const topOffenders = [...flakyTests]
    .sort((a, b) => b.failureRate - a.failureRate || b.failures - a.failures)
    .slice(0, 10);

  return {
    metadata,
    iterations: [],
    tests: tests.sort((a, b) => b.failureRate - a.failureRate),
    flakyTests,
    topOffenders,
  };
};

const main = async () => {
  const options = parseArgs();
  const startedAt = new Date().toISOString();
  const summary = new Map<string, AggregatedTestResult>();
  const iterations: ReportPayload["iterations"] = [];

  await mkdir(options.outputDir, { recursive: true });

  for (let i = 0; i < options.iterations; i += 1) {
    const outputFile = path.join(tmpdir(), `flaky-run-${Date.now()}-${i}.json`);
    const patternFlag = options.pattern
      ? ` --testNamePattern="${escapeRegex(options.pattern)}"`
      : "";
    const command = `${options.command} --json --outputFile="${outputFile}" --runInBand --testLocationInResults${patternFlag}`;

    console.log(`\n[flaky-scan] Iteration ${i + 1}/${options.iterations}`);
    const started = Date.now();
    const result = spawnSync(command, { shell: true, stdio: "inherit" });
    const durationMs = Date.now() - started;
    iterations.push({ index: i + 1, exitCode: result.status, durationMs, outputFile });

    const json = await readJestOutput(outputFile);
    if (json) {
      collectResults(json, summary);
    }
  }

  const finishedAt = new Date().toISOString();
  const metadata: ReportPayload["metadata"] = {
    iterations: options.iterations,
    command: options.command,
    pattern: options.pattern,
    startedAt,
    finishedAt,
    outputDir: options.outputDir,
  };

  const report = buildReport(summary, metadata);
  report.iterations = iterations;

  const timestamp = finishedAt.replace(/[:.]/g, "-");
  const reportPath = path.join(options.outputDir, `flaky-tests-${timestamp}.json`);
  await writeFile(reportPath, JSON.stringify(report, null, 2));

  if (report.flakyTests.length === 0) {
    console.log(`No flaky tests detected across ${options.iterations} iterations.`);
  } else {
    console.log("\nFlaky tests detected:");
    report.topOffenders.forEach((test, index) => {
      const rate = (test.failureRate * 100).toFixed(1);
      console.log(`${index + 1}. ${test.name} (${test.file}) - failure rate ${rate}%`);
    });
  }

  console.log(`\nReport written to ${reportPath}`);
};

main().catch((error) => {
  console.error("[flaky-scan] Failed to execute detection", error);
  process.exit(1);
});
