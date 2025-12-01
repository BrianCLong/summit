import { Command } from "commander";
import fs from "fs-extra";
import path from "node:path";
import { renderDashboard } from "./generator";
import { reportSchema } from "./types";

const program = new Command();

program
  .name("pbs-dashboard")
  .description("Generate a static HTML dashboard for PBS backtest reports")
  .requiredOption("-r, --report <path>", "path to the backtest report JSON")
  .option("-o, --out <path>", "where to write the dashboard HTML", "dist/dashboard.html")
  .option("-R, --recommendation <path>", "optional rollout recommendation to embed");

program.parse(process.argv);

interface Options {
  report: string;
  out: string;
  recommendation?: string;
}

async function main(options: Options) {
  const reportPath = path.resolve(options.report);
  const reportJson = await fs.readFile(reportPath, "utf-8");
  const report = reportSchema.parse(JSON.parse(reportJson));

  let recommendation: string | undefined;
  if (options.recommendation) {
    const recPath = path.resolve(options.recommendation);
    recommendation = await fs.readFile(recPath, "utf-8");
  }

  const html = renderDashboard(report, recommendation);
  const outPath = path.resolve(options.out);
  await fs.ensureDir(path.dirname(outPath));
  await fs.writeFile(outPath, html, "utf-8");
  // eslint-disable-next-line no-console
  console.log(`Dashboard written to ${outPath}`);
}

main(program.opts<Options>()).catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
