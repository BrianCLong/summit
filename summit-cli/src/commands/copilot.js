import { Command } from 'commander';
import { Executor } from '../lib/executor.js';

/**
 * Register 'summit copilot' commands
 */
export function registerCopilotCommands(program, config, output) {
  const copilot = new Command('copilot')
    .description('AI assistant and automation')
    .summary('Interactive copilot, task automation, and document retrieval');

  // summit copilot chat
  copilot
    .command('chat')
    .description('Start interactive copilot session')
    .action(async (options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('copilot chat');
        out.info('Starting AI copilot...');

        // TODO: Implement interactive chat interface
        out.warning('Interactive chat not yet implemented');
        out.info('Use: summit copilot task "<description>" to run automated tasks');

        out.endCommand(true);
      } catch (error) {
        out.error('Failed to start copilot', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit copilot task
  copilot
    .command('task')
    .description('Run automated AI task')
    .argument('<description>', 'Task description for AI to execute')
    .action(async (description, options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('copilot task', { description });
        out.spin('Processing task with AI...');

        // TODO: Integrate with AI task manager (scripts/ai-task-manager.py)
        await exec.execScript('scripts/ai-task-manager.py', ['--task', description]);

        out.spinSucceed('Task completed');
        out.endCommand(true);
      } catch (error) {
        out.spinStop();
        out.error('Task execution failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit copilot retrieve
  copilot
    .command('retrieve')
    .description('Retrieve relevant documents for a query')
    .argument('<query>', 'Search query')
    .option('-k, --top <n>', 'Number of results to return', '5')
    .action(async (query, options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('copilot retrieve', { query, topK: options.top });
        out.spin('Searching documentation...');

        // Call assistant retrieval server
        const retrieverUrl = cfg.copilot?.retriever || 'http://localhost:8765';
        const response = await fetch(`${retrieverUrl}/retrieve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, k: parseInt(options.top, 10) }),
        });

        if (!response.ok) {
          throw new Error(`Retrieval failed: ${response.statusText}`);
        }

        const results = await response.json();
        out.spinSucceed('Search completed');

        if (out.format === 'human') {
          out.info(`Found ${results.length} relevant documents:`);
          results.forEach((doc, i) => {
            console.log(`\n${i + 1}. ${doc.title || doc.id}`);
            console.log(`   Score: ${doc.score.toFixed(3)}`);
            if (doc.excerpt) {
              console.log(`   ${doc.excerpt.substring(0, 100)}...`);
            }
          });
        }

        out.endCommand(true, { results });
      } catch (error) {
        out.spinStop();
        out.error('Document retrieval failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit copilot index
  copilot
    .command('index')
    .description('Build or update document index')
    .option('--rebuild', 'Rebuild index from scratch')
    .action(async (options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('copilot index', options);
        out.spin('Building document index...');

        // TODO: Call RAG indexing scripts
        await exec.execScript('tools/rag_index.py', options.rebuild ? ['--rebuild'] : []);

        out.spinSucceed('Document index updated');
        out.endCommand(true);
      } catch (error) {
        out.spinStop();
        out.error('Index build failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  program.addCommand(copilot);
}
