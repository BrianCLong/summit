import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import net from 'net';
import dotenv from 'dotenv';
import { loadConfig, getProfile, type Profile } from './lib/config.js';

export type DoctorStatus = 'pass' | 'warn' | 'fail';

export interface DoctorCheckResult {
  name: string;
  status: DoctorStatus;
  message: string;
  fix?: string;
  autoFixed?: boolean;
}

export interface DoctorReport {
  results: DoctorCheckResult[];
  summary: {
    total: number;
    passed: number;
    warnings: number;
    failed: number;
    autoFixed: number;
    envPath: string;
  };
}

export interface DoctorOptions {
  envFile?: string;
  profile?: string;
  autoFix?: boolean;
  redisProbe?: PortProbe;
  postgresProbe?: PortProbe;
  execRunner?: ExecRunner;
  cwd?: string;
}

export type PortProbe = (host: string, port: number) => Promise<boolean>;
export type ExecRunner = (command: string) => string;

const MIN_NODE_MAJOR = 18;
const REQUIRED_TARGETS = ['bootstrap', 'up', 'migrate', 'smoke', 'down'];
const DEFAULT_ENV_PATH = '.env';

const defaultExecRunner: ExecRunner = (command) =>
  execSync(command, { stdio: 'pipe', timeout: 3000 }).toString().trim();

export async function runDoctor(options: DoctorOptions = {}): Promise<DoctorReport> {
  const cwd = options.cwd ?? process.cwd();
  const envPath = path.resolve(cwd, options.envFile ?? DEFAULT_ENV_PATH);
  const execRunner = options.execRunner ?? defaultExecRunner;
  const portProbe = options.redisProbe ?? probePort;
  const postgresProbe = options.postgresProbe ?? portProbe;
  const results: DoctorCheckResult[] = [];

  const envResult = await ensureEnvFile(envPath, Boolean(options.autoFix));
  results.push(envResult);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }

  // Load profile configuration
  const config = await loadConfig();
  const profile = getProfile(config, options.profile);

  results.push(checkNodeVersion(MIN_NODE_MAJOR));
  results.push(await checkPnpm(execRunner, Boolean(options.autoFix)));
  results.push(await checkDocker(execRunner));
  results.push(await checkMakefileTargets(cwd));
  results.push(await checkRedis(portProbe, profile));
  results.push(await checkPostgres(postgresProbe, profile));

  if (profile.switchboard) {
    results.push(checkSwitchboardProfile(profile));
  }

  const summary = summarise(results, envPath);

  return { results, summary };
}

export function checkNodeVersion(
  minMajor: number,
  currentVersion = process.versions.node,
): DoctorCheckResult {
  const current = currentVersion.replace(/^v/, '');
  const major = parseInt(current.split('.')[0], 10);

  if (Number.isNaN(major)) {
    return {
      name: 'Node.js',
      status: 'fail',
      message: 'Unable to detect Node.js version',
      fix: 'Reinstall Node.js 18+ from https://nodejs.org/',
    };
  }

  if (major < minMajor) {
    return {
      name: 'Node.js',
      status: 'fail',
      message: `Node.js ${current} found; >=${minMajor} required`,
      fix: 'Install Node.js 18+ (e.g., via nvm: nvm install 18 && nvm use 18)',
    };
  }

  if (major === minMajor) {
    return {
      name: 'Node.js',
      status: 'pass',
      message: `Node.js ${current} (meets minimum)`,
    };
  }

  return {
    name: 'Node.js',
    status: 'pass',
    message: `Node.js ${current} (recommended)`,
  };
}

export async function checkPnpm(
  execRunner: ExecRunner,
  autoFix: boolean,
): Promise<DoctorCheckResult> {
  const pnpmAvailable = commandExists('pnpm', execRunner);

  if (pnpmAvailable) {
    return {
      name: 'pnpm',
      status: 'pass',
      message: 'pnpm is available',
    };
  }

  if (!autoFix) {
    return {
      name: 'pnpm',
      status: 'fail',
      message: 'pnpm is not installed',
      fix: 'Enable corepack (corepack enable) or install pnpm (npm install -g pnpm@9.12.0)',
    };
  }

  try {
    const corepackActivated = commandExists('corepack', execRunner);

    if (corepackActivated) {
      execRunner('corepack prepare pnpm@9.12.0 --activate');
    } else {
      execRunner('npm install -g pnpm@9.12.0');
    }

    if (commandExists('pnpm', execRunner)) {
      return {
        name: 'pnpm',
        status: 'pass',
        message: 'pnpm was installed via auto-heal',
        autoFixed: true,
      };
    }
  } catch (error) {
    return {
      name: 'pnpm',
      status: 'fail',
      message: 'pnpm installation failed',
      fix: 'Run corepack prepare pnpm@9.12.0 --activate or install pnpm manually',
    };
  }

  return {
    name: 'pnpm',
    status: 'fail',
    message: 'pnpm could not be installed automatically',
    fix: 'Install pnpm manually (npm install -g pnpm@9.12.0)',
  };
}

export async function checkDocker(execRunner: ExecRunner): Promise<DoctorCheckResult> {
  const dockerExists = commandExists('docker', execRunner);

  if (!dockerExists) {
    return {
      name: 'Docker',
      status: 'fail',
      message: 'Docker CLI not found on PATH',
      fix: 'Install Docker Desktop/Engine and ensure the docker binary is available',
    };
  }

  try {
    const version = execRunner('docker info --format "{{.ServerVersion}}"');
    return {
      name: 'Docker',
      status: 'pass',
      message: `Docker daemon running (v${version || 'unknown'})`,
    };
  } catch (error) {
    return {
      name: 'Docker',
      status: 'warn',
      message: 'Docker CLI found but daemon is not reachable',
      fix: 'Start Docker Desktop/Engine and re-run the doctor command',
    };
  }
}

