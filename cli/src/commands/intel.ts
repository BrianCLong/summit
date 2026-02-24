import { Command } from 'commander';
import {
  buildEvidence,
  buildReport,
  loadSignalItem,
  stableStringify,
  writeArtifacts,
  writeBaselineArtifacts,
} from '../intel/signal-pack.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
);

function resolveArtifactPath(itemId: string, filename: string): string {
  return path.join(REPO_ROOT, 'artifacts', 'intel', itemId, filename);
}

function resolveBaselinePath(itemId: string, filename: string): string {
  return path.join(
    REPO_ROOT,
    'intel',
    'items',
    itemId,
    'baseline',
    filename,
  );
}

export function registerIntelCommands(program: Command): void {
  const intel = program.command('intel').description('Competitor signal packs');

  intel
    .command('ingest')
    .description('Ingest a competitor signal pack into deterministic artifacts')
    .requiredOption('--item <itemId>', 'Item slug to ingest')
    .option(
      '--source <source>',
      'Source filter (techcrunch, reddit_ir, all)',
      'all',
    )
    .option('--update-baseline', 'Write artifacts into the baseline store', false)
    .action(async (options) => {
      const enable = process.env.INTEL_ENABLE_INGEST === '1';
      if (!enable) {
        throw new Error(
          'INTEL_ENABLE_INGEST=1 is required to run competitor signal ingestion.',
        );
      }

      const item = await loadSignalItem(options.item);
      const report = buildReport(item, options.source);
      const evidence = buildEvidence(item);
      const paths = await writeArtifacts(options.item, report, evidence);
      if (options.updateBaseline) {
        await writeBaselineArtifacts(options.item, report, evidence);
      }
      console.log(stableStringify(paths));
    });

  intel
    .command('drift')
    .description('Compare current signals to the stored baseline report')
    .requiredOption('--item <itemId>', 'Item slug to analyze')
    .option(
      '--source <source>',
      'Source filter (techcrunch, reddit_ir, all)',
      'all',
    )
    .action(async (options) => {
      const item = await loadSignalItem(options.item);
      const currentReport = buildReport(item, options.source);
      const baselinePath = resolveBaselinePath(options.item, 'report.json');
      const driftPath = resolveArtifactPath(options.item, 'drift.json');
      const currentPath = resolveArtifactPath(options.item, 'report.current.json');

      await fs.mkdir(path.dirname(driftPath), { recursive: true });

      let baseline: unknown;
      try {
        const raw = await fs.readFile(baselinePath, 'utf-8');
        baseline = JSON.parse(raw);
      } catch (error) {
        const payload = {
          status: 'no_baseline',
          material: true,
          baseline_path: baselinePath,
        };
        await fs.writeFile(driftPath, `${stableStringify(payload)}\n`, 'utf-8');
        console.log(stableStringify(payload));
        process.exitCode = 2;
        return;
      }

      await fs.writeFile(
        currentPath,
        `${stableStringify(currentReport)}\n`,
        'utf-8',
      );

      const material =
        stableStringify((baseline as { signals?: unknown }).signals) !==
        stableStringify(currentReport.signals);

      const payload = {
        status: 'ok',
        material,
        baseline_path: baselinePath,
        current_path: currentPath,
        diff_hint: material ? 'signals_changed' : 'none',
      };

      await fs.writeFile(driftPath, `${stableStringify(payload)}\n`, 'utf-8');
      console.log(stableStringify(payload));
      process.exitCode = material ? 1 : 0;
    });
}
