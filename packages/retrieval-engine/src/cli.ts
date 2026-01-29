#!/usr/bin/env node
import { Command } from 'commander';
import { RetrievalEngine } from './engine.js';
import path from 'path';

const program = new Command();

program
  .name('retrieval-engine')
  .description('Governed Retrieval Substrate CLI')
  .version('0.0.1');

program
  .command('plan')
  .description('Generate a retrieval plan and execute it against a local stub')
  .requiredOption('-q, --query <text>', 'User intent query text')
  .option('-o, --out <dir>', 'Output directory for evidence (optional, defaults to artifacts/evidence/retrieval)')
  .action(async (options) => {
    try {
      const engine = new RetrievalEngine();
      console.log(`Compiling plan for query: "${options.query}"`);

      const plan = await engine.compile(options.query, { backend: 'local_stub' });
      console.log('Plan compiled:', JSON.stringify(plan, null, 2));

      console.log('Executing plan (local stub)...');
      const result = await engine.executeLocalStub(plan);

      console.log('Execution complete.');
      console.log(`Evidence emitted (check artifacts/evidence/retrieval).`);
      console.log(`Result Contexts: ${result.contexts.length}`);
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);
