import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const args = process.argv.slice(2);
const separatorIndex = args.indexOf('--');

if (separatorIndex === -1 || separatorIndex === 0) {
  // eslint-disable-next-line no-console
  console.error('Usage: node scripts/ga/run-evidence.mjs --log <path> -- <command> [args...]');
  process.exit(1);
}

const logFlagIndex = args.indexOf('--log');
if (logFlagIndex === -1 || !args[logFlagIndex + 1]) {
  // eslint-disable-next-line no-console
  console.error('Missing --log <path> argument');
  process.exit(1);
}

const logPath = args[logFlagIndex + 1];
const command = args[separatorIndex + 1];
const commandArgs = args.slice(separatorIndex + 2);

if (!command) {
  // eslint-disable-next-line no-console
  console.error('Missing command after -- separator');
  process.exit(1);
}

mkdirSync(dirname(logPath), { recursive: true });

const header = {
  timestamp: new Date().toISOString(),
  cwd: process.cwd(),
  node: process.version,
  platform: process.platform,
  command: [command, ...commandArgs].join(' '),
};

writeFileSync(logPath, `${JSON.stringify(header)}\n`, { flag: 'w' });

const child = spawn(command, commandArgs, {
  stdio: ['inherit', 'pipe', 'pipe'],
  env: process.env,
});

const append = (data) => {
  appendFileSync(logPath, data);
  process.stdout.write(data);
};

const appendErr = (data) => {
  appendFileSync(logPath, data);
  process.stderr.write(data);
};

child.stdout.on('data', append);
child.stderr.on('data', appendErr);

child.on('close', (code) => {
  appendFileSync(logPath, `\n[exit_code=${code}]\n`);
  process.exit(code ?? 1);
});
