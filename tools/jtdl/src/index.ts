import { Command } from 'commander';
import { writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { buildImpactReport, resolveRepoRoot } from './report.js';
import { buildPrComment } from './pr-comment.js';
import { verifySignature } from './signature.js';
import { stableStringify } from './stable-stringify.js';
import { ImpactReport } from './types.js';

const DEFAULT_SIGNING_KEY =
  process.env.JTDL_SIGNING_KEY ?? 'summit-jtdl-dev-secret';
const DEFAULT_KEY_ID = process.env.JTDL_KEY_ID ?? 'summit-jtdl-dev';

const program = new Command();
program.name('jtdl');
program.description('Jurisdictional Taxonomy Diff Linter');
program.showHelpAfterError();

program
  .command('lint')
  .description('Detect hotspots created by taxonomy drift')
  .requiredOption('--baseline <path>', 'Baseline taxonomy JSON')
  .requiredOption('--updated <path>', 'Updated taxonomy JSON')
  .option('--repo <path>', 'Repository root to scan', process.cwd())
  .option('--output <path>', 'File path for the signed impact report')
  .option('--pr-comment <path>', 'File path for PR-ready markdown summary')
  .option('--key <value>', 'Signing secret used to sign the report')
  .option('--key-id <value>', 'Identifier for the signing secret')
  .action(async (options) => {
    const repoRoot = resolveRepoRoot(options.repo);
    const signingKey = options.key ?? DEFAULT_SIGNING_KEY;
    const keyId = options.keyId ?? DEFAULT_KEY_ID;

    const report = await buildImpactReport({
      baselinePath: path.resolve(options.baseline),
      updatedPath: path.resolve(options.updated),
      repoRoot,
      signingKey,
      keyId,
    });

    const uniqueDataClasses = new Set(
      report.hotspots.map((item) => item.dataClassId),
    );
    console.log(
      `JTDL impact diff: ${report.hotspots.length} hotspots across ${uniqueDataClasses.size} data classes.`,
    );
    if (report.hotspots.length > 0) {
      for (const hotspot of report.hotspots) {
        console.log(
          ` - [${hotspot.scope}] ${hotspot.dataClassId}: ${hotspot.reason} (${hotspot.matches.length} matches)`,
        );
      }
    } else {
      console.log('No hotspots detected.');
    }

    if (options.output) {
      await writeFile(options.output, stableStringify(report));
      console.log(`Signed impact report written to ${options.output}`);
    }

    const prComment = buildPrComment(report);
    if (options.prComment) {
      await writeFile(options.prComment, prComment, 'utf-8');
      console.log(`PR comment written to ${options.prComment}`);
    } else {
      console.log('\n--- PR Comment Preview ---');
      console.log(prComment);
      console.log('--- end preview ---');
    }
  });

program
  .command('verify')
  .description('Verify a signed impact report produced by JTDL')
  .requiredOption('--report <path>', 'Path to a signed impact report JSON file')
  .option('--key <value>', 'Signing secret used when the report was generated')
  .action(async (options) => {
    const signingKey = options.key ?? DEFAULT_SIGNING_KEY;
    const raw = await readFile(path.resolve(options.report), 'utf-8');
    const report = JSON.parse(raw) as ImpactReport;
    const { signature, ...payload } = report;
    if (!signature) {
      throw new Error('Report is missing signature metadata.');
    }
    const valid = verifySignature(payload, signature, signingKey);
    if (valid) {
      console.log(`Signature verified for key ${signature.keyId}.`);
    } else {
      console.error('Signature verification failed.');
      process.exitCode = 1;
    }
  });

program.parseAsync().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
