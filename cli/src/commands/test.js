import { runCommand } from '../utils/exec.js';
import { detectPackageManager, buildRunCommand } from '../utils/package-manager.js';

const SUPPORTED_SCOPES = ['all', 'server', 'client'];

export async function runTest(options) {
  const scope = options.scope ?? 'all';
  if (scope && !SUPPORTED_SCOPES.includes(scope)) {
    console.warn(`Unknown scope "${scope}". Falling back to workspace name matching.`);
  }

  const packageManager = detectPackageManager(options.packageManager);
  const extraArgs = [...(options.passthrough ?? [])];

  if (options.watch && !extraArgs.includes('--watch')) {
    extraArgs.push('--watch');
  }

  const commandConfig = buildRunCommand(packageManager, 'test', {
    scope: scope === 'all' ? undefined : scope,
    args: extraArgs
  });

  const scopeLabel = scope === 'all' ? 'all scopes' : scope || 'all scopes';
  console.log(`Running tests with ${packageManager} (${scopeLabel})`);
  await runCommand(commandConfig.command, commandConfig.args, { shell: false });
}
