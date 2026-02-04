/**
 * Summit CLI Media Provenance Commands
 *
 * Provides deterministic media authenticity verification and evidence outputs.
 */

/* eslint-disable no-console */

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMediaEvidence, writeEvidenceArtifacts } from '../media/provenance.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packagePath = path.resolve(__dirname, '../../package.json');
const packageVersion = JSON.parse(fs.readFileSync(packagePath, 'utf8')).version ?? 'unknown';

function resolveOutputDir(inputPath: string, outputDir?: string): string {
  if (outputDir) {
    return path.resolve(outputDir);
  }
  const resolvedInput = path.resolve(inputPath);
  const relative = path.relative(process.cwd(), resolvedInput);
  return path.join(process.cwd(), 'evidence', 'media', relative);
}

async function runMediaAction(
  inputPath: string,
  outputDir?: string,
  jsonOutput = false,
): Promise<void> {
  const resolvedPath = path.resolve(inputPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Media file not found: ${inputPath}`);
  }

  const evidence = await buildMediaEvidence({
    inputPath: path.relative(process.cwd(), resolvedPath),
    resolvedPath,
    toolName: 'summit',
    toolVersion: packageVersion,
  });

  const targetDir = resolveOutputDir(resolvedPath, outputDir);
  await writeEvidenceArtifacts(targetDir, evidence);

  if (jsonOutput) {
    console.log(JSON.stringify(evidence.report, null, 2));
    return;
  }

  console.log(chalk.bold('\nMedia provenance verification complete.'));
  console.log(`Path: ${evidence.report.input.path}`);
  console.log(`SHA-256: ${evidence.report.media.sha256}`);
  console.log(`Size: ${evidence.report.media.sizeBytes} bytes`);
  console.log(`MIME: ${evidence.report.media.mime}`);
  console.log(`Container: ${evidence.report.media.container ?? 'unknown'}`);
  console.log(`Codec: ${evidence.report.media.codec ?? 'unknown'}`);
  console.log(`C2PA: ${evidence.report.provenance.c2pa.status}`);
  console.log(`Evidence directory: ${targetDir}`);
}

const verify = new Command('verify')
  .description('Verify media provenance and emit deterministic JSON reports')
  .argument('<path>', 'Path to media asset')
  .option('-o, --output-dir <dir>', 'Output directory for evidence artifacts')
  .option('--json', 'Emit report JSON to stdout', false)
  .action(async (inputPath, options) => {
    await runMediaAction(inputPath, options.outputDir, options.json);
  });

const attest = new Command('attest')
  .description('Attest media provenance and write evidence artifacts')
  .argument('<path>', 'Path to media asset')
  .option('-o, --output-dir <dir>', 'Output directory for evidence artifacts')
  .option('--json', 'Emit report JSON to stdout', false)
  .action(async (inputPath, options) => {
    await runMediaAction(inputPath, options.outputDir, options.json);
  });

export const mediaCommands = new Command('media')
  .description('Media authenticity and provenance commands')
  .addCommand(verify)
  .addCommand(attest);
