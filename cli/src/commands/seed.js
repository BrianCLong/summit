import { runCommand } from '../utils/exec.js';
import { detectPackageManager, buildRunCommand } from '../utils/package-manager.js';

export async function runSeed(options) {
  const packageManager = detectPackageManager(options.packageManager);
  const commandConfig = buildRunCommand(packageManager, 'db:seed');
  const commandPreview = `${commandConfig.command} ${commandConfig.args.join(' ')}`.trim();

  if (options.dryRun) {
    console.log(`[dry-run] ${commandPreview}`);
    return;
  }

  console.log(`Seeding databases using ${commandPreview}`);
  await runCommand(commandConfig.command, commandConfig.args, { shell: false });
}
