"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const fs_extra_1 = __importDefault(require("fs-extra"));
const node_path_1 = __importDefault(require("node:path"));
const generator_1 = require("./generator");
const types_1 = require("./types");
const program = new commander_1.Command();
program
    .name("pbs-dashboard")
    .description("Generate a static HTML dashboard for PBS backtest reports")
    .requiredOption("-r, --report <path>", "path to the backtest report JSON")
    .option("-o, --out <path>", "where to write the dashboard HTML", "dist/dashboard.html")
    .option("-R, --recommendation <path>", "optional rollout recommendation to embed");
program.parse(process.argv);
async function main(options) {
    const reportPath = node_path_1.default.resolve(options.report);
    const reportJson = await fs_extra_1.default.readFile(reportPath, "utf-8");
    const report = types_1.reportSchema.parse(JSON.parse(reportJson));
    let recommendation;
    if (options.recommendation) {
        const recPath = node_path_1.default.resolve(options.recommendation);
        recommendation = await fs_extra_1.default.readFile(recPath, "utf-8");
    }
    const html = (0, generator_1.renderDashboard)(report, recommendation);
    const outPath = node_path_1.default.resolve(options.out);
    await fs_extra_1.default.ensureDir(node_path_1.default.dirname(outPath));
    await fs_extra_1.default.writeFile(outPath, html, "utf-8");
    // eslint-disable-next-line no-console
    console.log(`Dashboard written to ${outPath}`);
}
main(program.opts()).catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
