/**
 * Switchboard Commands
 */

import * as path from 'path';
import { Command } from 'commander';
import { detectRepoRoot } from '../lib/sandbox.js';
import { runCapsule } from '../lib/switchboard-runner.js';
import { generateEvidenceBundle } from '../lib/switchboard-evidence.js';
import { replayCapsule } from '../lib/switchboard-replay.js';
import { ActionReceiptGenerator, ReceiptStore } from '@summit/switchboard';

export function registerSwitchboardCommands(program: Command): void {
  const switchboard = program
    .command('switchboard')
    .description('Switchboard capsule operations');

  switchboard
    .command('run')
    .description('Run a task capsule')
    .requiredOption('--capsule <path>', 'Path to capsule manifest')
    .option('--waiver <token>', 'Apply a waiver token if policy denies an action')
    .action(async (options: { capsule: string; waiver?: string }) => {
      try {
        const repoRoot = detectRepoRoot(process.cwd());
        const result = await runCapsule({
          manifestPath: options.capsule,
          repoRoot,
          waiverToken: options.waiver,
        });
        console.log(`Capsule session: ${result.sessionId}`);
        console.log(`Ledger: ${result.ledgerPath}`);
        console.log(`Diff: ${result.diffPath}`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  const receipts = switchboard
    .command('receipts')
    .description('Manage action receipts');

  receipts
    .command('list')
    .description('List all action receipts')
    .action(() => {
      try {
        const repoRoot = detectRepoRoot(process.cwd());
        const storePath = path.join(repoRoot, '.switchboard', 'receipts.jsonl');
        const store = new ReceiptStore(storePath);
        const allReceipts = store.list();

        if (allReceipts.length === 0) {
          console.log('No receipts found.');
          return;
        }

        allReceipts.forEach((r) => {
          console.log(
            `[\${r.timestamp}] \${r.id.slice(0, 8)}: \${r.tool.capability}:\${r.tool.action} -> \${r.policy.decision}`
          );
        });
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  receipts
    .command('view <id>')
    .description('View details of a specific receipt')
    .action((id: string) => {
      try {
        const repoRoot = detectRepoRoot(process.cwd());
        const storePath = path.join(repoRoot, '.switchboard', 'receipts.jsonl');
        const store = new ReceiptStore(storePath);
        const receipt =
          store.getById(id) || store.list().find((r) => r.id.startsWith(id));

        if (!receipt) {
          console.error(\`Receipt not found: \${id}\`);
          process.exit(1);
        }

        console.log(JSON.stringify(receipt, null, 2));
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  receipts
    .command('replay <id>')
    .description('Verify integrity of an action receipt')
    .action((id: string) => {
      try {
        const repoRoot = detectRepoRoot(process.cwd());
        const storePath = path.join(repoRoot, '.switchboard', 'receipts.jsonl');
        const store = new ReceiptStore(storePath);
        const receipt =
          store.getById(id) || store.list().find((r) => r.id.startsWith(id));

        if (!receipt) {
          console.error(\`Receipt not found: \${id}\`);
          process.exit(1);
        }

        const isValid = ActionReceiptGenerator.verify(receipt);
        console.log(\`Receipt ID: \${receipt.id}\`);
        console.log(\`Integrity: \${isValid ? 'VALID' : 'INVALID'}\`);

        if (!isValid) {
          process.exit(1);
        }
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  switchboard
    .command('evidence <session_id>')
    .description('Generate an evidence bundle for a capsule session')
    .action((sessionId: string) => {
      try {
        const repoRoot = detectRepoRoot(process.cwd());
        const result = generateEvidenceBundle(repoRoot, sessionId);
        console.log(`Evidence bundle: ${result.evidenceDir}`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  switchboard
    .command('replay <session_id>')
    .description('Replay a capsule session and compare outputs')
    .action(async (sessionId: string) => {
      try {
        const repoRoot = detectRepoRoot(process.cwd());
        const report = await replayCapsule(repoRoot, sessionId);
        console.log(`Replay session: ${report.replay_session}`);
        console.log(`Replay match: ${report.match ? 'yes' : 'no'}`);
        if (!report.match) {
          console.log(`Differences: ${report.differences.join('; ')}`);
        }
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
