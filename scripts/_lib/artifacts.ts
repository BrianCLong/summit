import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export class ArtifactManager {
  private rootDir: string;
  private runId: string;

  constructor(rootDir: string = 'artifacts') {
    this.rootDir = path.resolve(process.cwd(), rootDir);
    this.runId = new Date().toISOString().replace(/[:.]/g, '-');
  }

  ensureDir(subPath: string): string {
    const fullPath = path.join(this.rootDir, subPath);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
    return fullPath;
  }

  writeJSON(subPath: string, filename: string, data: any): string {
    const dir = this.ensureDir(subPath);
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return filePath;
  }

  writeText(subPath: string, filename: string, content: string): string {
    const dir = this.ensureDir(subPath);
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, content);
    return filePath;
  }

  getPath(subPath: string, filename?: string): string {
    const dir = path.join(this.rootDir, subPath);
    return filename ? path.join(dir, filename) : dir;
  }

  generateManifest(name: string, files: string[]): any {
    return {
        name,
        timestamp: new Date().toISOString(),
        files: files.map(f => {
            const absolutePath = path.resolve(f);
            return {
                path: f,
                sha256: this.computeSha256(absolutePath)
            };
        })
    };
  }

  private computeSha256(filePath: string): string {
      if (!fs.existsSync(filePath)) return '';
      const fileBuffer = fs.readFileSync(filePath);
      const hashSum = crypto.createHash('sha256');
      hashSum.update(fileBuffer);
      return hashSum.digest('hex');
  }
}
