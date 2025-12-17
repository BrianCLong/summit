import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get the template directory for a given service type
 */
export function getTemplateDir(type: string): string {
  // First check local templates directory
  const localTemplates = path.join(__dirname, '../../templates', type);

  // Then check installed package templates
  const packageTemplates = path.resolve(__dirname, '../../../templates', type);

  return localTemplates;
}

/**
 * Get the output directory for a new service
 */
export function getOutputDir(type: string, name: string): string {
  const cwd = process.cwd();

  // Determine the appropriate subdirectory based on type
  const typeToDir: Record<string, string> = {
    'api-service': 'services',
    worker: 'services',
    'batch-job': 'pipelines',
    'data-service': 'services',
    frontend: 'apps',
    library: 'packages',
  };

  const subdir = typeToDir[type] || 'services';

  return path.join(cwd, subdir, name);
}

/**
 * Get the root directory of the monorepo
 */
export function getMonorepoRoot(): string {
  let dir = process.cwd();

  while (dir !== '/') {
    const pnpmWorkspace = path.join(dir, 'pnpm-workspace.yaml');
    const packageJson = path.join(dir, 'package.json');

    try {
      const fs = require('fs');
      if (fs.existsSync(pnpmWorkspace)) {
        return dir;
      }
    } catch {
      // Continue searching
    }

    dir = path.dirname(dir);
  }

  return process.cwd();
}
