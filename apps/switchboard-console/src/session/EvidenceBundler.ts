import { copyFile, mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

interface EvidenceBundle {
  sessionId: string;
  createdAt: string;
  files: string[];
}

export class EvidenceBundler {
  constructor(private readonly sessionDir: string) {}

  async createBundle(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const bundleDir = path.join(this.sessionDir, 'evidence', timestamp);
    await mkdir(bundleDir, { recursive: true });

    const files = await this.collectFiles(this.sessionDir);
    const copiedFiles: string[] = [];

    for (const file of files) {
      const relative = path.relative(this.sessionDir, file);
      const destination = path.join(bundleDir, relative);
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(file, destination);
      copiedFiles.push(relative);
    }

    const manifest: EvidenceBundle = {
      sessionId: path.basename(this.sessionDir),
      createdAt: new Date().toISOString(),
      files: copiedFiles,
    };

    const manifestPath = path.join(bundleDir, 'manifest.json');
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    return bundleDir;
  }

  private async collectFiles(dir: string): Promise<string[]> {
    const entries = await readdir(dir);
    const files: string[] = [];

    for (const entry of entries) {
      if (entry === 'evidence') {
        continue;
      }
      const fullPath = path.join(dir, entry);
      const entryStat = await stat(fullPath);
      if (entryStat.isDirectory()) {
        files.push(...(await this.collectFiles(fullPath)));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }
}
