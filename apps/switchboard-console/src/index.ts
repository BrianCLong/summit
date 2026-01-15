#!/usr/bin/env node
import path from 'node:path';
import readline from 'node:readline';
import { ConsoleSession } from './session/ConsoleSession';

const args = process.argv.slice(2);
const resumeIndex = args.indexOf('--resume');
const resumeId = resumeIndex >= 0 ? args[resumeIndex + 1] : undefined;

const sessionRoot = path.join(
  process.cwd(),
  '.summit',
  'switchboard',
  'sessions',
);
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
});
