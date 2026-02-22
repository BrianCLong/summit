#!/usr/bin/env node
import { Command } from 'commander';
import path from 'node:path';
import readline from 'node:readline';
import { ConsoleSession } from './session/ConsoleSession.js';
import { loadRegistrySources } from './registry/loader.js';
import { validateRegistrySources } from './registry/validator.js';

const program = new Command();

program
  .name('switchboard')
  .description('Summit Switchboard CLI')
  .version('0.1.0');

const registryCmd = program.command('registry').description('Manage tool/server registries');

registryCmd
  .command('validate')
  .description('Validate a registry file or directory')
  .requiredOption('--registry <path>', 'path to registry file or directory')
  .action(async (options) => {
    try {
      const sources = await loadRegistrySources(options.registry);
      const result = validateRegistrySources(sources);

      if (result.valid) {
        process.stdout.write('PASS\n');
        process.stdout.write(`Tools: ${result.stats.tools}\n`);
        process.stdout.write(`Servers: ${result.stats.servers}\n`);
        process.exit(0);
      } else {
        process.stdout.write('FAIL\n');
        const maxErrors = 5;
        const firstN = result.errors.slice(0, maxErrors);
        for (const error of firstN) {
          const fileInfo = error.file ? `[${path.basename(error.file)}] ` : '';
          process.stderr.write(`${fileInfo}${error.path}: ${error.message}\n`);
          if (error.hint) {
            process.stderr.write(`  Hint: ${error.hint}\n`);
          }
        }
        if (result.errors.length > maxErrors) {
          process.stdout.write(`+${result.errors.length - maxErrors} more errors\n`);
        }
        process.exit(2);
      }
    } catch (error: any) {
      process.stderr.write(`IO/Runtime Error: ${error.message}\n`);
      process.exit(1);
    }
  });

program
  .command('repl', { isDefault: true })
  .description('Start the Switchboard REPL (default)')
  .option('--resume <id>', 'resume session by ID')
  .action(async (options) => {
    const resumeId = options.resume;
    const sessionRoot = path.join(process.cwd(), '.summit', 'switchboard', 'sessions');
    const skillsetDir = path.join(process.cwd(), '.summit', 'skillsets');

    const session = new ConsoleSession({
      sessionRoot,
      skillsetDir,
      sessionId: resumeId,
    });

    await session.init(Boolean(resumeId));

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'switchboard> ',
    });

    const handleLine = async (line: string) => {
      try {
        const response = await session.handleInput(line);
        if (response) {
          process.stdout.write(`${response}\n`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        process.stdout.write(`Error: ${message}\n`);
      } finally {
        rl.prompt();
      }
    };

    process.stdout.write(`Session ${session.id} ready. Type /exit to end.\n`);
    rl.prompt();

    rl.on('line', (line) => {
      void handleLine(line);
    });

    rl.on('close', async () => {
      await session.end();
      process.exit(0);
    });
  });

program.parse(process.argv);
