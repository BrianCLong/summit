import fs from 'node:fs';
import path from 'node:path';
import { runEvalSuite } from './harness';
import { MockToolProvider } from './provider';
import { loadToolUseMiniSuite } from './suites/toolUseMini';

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
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
  console.log(`Agent evaluation suite: ${suite.id}`);
  console.log(`Tasks executed: ${report.results.length}`);
  console.log(`Success rate: ${successPercent}%`);
  console.log(`Total tool calls: ${report.summary.total_tool_calls}`);
  console.log(`Mean latency (ms): ${report.summary.mean_latency_ms.toFixed(2)}`);

  if (reportPath) {
    console.log(`Report written to ${reportPath}`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('cli.ts')) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
