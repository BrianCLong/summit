import { promises as fs } from "node:fs";
import path from "node:path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { renderDashboard } from "./dashboard.js";
import { ReplayReport } from "./types.js";

interface Args {
  input: string;
  output?: string;
}

async function loadReport(filePath: string): Promise<ReplayReport> {
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content) as ReplayReport;
}

async function writeOutput(html: string, target?: string): Promise<void> {
  if (!target) {
    process.stdout.write(html);
    return;
  }
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, html, "utf8");
}

export async function main(argv = hideBin(process.argv)): Promise<void> {
  const args = (await yargs(argv)
    .option("input", {
      alias: "i",
      demandOption: true,
      describe: "Path to PDIL replay JSON",
      type: "string",
    })
    .option("output", {
      alias: "o",
      describe: "Optional output HTML path",
      type: "string",
    })
    .strict()
    .help()
    .parse()) as Args;

  const report = await loadReport(args.input);
  const html = renderDashboard(report);
  await writeOutput(html, args.output);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
