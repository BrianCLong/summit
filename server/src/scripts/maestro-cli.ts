
import { Command } from 'commander';
import { maestro } from '../../orchestrator/maestro.js';
import { PolicyGuard } from '../../orchestrator/policyGuard.js';
import { logger } from '../../utils/logger.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const program = new Command();

program
  .name('maestro')
  .description('CLI for Maestro Orchestrator')
  .version('1.0.0');

program
  .command('enqueue')
  .description('Enqueue a task for Maestro')
  .requiredOption('-k, --kind <kind>', 'Task kind (plan, scaffold, implement, test, review, docs)')
  .requiredOption('-i, --issue <issue>', 'Issue description or command')
  .option('-r, --repo <repo>', 'Repository name', 'summit')
  .option('-b, --budget <budget>', 'Budget in USD', '1.0')
  .action(async (options) => {
    try {
      console.log('Enqueueing task...', options);
      // Ensure maestro is connected
      const taskId = await maestro.enqueueTask({
        kind: options.kind,
        repo: options.repo,
        issue: options.issue,
        budgetUSD: parseFloat(options.budget),
        context: { cli: true },
        metadata: {
            actor: 'cli',
            timestamp: new Date().toISOString(),
            sprint_version: 'current'
        }
      });
      console.log(`Task enqueued successfully. Task ID: ${taskId}`);
      await maestro.shutdown();
      process.exit(0);
    } catch (error: any) {
      console.error('Failed to enqueue task:', error.message);
      await maestro.shutdown();
      process.exit(1);
    }
  });

program
  .command('run-and-wait')
  .description('Enqueue a task and wait for completion')
  .requiredOption('-k, --kind <kind>', 'Task kind')
  .requiredOption('-i, --issue <issue>', 'Issue description')
  .option('-r, --repo <repo>', 'Repository name', 'summit')
  .option('-b, --budget <budget>', 'Budget in USD', '1.0')
  .option('-t, --timeout <timeout>', 'Timeout in ms', '600000')
  .action(async (options) => {
    try {
      console.log('Enqueueing task and waiting...', options);
      const taskId = await maestro.enqueueTask({
        kind: options.kind,
        repo: options.repo,
        issue: options.issue,
        budgetUSD: parseFloat(options.budget),
        context: { cli: true },
        metadata: {
            actor: 'cli',
            timestamp: new Date().toISOString(),
            sprint_version: 'current'
        }
      });
      console.log(`Task enqueued. Task ID: ${taskId}`);

      const timeout = parseInt(options.timeout);
      const start = Date.now();

      while (Date.now() - start < timeout) {
          const status = await maestro.getTaskStatus(taskId);
          if (status?.finishedOn) {
              console.log('Task finished successfully.');
              console.log('Task Input Data:', status.data);
              // Note: Job output is not currently exposed via getTaskStatus.
              await maestro.shutdown();
              process.exit(0);
          }
          if (status?.failedReason) {
              console.error('Task failed:', status.failedReason);
              await maestro.shutdown();
              process.exit(1);
          }
          await new Promise(r => setTimeout(r, 2000));
      }

      console.error('Timeout waiting for task completion');
      await maestro.shutdown();
      process.exit(1);

    } catch (error: any) {
      console.error('Error:', error.message);
      await maestro.shutdown();
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Get status of a task')
  .argument('<taskId>', 'Task ID')
  .action(async (taskId) => {
    try {
      const status = await maestro.getTaskStatus(taskId);
      if (!status) {
        console.log('Task not found');
      } else {
        console.log(JSON.stringify(status, null, 2));
      }
      await maestro.shutdown();
      process.exit(0);
    } catch (error: any) {
      console.error('Failed to get status:', error.message);
      await maestro.shutdown();
      process.exit(1);
    }
  });

program
  .command('check-policy')
  .description('Check if a task would pass policy guard')
  .requiredOption('-k, --kind <kind>', 'Task kind')
  .requiredOption('-i, --issue <issue>', 'Issue description')
  .option('-r, --repo <repo>', 'Repository name', 'summit')
  .action(async (options) => {
    try {
        console.log("Running PolicyGuard checks...");
        const guard = new PolicyGuard();
        const task = {
            kind: options.kind,
            repo: options.repo,
            issue: options.issue,
            budgetUSD: 0,
            context: { cli: true, dataResidency: 'GLOBAL' },
            metadata: {
                actor: 'cli',
                timestamp: new Date().toISOString(),
                sprint_version: 'current'
            }
        };

        const result = await guard.checkPolicy(task as any);

        if (result.allowed) {
            console.log("Policy check: PASSED");
            console.log(`Confidence: ${result.confidence}`);
            // Note: In a real scenario, this might trigger a review task.
            // For now, it just validates.
            process.exit(0);
        } else {
            console.error("Policy check: FAILED");
            console.error(`Reason: ${result.reason}`);
            process.exit(1);
        }
    } catch (error: any) {
        console.error('Policy check encountered an error:', error.message);
        process.exit(1);
    }
  });


program.parse();
