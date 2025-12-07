#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Summit Developer CLI
 *
 * Unified CLI for all developer operations.
 * See docs/dx/DEV_CLI_SPEC.md for full specification.
 */

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const c = (color, text) => `${colors[color]}${text}${colors.reset}`;

// Logging helpers
const log = {
  info: (msg) => console.log(c('blue', 'ℹ'), msg),
  success: (msg) => console.log(c('green', '✓'), msg),
  warn: (msg) => console.log(c('yellow', '⚠'), msg),
  error: (msg) => console.log(c('red', '✗'), msg),
  step: (msg) => console.log(c('cyan', '→'), msg),
  dim: (msg) => console.log(c('gray', msg)),
};

// Configuration
const config = {
  composeFile: 'docker-compose.dev.yml',
  aiComposeFile: 'docker-compose.ai.yml',
  envFile: '.env',
  envExample: '.env.example',
  profiles: {
    minimal: ['postgres', 'redis', 'neo4j'],
    core: ['postgres', 'redis', 'neo4j', 'elasticsearch', 'api', 'web', 'gateway', 'websocket-server'],
    observability: ['prometheus', 'grafana', 'jaeger', 'loki', 'promtail', 'alertmanager'],
    ai: ['ai-sandbox'],
  },
  ports: {
    web: 3000,
    api: 4000,
    gateway: 4100,
    postgres: 5432,
    redis: 6379,
    neo4jHttp: 7474,
    neo4jBolt: 7687,
    elasticsearch: 9200,
    prometheus: 9090,
    grafana: 3001,
    jaeger: 16686,
  },
};

// Parse command line arguments
function parseArgs(argv) {
  const args = { _: [], flags: {} };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const [key, val] = arg.slice(2).split('=');
      if (val !== undefined) {
        args.flags[key] = val;
      } else if (argv[i + 1] && !argv[i + 1].startsWith('-')) {
        args.flags[key] = argv[i + 1];
        i++;
      } else {
        args.flags[key] = true;
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      args.flags[key] = true;
    } else {
      args._.push(arg);
    }
  }
  return args;
}

// Execute shell command
function exec(cmd, options = {}) {
  try {
    return execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options,
    });
  } catch (error) {
    if (options.ignoreError) return '';
    throw error;
  }
}

// Execute shell command and return output
function execOutput(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch {
    return '';
  }
}

