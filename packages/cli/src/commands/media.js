"use strict";
/**
 * Summit CLI Media Provenance Commands
 *
 * Provides deterministic media authenticity verification and evidence outputs.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediaCommands = void 0;
/* eslint-disable no-console */
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const provenance_js_1 = require("../media/provenance.js");
const __dirname = node_path_1.default.dirname((0, node_url_1.fileURLToPath)(import.meta.url));
const packagePath = node_path_1.default.resolve(__dirname, '../../package.json');
const packageVersion = JSON.parse(node_fs_1.default.readFileSync(packagePath, 'utf8')).version ?? 'unknown';
function resolveOutputDir(inputPath, outputDir) {
    if (outputDir) {
        return node_path_1.default.resolve(outputDir);
    }
    const resolvedInput = node_path_1.default.resolve(inputPath);
    const relative = node_path_1.default.relative(process.cwd(), resolvedInput);
    return node_path_1.default.join(process.cwd(), 'evidence', 'media', relative);
}
async function runMediaAction(inputPath, outputDir, jsonOutput = false) {
    const resolvedPath = node_path_1.default.resolve(inputPath);
    if (!node_fs_1.default.existsSync(resolvedPath)) {
        throw new Error(`Media file not found: ${inputPath}`);
    }
    const evidence = await (0, provenance_js_1.buildMediaEvidence)({
        inputPath: node_path_1.default.relative(process.cwd(), resolvedPath),
        resolvedPath,
        toolName: 'summit',
        toolVersion: packageVersion,
    });
    const targetDir = resolveOutputDir(resolvedPath, outputDir);
    await (0, provenance_js_1.writeEvidenceArtifacts)(targetDir, evidence);
    if (jsonOutput) {
        console.log(JSON.stringify(evidence.report, null, 2));
        return;
    }
    console.log(chalk_1.default.bold('\nMedia provenance verification complete.'));
    console.log(`Path: ${evidence.report.input.path}`);
    console.log(`SHA-256: ${evidence.report.media.sha256}`);
    console.log(`Size: ${evidence.report.media.sizeBytes} bytes`);
    console.log(`MIME: ${evidence.report.media.mime}`);
    console.log(`Container: ${evidence.report.media.container ?? 'unknown'}`);
    console.log(`Codec: ${evidence.report.media.codec ?? 'unknown'}`);
    console.log(`C2PA: ${evidence.report.provenance.c2pa.status}`);
    console.log(`Evidence directory: ${targetDir}`);
}
const verify = new commander_1.Command('verify')
    .description('Verify media provenance and emit deterministic JSON reports')
    .argument('<path>', 'Path to media asset')
    .option('-o, --output-dir <dir>', 'Output directory for evidence artifacts')
    .option('--json', 'Emit report JSON to stdout', false)
    .action(async (inputPath, options) => {
    await runMediaAction(inputPath, options.outputDir, options.json);
});
const attest = new commander_1.Command('attest')
    .description('Attest media provenance and write evidence artifacts')
    .argument('<path>', 'Path to media asset')
    .option('-o, --output-dir <dir>', 'Output directory for evidence artifacts')
    .option('--json', 'Emit report JSON to stdout', false)
    .action(async (inputPath, options) => {
    await runMediaAction(inputPath, options.outputDir, options.json);
});
exports.mediaCommands = new commander_1.Command('media')
    .description('Media authenticity and provenance commands')
    .addCommand(verify)
    .addCommand(attest);
