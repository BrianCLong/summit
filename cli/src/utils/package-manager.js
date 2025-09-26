import { existsSync } from 'node:fs';
import path from 'node:path';

const PACKAGE_MANAGER_PRIORITY = ['pnpm', 'npm', 'yarn'];

export function detectPackageManager(preferred) {
  if (preferred && PACKAGE_MANAGER_PRIORITY.includes(preferred)) {
    return preferred;
  }

  const root = process.cwd();

  if (existsSync(path.join(root, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }

  if (existsSync(path.join(root, 'package-lock.json'))) {
    return 'npm';
  }

  if (existsSync(path.join(root, 'yarn.lock'))) {
    return 'yarn';
  }

  return PACKAGE_MANAGER_PRIORITY[0];
}

export function buildRunCommand(packageManager, script, options = {}) {
  const scope = options.scope;
  const args = options.args ?? [];

  switch (packageManager) {
    case 'pnpm': {
      const base = scope ? ['--filter', scope, 'run', script] : ['run', script];
      const extras = args.length > 0 ? ['--', ...args] : [];
      return { command: 'pnpm', args: [...base, ...extras] };
    }
    case 'yarn': {
      const base = scope && scope !== 'all'
        ? ['workspace', scope, 'run', script]
        : ['run', script];
      return { command: 'yarn', args: [...base, ...args] };
    }
    case 'npm':
    default: {
      const base = ['run', script];
      if (scope && scope !== 'all') {
        base.push('--workspace', scope);
      }
      const extras = args.length > 0 ? ['--', ...args] : [];
      return { command: 'npm', args: [...base, ...extras] };
    }
  }
}
