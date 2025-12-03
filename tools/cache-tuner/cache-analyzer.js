import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_WEEK_MS = ONE_DAY_MS * 7;

function normalizePath(target) {
  return path.resolve(target.replace(/^~/, os.homedir()));
}

export function computeDirectoryStats(target) {
  const normalized = normalizePath(target);
  const exists = fs.existsSync(normalized);

  const result = {
    path: normalized,
    exists,
    sizeBytes: 0,
    latestMtime: null,
    errors: [],
  };

  if (!exists) {
    return result;
  }

  const stack = [normalized];

  while (stack.length) {
    const current = stack.pop();
    let entries;

    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (error) {
      result.errors.push({ path: current, message: error.message });
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);

      try {
        const stat = fs.lstatSync(fullPath);
        if (stat.isSymbolicLink()) {
          continue;
        }
        result.sizeBytes += stat.size;
        if (!result.latestMtime || stat.mtimeMs > result.latestMtime) {
          result.latestMtime = stat.mtimeMs;
        }

        if (entry.isDirectory()) {
          stack.push(fullPath);
        }
      } catch (error) {
        result.errors.push({ path: fullPath, message: error.message });
      }
    }
  }

  if (result.latestMtime) {
    result.latestMtime = new Date(result.latestMtime);
  }

  return result;
}

function runCommand(command, args, options = {}) {
  const runResult = spawnSync(command, args, { encoding: 'utf8', ...options });
  if (runResult.error) {
    return { ok: false, stdout: '', stderr: runResult.error.message, status: runResult.status ?? 1 };
  }

  return { ok: runResult.status === 0, stdout: runResult.stdout.trim(), stderr: runResult.stderr.trim(), status: runResult.status };
}

function resolvePnpmStorePath(explicitPath, workspaceRoot = process.cwd()) {
  if (explicitPath) {
    return normalizePath(explicitPath);
  }

  const configured = runCommand('pnpm', ['config', 'get', 'store-dir'], { cwd: workspaceRoot });
  if (configured.ok && configured.stdout) {
    return normalizePath(configured.stdout);
  }

  return normalizePath(path.join(os.homedir(), '.pnpm-store'));
}

export function detectPnpmCache({ workspaceRoot, storeOverride } = {}) {
  const root = workspaceRoot ?? process.cwd();
  const recommendedStore = path.join(root, '.cache/pnpm-store');
  const storeDir = resolvePnpmStorePath(storeOverride, root);
  const stats = computeDirectoryStats(storeDir);
  const now = Date.now();

  const isEphemeral = stats.path.startsWith('/tmp') || stats.path.includes('TEMP') || stats.path.includes('Temp');
  const isStale = Boolean(stats.latestMtime && now - stats.latestMtime.getTime() > ONE_WEEK_MS);
  const isHeavy = stats.sizeBytes > 8 * 1024 * 1024 * 1024;
  const usingRecommendedStore = stats.path === recommendedStore;

  const findings = [];
  const actions = [];

  if (!stats.exists) {
    findings.push('PNPM store directory is missing; installs will run without cache reuse.');
  }

  const shouldRelocate = !usingRecommendedStore || isEphemeral;
  if (shouldRelocate) {
    findings.push(`PNPM store should live in ${recommendedStore} for persistence across runs.`);
    actions.push({
      id: 'pnpm-store-relocation',
      description: 'Move PNPM store into a workspace-local persistent cache for CI reuse.',
      type: 'env',
      env: 'PNPM_STORE_DIR',
      value: recommendedStore,
    });
    actions.push({
      id: 'pnpm-store-bootstrap',
      description: 'Create the recommended PNPM store location.',
      type: 'mkdir',
      path: recommendedStore,
    });
  }

  if (!stats.exists && !shouldRelocate) {
    actions.push({
      id: 'pnpm-store-bootstrap',
      description: 'Create the PNPM store directory to enable caching.',
      type: 'mkdir',
      path: storeDir,
    });
  }

  if (isEphemeral) {
    findings.push(`PNPM store is located in a volatile path (${stats.path}).`);
  }

  if (isStale || isHeavy) {
    const qualifier = isStale && isHeavy ? 'large and stale' : isHeavy ? 'large' : 'stale';
    findings.push(`PNPM store is ${qualifier}; pruning can reclaim space and speed lookups.`);
    actions.push({
      id: 'pnpm-store-prune',
      description: 'Prune unused PNPM store entries to reduce lookup overhead.',
      type: 'command',
      command: ['pnpm', 'store', 'prune', '--silent'],
    });
  }

  return {
    kind: 'pnpm',
    path: stats.path,
    stats,
    isEphemeral,
    isStale,
    isHeavy,
    recommendedStore,
    findings,
    actions,
  };
}

export function detectTurboCache({ workspaceRoot } = {}) {
  const configPath = path.join(workspaceRoot ?? process.cwd(), 'turbo.json');
  const cacheDir = process.env.TURBO_CACHE_DIR
    ? normalizePath(process.env.TURBO_CACHE_DIR)
    : path.join(workspaceRoot ?? process.cwd(), '.turbo');

  const stats = computeDirectoryStats(cacheDir);

  let turboConfig;
  if (fs.existsSync(configPath)) {
    try {
      turboConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      turboConfig = { error: error.message };
    }
  }

  const cacheDisabledTasks = [];
  if (turboConfig && turboConfig.tasks) {
    for (const [taskName, taskConfig] of Object.entries(turboConfig.tasks)) {
      if (taskConfig && taskConfig.cache === false) {
        cacheDisabledTasks.push(taskName);
      }
    }
  }

  const actions = [];
  const findings = [];

  if (!stats.exists) {
    findings.push('Turbo cache directory is missing; tasks will always re-compute outputs.');
    actions.push({
      id: 'turbo-cache-bootstrap',
      description: 'Pre-create the turbo cache directory to avoid first-write latency.',
      type: 'mkdir',
      path: cacheDir,
    });
  }

  if (cacheDisabledTasks.length) {
    findings.push(`Turbo cache is disabled for: ${cacheDisabledTasks.join(', ')}.`);
  }

  return {
    kind: 'turbo',
    path: cacheDir,
    stats,
    cacheDisabledTasks,
    turboConfig,
    actions,
    findings,
  };
}