// Check if command exists
function commandExists(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// Check if port is in use
function isPortInUse(port) {
  try {
    execSync(`lsof -i :${port}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// Get Docker memory allocation
function getDockerMemory() {
  try {
    const info = execOutput('docker info --format "{{.MemTotal}}"');
    return Math.round(parseInt(info) / 1024 / 1024 / 1024);
  } catch {
    return 0;
  }
}

// ============================================
// Commands
// ============================================

/**
 * summit doctor - Validate development environment
 */
async function doctor(args) {
  console.log('\n' + c('bold', 'Checking development environment...') + '\n');

  const checks = [];
  const quick = args.flags.quick;

  // Docker
  const dockerVersion = execOutput('docker --version').match(/(\d+\.\d+\.\d+)/)?.[1] || 'not found';
  const dockerRunning = execOutput('docker info 2>/dev/null | head -1').includes('Client');
  checks.push({
    name: 'Docker',
    value: dockerVersion,
    ok: dockerRunning && parseInt(dockerVersion.split('.')[0]) >= 20,
    fix: 'Install Docker Desktop from https://docs.docker.com/get-docker/',
  });

  // Docker Memory
  const dockerMem = getDockerMemory();
  checks.push({
    name: 'Docker Memory',
    value: `${dockerMem} GB`,
    ok: dockerMem >= 8,
    fix: 'Increase Docker Desktop memory to 8GB+ in Preferences → Resources',
  });

  // Node.js
  const nodeVersion = execOutput('node --version').replace('v', '') || 'not found';
  const nodeMajor = parseInt(nodeVersion.split('.')[0]);
  checks.push({
    name: 'Node.js',
    value: nodeVersion,
    ok: nodeMajor >= 18,
    fix: 'Install Node.js 18+ from https://nodejs.org/',
  });

  // pnpm
  const pnpmVersion = execOutput('pnpm --version') || 'not found';
  checks.push({
    name: 'pnpm',
    value: pnpmVersion,
    ok: pnpmVersion !== 'not found',
    fix: 'Run: corepack enable && corepack prepare pnpm@latest --activate',
  });

  // Python (optional)
  const pythonVersion = execOutput('python3 --version').match(/(\d+\.\d+)/)?.[1] || 'not found';
  checks.push({
    name: 'Python',
    value: pythonVersion,
    ok: pythonVersion !== 'not found' && parseFloat(pythonVersion) >= 3.11,
    warn: true, // Optional
    fix: 'Install Python 3.11+ (optional, for ML features)',
  });

  // Disk Space
  let diskFree = 0;
  try {
    const dfOutput = execOutput('df -BG . | tail -1');
    diskFree = parseInt(dfOutput.split(/\s+/)[3]);
  } catch { /* ignore */ }
  checks.push({
    name: 'Disk Space',
    value: `${diskFree} GB free`,
    ok: diskFree >= 10,
    fix: 'Free up disk space (need 10GB+)',
  });

  // Port checks (only in full mode)
  if (!quick) {
    for (const [name, port] of Object.entries(config.ports)) {
      const inUse = isPortInUse(port);
      checks.push({
        name: `Port ${port}`,
        value: inUse ? 'in use' : 'free',
        ok: !inUse,
        warn: true,
        fix: `Run: lsof -i :${port} to find process, then kill it`,
      });
    }
  }

  // Print results
  let allOk = true;
  for (const check of checks) {
    const status = check.ok ? c('green', '[ok]') : (check.warn ? c('yellow', '[warn]') : c('red', '[fail]'));
    const nameStr = check.name.padEnd(16);
    const valueStr = check.value.padEnd(12);
    console.log(`  ${nameStr} ${valueStr} ${status}`);
    if (!check.ok && !check.warn) allOk = false;
  }

  console.log('');

  if (allOk) {
    log.success('Environment ready!');
    return 0;
  } else {
    log.error('Some checks failed. Run with --fix to attempt auto-repair.');
    console.log('\nFixes needed:');
    for (const check of checks.filter(c => !c.ok && !c.warn)) {
      console.log(`  ${c('yellow', '•')} ${check.name}: ${check.fix}`);
    }
    return 1;
  }
}

/**
 * summit bootstrap - One-time setup
 */
async function bootstrap(args) {
  console.log('\n' + c('bold', 'Bootstrapping Summit development environment...') + '\n');

  // Run doctor first
  log.step('Running environment check...');
  const doctorResult = await doctor({ flags: { quick: true } });
  if (doctorResult !== 0 && !args.flags.force) {
    log.error('Environment check failed. Fix issues or run with --force to continue anyway.');
    return 1;
  }

  // Create .env
  log.step('Creating environment configuration...');
  const envPath = path.join(ROOT, config.envFile);
  const envExamplePath = path.join(ROOT, config.envExample);

  if (fs.existsSync(envPath) && !args.flags.clean) {
    log.info('.env already exists, skipping');
  } else {
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      log.success('Created .env from .env.example');
    } else {
      log.warn('.env.example not found, skipping .env creation');
    }
  }

  // Install Node dependencies
  if (!args.flags['skip-deps']) {
    log.step('Installing Node.js dependencies...');
    try {
      exec('pnpm install --frozen-lockfile', { silent: false });
      log.success('Node dependencies installed');
    } catch {
      log.warn('Frozen lockfile failed, trying regular install...');
      exec('pnpm install');
    }
  }

  // Setup Python venv (if requirements.txt exists)
  const requirementsPath = path.join(ROOT, 'requirements.txt');
  if (fs.existsSync(requirementsPath) && !args.flags['skip-deps']) {
    log.step('Setting up Python virtual environment...');
    try {
      exec('python3 -m venv .venv');
      exec('.venv/bin/pip install -U pip wheel');
      exec('.venv/bin/pip install -r requirements.txt');
      log.success('Python environment ready');
    } catch (error) {
      log.warn('Python setup failed (optional): ' + error.message);
    }
  }

  console.log('\n' + c('green', '✓ Bootstrap complete!') + '\n');
  console.log('Next steps:');
  console.log(`  ${c('cyan', 'summit up')}     Start development services`);
  console.log(`  ${c('cyan', 'summit smoke')}  Validate golden path`);
  console.log('');

  return 0;
}

/**
 * summit up - Start development environment
 */
async function up(args) {
  const profile = args.flags.profile || 'core';
  const detach = args.flags.attach ? '' : '-d';
  const build = args.flags.build ? '--build' : '';

  console.log('\n' + c('bold', `Starting Summit development stack (${profile})...`) + '\n');

  // Check .env exists
  if (!fs.existsSync(path.join(ROOT, config.envFile))) {
    log.error('.env not found. Run: summit bootstrap');
    return 1;
  }

  // Determine compose files
  let composeCmd = `docker-compose -f ${config.composeFile}`;
  if (profile === 'ai' || profile === 'full') {
    composeCmd += ` -f ${config.aiComposeFile}`;
  }
  composeCmd += ` --env-file ${config.envFile}`;

  // Start services
  log.step('Starting containers...');
  try {
    exec(`${composeCmd} up ${detach} ${build} --remove-orphans`);
  } catch (error) {
    log.error('Failed to start containers');
    console.log('\nTroubleshooting:');
    console.log('  • Check Docker Desktop is running');
    console.log('  • Check port conflicts: docker ps');
    console.log('  • View logs: summit logs');
    return 1;
  }

  if (!args.flags.attach) {
    // Wait for services
    log.step('Waiting for services to be healthy...');
    const waitScript = path.join(ROOT, 'scripts/wait-for-stack.sh');
    if (fs.existsSync(waitScript)) {
      try {
        exec(`bash ${waitScript}`, { silent: true });
      } catch {
        log.warn('Some services may still be starting');
      }
    }

    console.log('\n' + c('green', '✓ Services ready!') + '\n');
    console.log('Access points:');
    console.log(`  Frontend:     ${c('cyan', 'http://localhost:3000')}`);
    console.log(`  API:          ${c('cyan', 'http://localhost:4000/graphql')}`);
    console.log(`  Neo4j:        ${c('cyan', 'http://localhost:7474')}`);
    console.log(`  Metrics:      ${c('cyan', 'http://localhost:4000/metrics')}`);
    if (profile === 'observability' || profile === 'ai' || profile === 'full') {
      console.log(`  Grafana:      ${c('cyan', 'http://localhost:3001')}`);
      console.log(`  Jaeger:       ${c('cyan', 'http://localhost:16686')}`);
    }
    console.log('');
    console.log(`Run ${c('cyan', 'summit logs')} to view logs`);
    console.log(`Run ${c('cyan', 'summit smoke')} to validate golden path`);
    console.log('');
  }

  return 0;
}

/**
 * summit down - Stop development environment
 */
async function down(args) {
  const volumes = args.flags.volumes ? '-v' : '';

  console.log('\n' + c('bold', 'Stopping Summit development stack...') + '\n');

  exec(`docker-compose -f ${config.composeFile} down ${volumes} --remove-orphans`, { ignoreError: true });

  log.success('Services stopped');
  if (args.flags.volumes) {
    log.warn('Volumes removed - all data has been deleted');
  }

  return 0;
}

/**
 * summit logs - View service logs
 */
async function logs(args) {
  const services = args._.slice(1).join(' ');
  const follow = args.flags.follow !== false ? '-f' : '';
  const tail = args.flags.tail ? `--tail ${args.flags.tail}` : '';
  const since = args.flags.since ? `--since ${args.flags.since}` : '';

  const cmd = `docker-compose -f ${config.composeFile} logs ${follow} ${tail} ${since} ${services}`;
  const child = spawn('sh', ['-c', cmd], { cwd: ROOT, stdio: 'inherit' });

  return new Promise((resolve) => {
    child.on('close', (code) => resolve(code || 0));
  });
}

/**
 * summit status - Show environment status
 */
async function status() {
  console.log('\n' + c('bold', 'Service Status:') + '\n');

  try {
    exec(`docker-compose -f ${config.composeFile} ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"`, { silent: false });
  } catch {
    log.warn('No services running');
  }

  return 0;
}

/**
 * summit smoke - Run golden path validation
 */
async function smoke(args) {
  console.log('\n' + c('bold', 'Running golden path validation...') + '\n');

  // Quick check - just health endpoints
  if (args.flags.quick) {
    log.step('Checking health endpoints...');
    try {
      exec('curl -sf http://localhost:4000/health > /dev/null', { silent: true });
      log.success('API healthy');
    } catch {
      log.error('API not responding at http://localhost:4000/health');
      return 1;
    }

    try {
      exec('curl -sf http://localhost:3000 > /dev/null', { silent: true });
      log.success('Frontend healthy');
    } catch {
      log.warn('Frontend not responding (may be building)');
    }

    log.success('Quick smoke passed');
    return 0;
  }

  // Full smoke test
  const smokeScript = path.join(ROOT, 'scripts/smoke-test.js');
  if (!fs.existsSync(smokeScript)) {
    log.error('Smoke test script not found');
    return 1;
  }

  try {
    exec(`node ${smokeScript}`, { silent: false });
    return 0;
  } catch {
    return 1;
  }
}

/**
 * summit test - Run tests
 */
async function test(args) {
  let cmd = 'pnpm test';

  if (args.flags.unit) cmd = 'pnpm test:jest';
  if (args.flags.integration) cmd = 'pnpm test:integration';
  if (args.flags.e2e) cmd = 'pnpm test:e2e';
  if (args.flags.coverage) cmd = 'pnpm test:coverage';
  if (args.flags.watch) cmd += ' -- --watch';
  if (args.flags.filter) cmd += ` -- --testPathPattern="${args.flags.filter}"`;

  console.log('\n' + c('bold', 'Running tests...') + '\n');
  try {
    exec(cmd);
    return 0;
  } catch {
    return 1;
  }
}

/**
 * summit lint - Run linters
 */
async function lint(args) {
  const fix = args.flags.fix ? ':fix' : '';

  console.log('\n' + c('bold', 'Running linters...') + '\n');

  let exitCode = 0;

  if (!args.flags.py) {
    log.step('TypeScript/JavaScript...');
    try {
      exec(`pnpm lint${fix}`);
      log.success('TS/JS lint passed');
    } catch {
      log.error('TS/JS lint failed');
      exitCode = 1;
    }
  }

  if (!args.flags.ts && commandExists('ruff')) {
    log.step('Python...');
    try {
      exec(`pnpm lint:py${fix}`);
      log.success('Python lint passed');
    } catch {
      log.error('Python lint failed');
      exitCode = 1;
    }
  }

  return exitCode;
}

/**
 * summit build - Build projects
 */
async function build(args) {
  console.log('\n' + c('bold', 'Building projects...') + '\n');

  let cmd = 'pnpm build';
  if (args.flags.filter) cmd += ` --filter ${args.flags.filter}`;

  try {
    exec(cmd);
    log.success('Build complete');
    return 0;
  } catch {
    log.error('Build failed');
    return 1;
  }
}

/**
 * summit db - Database operations
 */
async function db(args) {
  const subcommand = args._[1];

  switch (subcommand) {
    case 'migrate':
      if (args.flags.rollback) {
        exec('pnpm db:knex:rollback');
      } else {
        exec('pnpm db:pg:migrate');
        exec('pnpm db:neo4j:migrate', { ignoreError: true });
      }
      break;

    case 'seed':
      exec('pnpm devkit:seed');
      break;

    case 'reset':
      log.warn('This will DELETE ALL DATA. Press Ctrl+C to cancel.');
      await new Promise(resolve => setTimeout(resolve, 3000));
      exec('docker-compose -f docker-compose.dev.yml down -v');
      log.success('Databases reset');
      break;

    case 'shell':
      const dbType = args._[2] || 'postgres';
      if (dbType === 'postgres') {
        exec('docker exec -it summit-postgres psql -U summit -d summit_dev', { stdio: 'inherit' });
      } else if (dbType === 'neo4j') {
        exec('docker exec -it summit-neo4j cypher-shell -u neo4j -p devpassword', { stdio: 'inherit' });
      } else if (dbType === 'redis') {
        exec('docker exec -it summit-redis redis-cli', { stdio: 'inherit' });
      }
      break;

    default:
      console.log('Usage: summit db <migrate|seed|reset|shell [postgres|neo4j|redis]>');
      return 1;
  }

  return 0;
}

/**
 * summit new - Generate new components
 */
async function newComponent(args) {
  const type = args._[1];
  const name = args._[2];

  if (!type || !name) {
    console.log('Usage: summit new <service|package|component|migration> <name>');
    return 1;
  }

  switch (type) {
    case 'service':
      const port = args.flags.port || 4050;
      const owner = args.flags.owner || 'team';
      exec(`node companyos/scripts/companyos-cli.mjs new-service --name ${name} --port ${port} --owner ${owner}`);
      break;

    case 'package':
      const pkgDir = path.join(ROOT, 'packages', name);
      fs.mkdirSync(path.join(pkgDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify({
        name: `@intelgraph/${name}`,
        version: '0.0.1',
        main: 'dist/index.js',
        types: 'dist/index.d.ts',
        scripts: {
          build: 'tsc',
          dev: 'tsc --watch',
        },
      }, null, 2));
      fs.writeFileSync(path.join(pkgDir, 'src/index.ts'), '// Export your package API here\n');
      log.success(`Created packages/${name}`);
      break;

    default:
      log.error(`Unknown type: ${type}`);
      return 1;
  }

  return 0;
}

/**
 * summit clean - Cleanup operations
 */
async function clean(args) {
  console.log('\n' + c('bold', 'Cleaning up...') + '\n');

  // Standard cleanup
  log.step('Removing build artifacts...');
  exec('rm -rf dist .turbo coverage', { ignoreError: true });

  if (args.flags.cache) {
    log.step('Clearing caches...');
    exec('pnpm store prune', { ignoreError: true });
    exec('rm -rf .turbo node_modules/.cache', { ignoreError: true });
  }

  if (args.flags.docker || args.flags.deep) {
    log.step('Cleaning Docker...');
    exec('docker system prune -f', { ignoreError: true });
    if (args.flags.deep) {
      exec('docker volume prune -f', { ignoreError: true });
    }
  }

  if (args.flags.deep) {
    log.step('Removing node_modules...');
    exec('rm -rf node_modules', { ignoreError: true });
  }

  log.success('Cleanup complete');
  return 0;
}

/**
 * summit pr - PR helpers
 */
async function pr(args) {
  const subcommand = args._[1];

  switch (subcommand) {
    case 'check':
      console.log('\n' + c('bold', 'Running pre-PR checks...') + '\n');
      let exitCode = 0;

      log.step('Linting...');
      if (await lint({ _: [], flags: {} }) !== 0) exitCode = 1;

      log.step('Type checking...');
      try { exec('pnpm typecheck'); } catch { exitCode = 1; }

      log.step('Running tests...');
      if (await test({ _: [], flags: { quick: true } }) !== 0) exitCode = 1;

      log.step('Smoke tests...');
      if (await smoke({ _: [], flags: { quick: true } }) !== 0) exitCode = 1;

      if (exitCode === 0) {
        log.success('All pre-PR checks passed!');
      } else {
        log.error('Some checks failed');
      }
      return exitCode;

    case 'size':
      const diffStat = execOutput('git diff --stat HEAD~1 || git diff --stat');
      console.log(diffStat);
      const files = (diffStat.match(/\d+ files? changed/) || ['0'])[0];
      const insertions = (diffStat.match(/\d+ insertions?/) || ['0'])[0];
      console.log('\n');
      if (parseInt(insertions) > 500) {
        log.warn('PR is large (>500 lines). Consider splitting.');
      } else {
        log.success('PR size is reasonable');
      }
      break;

    default:
      console.log('Usage: summit pr <check|size>');
      return 1;
  }

  return 0;
}

/**
 * summit help - Show help
 */
function help() {
  console.log(`
${c('bold', 'Summit Developer CLI')}

${c('cyan', 'Usage:')} summit <command> [options]

${c('cyan', 'Commands:')}
  doctor          Check development environment prerequisites
  bootstrap       One-time setup for fresh clones
  up              Start development environment
  down            Stop development environment
  logs            View service logs
  status          Show environment status
  smoke           Run golden path validation
  test            Run tests
  lint            Run linters
  build           Build projects
  db              Database operations
  new             Generate new components
  clean           Cleanup operations
  pr              Pull request helpers
  help            Show this help

${c('cyan', 'Examples:')}
  summit bootstrap              # Initial setup
  summit up                     # Start services
  summit up --profile ai        # Start with AI services
  summit logs api               # View API logs
  summit smoke                  # Validate golden path
  summit test --watch           # Watch mode tests
  summit db migrate             # Run migrations
  summit new service my-api     # Create new service
  summit pr check               # Pre-PR validation

${c('cyan', 'Documentation:')}
  docs/dx/DEV_CLI_SPEC.md       Full CLI specification
  docs/dx/LOCAL_DEV_CONFIG.md   Configuration guide
  docs/dx/GOLDEN_PATHS.md       Common workflows
  docs/dx/ONBOARDING_CHECKLIST.md  Getting started

Run ${c('cyan', 'summit <command> --help')} for command-specific help.
`);
}

// ============================================
// Main entry point
// ============================================

async function main() {
  const args = parseArgs(process.argv);
  const command = args._[0];

  // Handle help flag on any command
  if (args.flags.help || args.flags.h) {
    help();
    process.exit(0);
  }

  let exitCode = 0;

  switch (command) {
    case 'doctor':
      exitCode = await doctor(args);
      break;
    case 'bootstrap':
      exitCode = await bootstrap(args);
      break;
    case 'up':
      exitCode = await up(args);
      break;
    case 'down':
      exitCode = await down(args);
      break;
    case 'logs':
      exitCode = await logs(args);
      break;
    case 'status':
      exitCode = await status(args);
      break;
    case 'smoke':
      exitCode = await smoke(args);
      break;
    case 'test':
      exitCode = await test(args);
      break;
    case 'lint':
      exitCode = await lint(args);
      break;
    case 'build':
      exitCode = await build(args);
      break;
    case 'db':
      exitCode = await db(args);
      break;
    case 'new':
      exitCode = await newComponent(args);
      break;
    case 'clean':
      exitCode = await clean(args);
      break;
    case 'pr':
      exitCode = await pr(args);
      break;
    case 'help':
    case undefined:
      help();
      break;
    default:
      log.error(`Unknown command: ${command}`);
      help();
      exitCode = 1;
  }

  process.exit(exitCode);
}

main().catch((error) => {
  log.error(error.message);
  process.exit(1);
});
