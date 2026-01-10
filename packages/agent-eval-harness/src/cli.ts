import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { runEvalSuite } from './harness';
import { MockToolProvider } from './provider';
import { loadToolUseMiniSuite } from './suites/toolUseMini';

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return process.argv[index + 1];
}

function resolveSuite(id: string) {
  if (id === 'tool-use-mini') {
    return loadToolUseMiniSuite();
  }
  throw new Error(`Unknown suite: ${id}`);
}

export async function main() {
  const suiteId = getArg('--suite') ?? 'tool-use-mini';
  const reportPath = getArg('--report');
  const suite = resolveSuite(suiteId);
  const provider = new MockToolProvider();

  const report = await runEvalSuite(suite, provider);

  if (reportPath) {
    const outputPath = path.resolve(process.cwd(), reportPath);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  }

  const successPercent = (report.summary.success_rate * 100).toFixed(1);
  const writeLine = (message: string) => {
    process.stdout.write(`${message}\n`);
  };

  writeLine(`Agent evaluation suite: ${suite.id}`);
  writeLine(`Tasks executed: ${report.results.length}`);
  writeLine(`Success rate: ${successPercent}%`);
  writeLine(`Total tool calls: ${report.summary.total_tool_calls}`);
  writeLine(`Mean latency (ms): ${report.summary.mean_latency_ms.toFixed(2)}`);

  if (reportPath) {
    writeLine(`Report written to ${reportPath}`);
  }
}

const entryArg = process.argv[1];
if (entryArg && import.meta.url === pathToFileURL(path.resolve(entryArg)).href) {
  main().catch((error) => {
    process.stderr.write(`${String(error)}\n`);
    process.exitCode = 1;
  });
}