export function detectNxCache({ workspaceRoot } = {}) {
  const root = workspaceRoot ?? process.cwd();
  const nxJsonPath = path.join(root, 'nx.json');
  const cacheDir = process.env.NX_CACHE_DIRECTORY
    ? normalizePath(process.env.NX_CACHE_DIRECTORY)
    : path.join(root, '.nx', 'cache');

  const stats = computeDirectoryStats(cacheDir);
  const nxConfigPresent = fs.existsSync(nxJsonPath);

  const findings = [];
  const actions = [];

  if (!nxConfigPresent) {
    findings.push('No nx.json found; Nx caching is not active in this workspace.');
  } else if (!stats.exists) {
    findings.push('Nx cache directory is missing; enabling it improves task reuse.');
    actions.push({
      id: 'nx-cache-bootstrap',
      description: 'Create Nx cache directory for faster command reuse.',
      type: 'mkdir',
      path: cacheDir,
    });
  }

  return {
    kind: 'nx',
    path: cacheDir,
    stats,
    nxConfigPresent,
    findings,
    actions,
  };
}

export function detectTypeScriptCache({ workspaceRoot } = {}) {
  const root = workspaceRoot ?? process.cwd();
  const tsbuildInfoFiles = [];

  const queue = [root];
  while (queue.length) {
    const current = queue.pop();
    let entries;

    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (error) {
      continue;
    }

    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.git')) {
        continue;
      }

      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
      } else if (entry.name.endsWith('.tsbuildinfo')) {
        const stat = fs.statSync(fullPath);
        tsbuildInfoFiles.push({ path: fullPath, mtime: stat.mtime, sizeBytes: stat.size });
      }
    }
  }

  const findings = [];
  const actions = [];
  const recommendedDir = path.join(root, '.cache', 'tsbuildinfo');

  if (!tsbuildInfoFiles.length) {
    findings.push('No TypeScript incremental caches detected; builds may always be cold.');
    actions.push({
      id: 'tscache-bootstrap',
      description: 'Ensure TypeScript incremental build info is stored in a persistent cache directory.',
      type: 'mkdir',
      path: recommendedDir,
    });
  } else {
    const staleFiles = tsbuildInfoFiles.filter((file) => Date.now() - file.mtime.getTime() > ONE_WEEK_MS);
    if (staleFiles.length) {
      findings.push('TypeScript build info files are stale; consider clearing them to reduce incremental mismatch risk.');
      actions.push({
        id: 'tscache-clean',
        description: 'Remove stale .tsbuildinfo files to force a fresh incremental baseline.',
        type: 'cleanup-list',
        paths: staleFiles.map((file) => file.path),
      });
    }
  }

  return {
    kind: 'typescript',
    recommendedDir,
    files: tsbuildInfoFiles,
    findings,
    actions,
  };
}

export function buildOptimizationPlan(facts) {
  const optimizations = [];
  const findings = [];

  for (const fact of facts) {
    findings.push(...fact.findings);
    optimizations.push(...fact.actions);
  }

  const envExports = optimizations
    .filter((item) => item.type === 'env')
    .map((envAction) => `export ${envAction.env}=${envAction.value}`);

  return {
    findings,
    optimizations,
    envExports,
  };
}

export function applyPlan(plan, { workspaceRoot, executeCommands = true } = {}) {
  const root = workspaceRoot ?? process.cwd();
  const executedCommands = [];
  const ensuredDirectories = [];
  const cleanedFiles = [];

  for (const optimization of plan.optimizations) {
    if (optimization.type === 'mkdir') {
      fs.mkdirSync(optimization.path, { recursive: true });
      ensuredDirectories.push(optimization.path);
    }

    if (optimization.type === 'cleanup-list') {
      for (const target of optimization.paths) {
        if (fs.existsSync(target)) {
          fs.rmSync(target);
          cleanedFiles.push(target);
        }
      }
    }

    if (optimization.type === 'env') {
      const dir = path.dirname(optimization.value);
      fs.mkdirSync(dir, { recursive: true });
      ensuredDirectories.push(dir);
    }

    if (executeCommands && optimization.type === 'command') {
      const result = runCommand(optimization.command[0], optimization.command.slice(1), { cwd: root });
      executedCommands.push({ optimization: optimization.id, ...result });
    }
  }

  const envFilePath = plan.envExports.length
    ? path.join(root, '.cache', 'cache-tuner.env')
    : null;

  if (envFilePath) {
    fs.mkdirSync(path.dirname(envFilePath), { recursive: true });
    fs.writeFileSync(envFilePath, `${plan.envExports.join('\n')}\n`, 'utf8');
  }

  return {
    ensuredDirectories,
    cleanedFiles,
    executedCommands,
    envFilePath,
  };
}

export function collectFacts(workspaceRoot = process.cwd()) {
  return [
    detectPnpmCache({ workspaceRoot }),
    detectTurboCache({ workspaceRoot }),
    detectNxCache({ workspaceRoot }),
    detectTypeScriptCache({ workspaceRoot }),
  ];
}

export function formatBytes(bytes) {
  if (bytes === 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(1)} ${units[exponent]}`;
}
