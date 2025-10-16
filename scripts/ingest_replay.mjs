#!/usr/bin/env node
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const opts = {
  dlq: path.join(__dirname, '../uploads/dlq'),
  rate: '0',
  uri: 'bolt://localhost:7687',
  user: 'neo4j',
  password: 'password',
};
for (let i = 0; i < args.length; i += 2) {
  const key = args[i];
  const val = args[i + 1];
  if (key === '--dlq') opts.dlq = val;
  if (key === '--rate') opts.rate = val;
  if (key === '--neo4j-uri') opts.uri = val;
  if (key === '--neo4j-user') opts.user = val;
  if (key === '--neo4j-password') opts.password = val;
}
const py = spawn(
  'python',
  [
    path.join(__dirname, '../data-pipelines/universal-ingest/ingest.py'),
    '--neo4j-uri',
    opts.uri,
    '--neo4j-user',
    opts.user,
    '--neo4j-password',
    opts.password,
    '--replay-dlq',
    opts.dlq,
    '--rate-limit',
    opts.rate,
  ],
  { stdio: 'inherit' },
);
py.on('exit', (code) => process.exit(code ?? 0));
