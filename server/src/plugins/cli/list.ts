import fs from 'fs';
import path from 'path';
import { ManifestValidator } from '../sdk/validator.js';

export async function listPlugins(pluginsDir: string): Promise<void> {
  if (!fs.existsSync(pluginsDir)) {
    console.error(`Plugins directory not found: ${pluginsDir}`);
    return;
  }

  const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
  const plugins = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const manifestPath = path.join(pluginsDir, entry.name, 'plugin.json');
      if (fs.existsSync(manifestPath)) {
        try {
          const content = fs.readFileSync(manifestPath, 'utf-8');
          const json = JSON.parse(content);
          const result = ManifestValidator.validate(json);
          if (result.success) {
            plugins.push({ dir: entry.name, ...result.data });
          } else {
            plugins.push({ dir: entry.name, error: 'Invalid Manifest', details: result.errors });
          }
        } catch (e: any) {
          plugins.push({ dir: entry.name, error: 'Read/Parse Error' });
        }
      }
    }
  }

  console.log('Detected Plugins:');
  console.table(plugins.map(p => {
      if ('error' in p) return { Directory: p.dir, Status: 'INVALID', Error: p.error };
      return {
          Directory: p.dir,
          Name: p.name,
          Version: p.version,
          Type: p.type,
          Risk: p.riskLevel
      };
  }));
}

// Simple CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const targetDir = process.argv[2] || './plugins'; // Default to a local plugins folder
  listPlugins(targetDir);
}
