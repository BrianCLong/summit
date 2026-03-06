import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const CONTEXT_ROOT = '.summit/context';
const LAYERS = ['guidance', 'instructions', 'interfaces', 'skills'];

export interface ContextFile {
  id: string;
  layer: string;
  path: string;
  content: string;
  hash: string;
  size: number;
}

export interface ContextManifest {
  version: string;
  generatedAt: string;
  files: Record<string, ContextFile>;
}

function computeHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function walkDir(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      walkDir(path.join(dir, file), fileList);
    } else {
      if (file.endsWith('.md') || file.endsWith('.json') || file.endsWith('.ts')) {
        fileList.push(path.join(dir, file));
      }
    }
  }
  return fileList;
}

export function buildManifest(rootDir: string = '.'): ContextManifest {
  const manifest: ContextManifest = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    files: {}
  };

  const contextDir = path.join(rootDir, CONTEXT_ROOT);

  for (const layer of LAYERS) {
    const layerDir = path.join(contextDir, layer);
    const files = walkDir(layerDir);

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const relativePath = path.relative(rootDir, filePath);

      const contentHash = computeHash(content);
      // ID based on Path to be stable per file location
      const pathHash = computeHash(relativePath).substring(0, 8);
      const id = `CTX-${layer.toUpperCase()}-${pathHash}`;

      manifest.files[id] = {
        id,
        layer,
        path: relativePath,
        content,
        hash: contentHash,
        size: content.length
      };
    }
  }

  return manifest;
}
