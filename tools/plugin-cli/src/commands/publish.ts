import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';

export async function publishPlugin(options: {
  registry?: string;
  dryRun?: boolean;
}): Promise<void> {
  const spinner = ora('Publishing plugin...').start();

  try {
    const registryUrl = options.registry || process.env.SUMMIT_REGISTRY_URL || 'http://localhost:3001';

    // Read manifest
    const manifest = await fs.readJson(path.join(process.cwd(), 'plugin.json'));

    // Check if built
    const distExists = await fs.pathExists(path.join(process.cwd(), 'dist'));
    if (!distExists) {
      spinner.fail(chalk.red('Plugin not built. Run build first.'));
      return;
    }

    if (options.dryRun) {
      spinner.info(chalk.blue('Dry run - would publish:'));
      console.log(JSON.stringify(manifest, null, 2));
      return;
    }

    // Package plugin
    spinner.text = 'Packaging plugin...';
    // In real implementation, would create tarball

    // Upload to registry
    spinner.text = 'Uploading to registry...';
    const response = await fetch(`${registryUrl}/api/plugins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        manifest,
        packageUrl: 'https://example.com/plugins/package.tar.gz', // Would be actual URL
      }),
    });

    if (!response.ok) {
      throw new Error(`Registry returned ${response.status}: ${await response.text()}`);
    }

    spinner.succeed(chalk.green(`Plugin ${manifest.id}@${manifest.version} published successfully!`));
  } catch (error) {
    spinner.fail(chalk.red('Publish failed'));
    console.error(error);
  }
}
