import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { PluginManifestSchema } from '@summit/plugin-sdk';

export async function validatePlugin(): Promise<void> {
  const spinner = ora('Validating plugin...').start();

  try {
    // Read plugin.json
    const manifestPath = path.join(process.cwd(), 'plugin.json');
    if (!await fs.pathExists(manifestPath)) {
      spinner.fail(chalk.red('plugin.json not found'));
      return;
    }

    const manifest = await fs.readJson(manifestPath);

    // Validate manifest
    const result = PluginManifestSchema.safeParse(manifest);

    if (!result.success) {
      spinner.fail(chalk.red('Invalid plugin manifest'));
      console.log('\nValidation errors:');
      result.error.issues.forEach(issue => {
        console.log(chalk.red(`  - ${issue.path.join('.')}: ${issue.message}`));
      });
      return;
    }

    // Check if dist exists
    const distExists = await fs.pathExists(path.join(process.cwd(), 'dist'));
    if (!distExists) {
      spinner.warn(chalk.yellow('dist/ directory not found. Run build first.'));
    }

    spinner.succeed(chalk.green('Plugin validation passed!'));
  } catch (error) {
    spinner.fail(chalk.red('Validation failed'));
    console.error(error);
  }
}