export async function checkMakefileTargets(cwd: string): Promise<DoctorCheckResult> {
  const makefilePath = path.resolve(cwd, 'Makefile');
  if (!fs.existsSync(makefilePath)) {
    return {
      name: 'Makefile',
      status: 'warn',
      message: 'Makefile not found in repository root',
      fix: 'Restore the Makefile or fetch it from main branch',
    };
  }

  const contents = fs.readFileSync(makefilePath, 'utf-8');
  const missing = REQUIRED_TARGETS.filter(
    (target) => !new RegExp(`^${target}:`, 'm').test(contents),
  );

  if (missing.length === 0) {
    return {
      name: 'Makefile',
      status: 'pass',
      message: 'Required Make targets are present',
    };
  }

  return {
    name: 'Makefile',
    status: 'fail',
    message: `Missing Make targets: ${missing.join(', ')}`,
    fix: 'Re-add missing targets or pull the latest Makefile from main',
  };
}

export async function checkRedis(probe: PortProbe, profile?: Profile): Promise<DoctorCheckResult> {
  const { host, port } = resolveRedisConfig(profile);
  const reachable = await probe(host, port);

  if (reachable) {
    return {
      name: 'Redis',
      status: 'pass',
      message: `Redis reachable at ${host}:${port}`,
    };
  }

  return {
    name: 'Redis',
    status: 'warn',
    message: `Redis not reachable at ${host}:${port}`,
    fix: 'Start Redis (docker compose up redis) or update REDIS_HOST/REDIS_PORT',
  };
}

export async function checkPostgres(probe: PortProbe, profile?: Profile): Promise<DoctorCheckResult> {
  const { host, port } = resolvePostgresConfig(profile);
  const reachable = await probe(host, port);

  if (reachable) {
    return {
      name: 'PostgreSQL',
      status: 'pass',
      message: `PostgreSQL reachable at ${host}:${port}`,
    };
  }

  return {
    name: 'PostgreSQL',
    status: 'warn',
    message: `PostgreSQL not reachable at ${host}:${port}`,
    fix: 'Start Postgres (docker compose up postgres) or update DATABASE_URL/POSTGRES_* env vars',
  };
}

export async function ensureEnvFile(
  envPath: string,
  autoFix: boolean,
): Promise<DoctorCheckResult> {
  if (fs.existsSync(envPath)) {
    return {
      name: '.env file',
      status: 'pass',
      message: `Environment file found at ${envPath}`,
    };
  }

  const examplePath = path.join(path.dirname(envPath), '.env.example');
  if (!fs.existsSync(examplePath)) {
    return {
      name: '.env file',
      status: 'fail',
      message: 'No .env present and .env.example is missing',
      fix: 'Create a .env file or restore .env.example from version control',
    };
  }

  if (!autoFix) {
    return {
      name: '.env file',
      status: 'warn',
      message: 'No .env file found',
      fix: `Copy ${examplePath} to ${envPath} and populate secrets`,
    };
  }

  fs.copyFileSync(examplePath, envPath);
  return {
    name: '.env file',
    status: 'pass',
    message: `Created ${envPath} from .env.example`,
    autoFixed: true,
  };
}

export function resolveRedisConfig(profile?: Profile): { host: string; port: number } {
  if (process.env.REDIS_URL) {
    try {
      const url = new URL(process.env.REDIS_URL);
      return { host: url.hostname, port: Number(url.port) || 6379 };
    } catch (error) {
      // fall back to host/port parsing
    }
  }

  const host = process.env.REDIS_HOST || profile?.neo4j?.uri?.split('://')[1]?.split(':')[0] || '127.0.0.1';
  const port = Number(process.env.REDIS_PORT || 6379);
  return { host, port };
}

export function resolvePostgresConfig(profile?: Profile): { host: string; port: number } {
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      return { host: url.hostname, port: Number(url.port) || 5432 };
    } catch (error) {
      // fall back to host/port parsing
    }
  }

  const host = process.env.POSTGRES_HOST || profile?.postgres?.host || '127.0.0.1';
  const port = Number(process.env.POSTGRES_PORT || profile?.postgres?.port || 5432);
  return { host, port };
}

export function checkSwitchboardProfile(profile: Profile): DoctorCheckResult {
  const sb = profile.switchboard;
  if (!sb || !sb.tenantId) {
    return {
      name: 'Switchboard Profile',
      status: 'fail',
      message: 'Active profile is missing Switchboard configuration',
      fix: 'Use "switchboard profile create" to configure the profile',
    };
  }

  return {
    name: 'Switchboard Profile',
    status: 'pass',
    message: `Profile active for tenant: ${sb.tenantId}`,
  };
}

export async function probePort(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port, timeout: 750 });

    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function commandExists(command: string, execRunner: ExecRunner): boolean {
  try {
    execRunner(`command -v ${command}`);
    return true;
  } catch (error) {
    return false;
  }
}

function summarise(results: DoctorCheckResult[], envPath: string) {
  const summary = {
    total: results.length,
    passed: 0,
    warnings: 0,
    failed: 0,
    autoFixed: 0,
    envPath,
  };

  results.forEach((result) => {
    if (result.status === 'pass') {
      summary.passed += 1;
    }
    if (result.status === 'warn') {
      summary.warnings += 1;
    }
    if (result.status === 'fail') {
      summary.failed += 1;
    }
    if (result.autoFixed) {
      summary.autoFixed += 1;
    }
  });

  return summary;
}
