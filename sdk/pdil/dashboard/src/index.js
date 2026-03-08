"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const yargs_1 = __importDefault(require("yargs"));
const helpers_1 = require("yargs/helpers");
const dashboard_js_1 = require("./dashboard.js");
async function loadReport(filePath) {
    const content = await node_fs_1.promises.readFile(filePath, "utf8");
    return JSON.parse(content);
}
async function writeOutput(html, target) {
    if (!target) {
        process.stdout.write(html);
        return;
    }
    await node_fs_1.promises.mkdir(node_path_1.default.dirname(target), { recursive: true });
    await node_fs_1.promises.writeFile(target, html, "utf8");
}
async function main(argv = (0, helpers_1.hideBin)(process.argv)) {
    const args = (await (0, yargs_1.default)(argv)
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
        .parse());
    const report = await loadReport(args.input);
    const html = (0, dashboard_js_1.renderDashboard)(report);
    await writeOutput(html, args.output);
}
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
