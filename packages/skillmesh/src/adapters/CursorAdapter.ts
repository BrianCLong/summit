import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import { Adapter, Skill, InstallTarget, InstalledSkill } from '../core/types';

export class CursorAdapter implements Adapter {
  name = 'cursor';

  async detect(): Promise<boolean> {
    // Basic detection logic: check for cursor config dir
    const homeDir = os.homedir();
    // Common paths for Cursor
    const pathsToCheck = [
      path.join(homeDir, '.cursor'),
      path.join(homeDir, 'Library', 'Application Support', 'Cursor'), // macOS
      path.join(homeDir, '.config', 'Cursor'), // Linux
      path.join(homeDir, 'AppData', 'Roaming', 'Cursor') // Windows
    ];

    for (const p of pathsToCheck) {
      if (await fs.pathExists(p)) {
        return true;
      }
    }
    return false;
  }

  private getExtensionDir(): string {
    const homeDir = os.homedir();
    // Default location for many setups
    return path.join(homeDir, '.cursor', 'extensions');
  }

  async getInstallTarget(skill: Skill): Promise<InstallTarget | null> {
    const extensionDir = this.getExtensionDir();

    // We could add more sophisticated discovery here (e.g. checking specific OS paths)
    // but for now we default to ~/.cursor/extensions and create it if missing.

    return {
      tool: 'cursor',
      scope: 'user',
      mode: 'copy', // Enforced policy for Cursor
      location: path.join(extensionDir, skill.manifest.name)
    };
  }

  async install(skill: Skill, target: InstallTarget): Promise<void> {
    if (target.mode !== 'copy') {
      throw new Error(`CursorAdapter only supports 'copy' mode, but '${target.mode}' was requested.`);
    }

    // Ensure target parent exists
    await fs.ensureDir(path.dirname(target.location));

    // Copy skill files
    // We filter out .git and other non-essential files if needed, but simple copy for now
    await fs.copy(skill.location, target.location, {
      dereference: true,
      filter: (src) => !src.includes('.git') // Basic filter
    });
  }

  async listInstalled(): Promise<InstalledSkill[]> {
    const extensionDir = this.getExtensionDir();
    if (!await fs.pathExists(extensionDir)) {
      return [];
    }

    const results: InstalledSkill[] = [];
    const entries = await fs.readdir(extensionDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = path.join(extensionDir, entry.name);

        // Try to read manifest.json (Summit Skill) or package.json (Standard Extension)
        let name = entry.name;
        let version = '0.0.0';

        if (await fs.pathExists(path.join(fullPath, 'manifest.json'))) {
           try {
             const manifest = await fs.readJson(path.join(fullPath, 'manifest.json'));
             name = manifest.name || name;
             version = manifest.version || version;
           } catch (e) {
             // ignore
           }
        } else if (await fs.pathExists(path.join(fullPath, 'package.json'))) {
           try {
             const pkg = await fs.readJson(path.join(fullPath, 'package.json'));
             name = pkg.name || name;
             version = pkg.version || version;
           } catch (e) {
             // ignore
           }
        }

        const stats = await fs.stat(fullPath);

        results.push({
          skillId: name,
          target: {
            tool: 'cursor',
            scope: 'user',
            mode: 'copy',
            location: fullPath
          },
          installedAt: stats.mtime.toISOString(),
          version
        });
      }
    }
    return results;
  }
}
