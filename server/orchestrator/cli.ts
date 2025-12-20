#!/usr/bin/env node
import { program } from 'commander';
import { maestro, AgentTask } from './maestro';
import { runManager } from './runManager';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

// Since we're running this as a CLI script, we need to handle async startup
async function main() {
  program
    .name('maestro-cli')
    .description('CLI for interacting with Maestro/Conductor')
    .version('1.0.0');

  program
    .command('trigger <type>')
    .description('Trigger a new run (plan, scaffold, implement, test, review, docs)')
    .option('--repo <repo>', 'Repository name', 'test-repo')
    .option('--issue <issue>', 'Issue ID', 'issue-1')
    .option('--budget <budget>', 'Budget in USD', '10')
    .action(async (type, options) => {
      try {
        const idempotencyKey = uuidv4();
        const task: AgentTask = {
          kind: type as any,
          repo: options.repo,
          issue: options.issue,
          budgetUSD: parseFloat(options.budget),
          context: {},
          idempotencyKey,
          metadata: {
            actor: 'cli-user',
            timestamp: new Date().toISOString(),
            sprint_version: 'cli-v1',
          },
        };

        console.log(`Triggering run of type ${type} for ${options.repo}...`);
        const jobId = await maestro.enqueueTask(task);
        console.log(`Run started! Job ID: ${jobId}`);

        // In a real CLI we might poll for status or just exit
        // For this demo, let's wait a bit to show we can get status

        // Small delay to allow worker to pick it up
        await new Promise(r => setTimeout(r, 1000));

        const run = await runManager.getRun(jobId);
        if (run) {
            console.log(`Run Status: ${run.status}`);
            console.log(`Run ID: ${run.id}`);
        } else {
            console.log('Run created but not found in manager yet?');
        }

      } catch (error: any) {
        console.error('Failed to trigger run:', error.message);
      } finally {
        await maestro.shutdown();
      }
    });

  program
    .command('status <runId>')
    .description('Get status of a run')
    .action(async (runId) => {
      try {
        const run = await runManager.getRun(runId);
        if (run) {
          console.log(JSON.stringify(run, null, 2));
        } else {
          console.log(`Run ${runId} not found`);
        }
      } catch (error: any) {
        console.error('Error fetching status:', error.message);
      } finally {
          await maestro.shutdown();
      }
    });

  await program.parseAsync(process.argv);
}

// If executing directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}
