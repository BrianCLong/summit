/**
 * Switchboard Commands
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { detectRepoRoot } from '../lib/sandbox.js';
import { runCapsule } from '../lib/switchboard-runner.js';
import { generateEvidenceBundle } from '../lib/switchboard-evidence.js';
import { replayCapsule } from '../lib/switchboard-replay.js';
import { readLedgerEntries, ActionReceipt } from '../lib/switchboard-ledger.js';

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

  const receipts = switchboard.command('receipts').description('Manage action receipts');

  receipts
    .command('list')
    .description('List action receipts')
    .option('--session <session_id>', 'Filter by session ID')
    .action((options: { session?: string }) => {
      try {
        const repoRoot = detectRepoRoot(process.cwd());
        const sessionsRoot = path.join(repoRoot, '.switchboard', 'capsules');
        if (!fs.existsSync(sessionsRoot)) {
          console.log('No sessions found.');
          return;
        }

        const sessionIds = options.session ? [options.session] : fs.readdirSync(sessionsRoot);
        const allReceipts: ActionReceipt[] = [];

        for (const sessionId of sessionIds) {
          const ledgerPath = path.join(sessionsRoot, sessionId, 'ledger.jsonl');
          if (fs.existsSync(ledgerPath)) {
            const entries = readLedgerEntries(ledgerPath);
            for (const entry of entries) {
              if (entry.type === 'action_receipt') {
                allReceipts.push(entry.data as ActionReceipt);
              }
            }
          }
        }

        if (allReceipts.length === 0) {
          console.log('No receipts found.');
          return;
        }

        console.table(allReceipts.map(r => ({
          ID: r.receipt_id,
          Timestamp: r.timestamp,
          Tool: r.tool_id,
          Status: r.status,
          Hash: r.hash.slice(0, 8) + '...'
        })));

      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  receipts
    .command('show <receipt_id>')
    .description('Show full details of a receipt')
    .action((receiptId: string) => {
      try {
        const repoRoot = detectRepoRoot(process.cwd());
        const sessionsRoot = path.join(repoRoot, '.switchboard', 'capsules');
        if (!fs.existsSync(sessionsRoot)) {
          console.error('No sessions found.');
          process.exit(1);
        }

        const sessionIds = fs.readdirSync(sessionsRoot);
        for (const sessionId of sessionIds) {
          const ledgerPath = path.join(sessionsRoot, sessionId, 'ledger.jsonl');
          if (fs.existsSync(ledgerPath)) {
            const entries = readLedgerEntries(ledgerPath);
            for (const entry of entries) {
              if (entry.type === 'action_receipt') {
                const receipt = entry.data as ActionReceipt;
                if (receipt.receipt_id === receiptId) {
                  console.log(JSON.stringify(receipt, null, 2));
                  return;
                }
              }
            }
          }
        }
        console.error(`Receipt not found: ${receiptId}`);
        process.exit(1);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
