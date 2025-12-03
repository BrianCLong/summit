import { spawn, ChildProcess } from 'child_process';
import { Worker } from 'worker_threads';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const args = process.argv.slice(2);

let runCpu = false;
let runIo = false;
let runNet = false; // "Network bound" simulation via heavy localhost traffic
let commandStartIdx = 0;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--cpu') runCpu = true;
  else if (args[i] === '--io') runIo = true;
  else if (args[i] === '--net') runNet = true;
  else if (args[i] === '--all') { runCpu = true; runIo = true; runNet = true; }
  else if (args[i] === '--') {
    commandStartIdx = i + 1;
    break;
  }
  else {
    commandStartIdx = i;
    break;
  }
}

const command = args.slice(commandStartIdx);
if (command.length === 0) {
  console.error('Usage: ts-node runner.ts [--cpu] [--io] [--net] [--all] <command> [args...]');
  process.exit(1);
}

console.log(`[FlakePreventer] Starting runner...`);
console.log(`[FlakePreventer] Modes: CPU=${runCpu}, IO=${runIo}, NET=${runNet}`);
console.log(`[FlakePreventer] Command: ${command.join(' ')}`);

// --- Load Generators ---

const workers: Worker[] = [];

// CPU Worker Code
const cpuWorkerCode = `
const { parentPort } = require('worker_threads');
parentPort.on('message', (msg) => {
  if (msg === 'stop') process.exit(0);
});
function work() {
  let res = 0;
  for (let i = 0; i < 1e7; i++) {
    res += Math.random() * Math.sqrt(i);
  }
  // Yield briefly to allow message processing
  setImmediate(work);
}
work();
`;

// IO Worker Code
const ioWorkerCode = `
const { parentPort } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const os = require('os');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flake-io-'));

parentPort.on('message', (msg) => {
  if (msg === 'stop') {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
    process.exit(0);
  }
});

function work() {
  const file = path.join(tempDir, 'junk-' + Math.random());
  const data = Buffer.alloc(1024 * 1024, 'a'); // 1MB
  fs.writeFile(file, data, () => {
    fs.readFile(file, () => {
      fs.unlink(file, () => {
        setImmediate(work);
      });
    });
  });
}
work();
`;

// Network Worker Code (Heavy Localhost Traffic)
const netWorkerCode = `
const { parentPort } = require('worker_threads');
const http = require('http');

parentPort.on('message', (msg) => {
  if (msg === 'stop') process.exit(0);
});

const server = http.createServer((req, res) => {
  req.resume(); // consume body
  req.on('end', () => {
    res.end('ok');
  });
});

server.listen(0, '127.0.0.1', () => {
  const port = server.address().port;

  function spam() {
    const req = http.request({
      host: '127.0.0.1',
      port: port,
      method: 'POST',
      agent: false
    }, (res) => {
      res.resume();
      res.on('end', () => setImmediate(spam));
    });
    req.on('error', () => setImmediate(spam));
    req.write(Buffer.alloc(1024 * 50)); // 50KB payload
    req.end();
  }

  // Start a few concurrent spammers
  for(let i=0; i<10; i++) spam();
});
`;


if (runCpu) {
  // Spawn one per core - 1 to leave room for test runner, but at least 1
  const cpus = Math.max(1, os.cpus().length - 1);
  console.log(`[FlakePreventer] Spawning ${cpus} CPU workers...`);
  for (let i = 0; i < cpus; i++) {
    workers.push(new Worker(cpuWorkerCode, { eval: true }));
  }
}

if (runIo) {
  console.log(`[FlakePreventer] Spawning IO worker...`);
  workers.push(new Worker(ioWorkerCode, { eval: true }));
}

if (runNet) {
    console.log(`[FlakePreventer] Spawning Network worker...`);
    workers.push(new Worker(netWorkerCode, { eval: true }));
}

// --- Run Command ---

// Inject Jitter Env Var
const env = { ...process.env, FLAKE_PREVENTER_JITTER: 'true' };

const child = spawn(command[0], command.slice(1), {
  stdio: 'inherit',
  env
});

child.on('close', (code) => {
  console.log(`[FlakePreventer] Test command finished with code ${code}`);

  console.log(`[FlakePreventer] Stopping workers...`);
  workers.forEach(w => w.postMessage('stop'));

  // Give workers a moment to cleanup
  setTimeout(() => {
    workers.forEach(w => w.terminate());
    process.exit(code ?? 1);
  }, 1000);
});

child.on('error', (err) => {
  console.error(`[FlakePreventer] Failed to start command: ${err.message}`);
  workers.forEach(w => w.terminate());
  process.exit(1);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log(`[FlakePreventer] Caught interrupt, cleaning up...`);
  child.kill();
  workers.forEach(w => w.terminate());
  process.exit(1);
});
