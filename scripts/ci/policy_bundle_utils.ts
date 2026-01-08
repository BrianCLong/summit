
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export interface BundleFileEntry {
  sourcePath: string; // Absolute or relative to CWD
  path: string;       // Path inside bundle
  size: number;
  sha256: string;
}

export const POLICY_DIR = 'policy';
export const DIST_DIR = 'dist/policy-bundle';
export const LOCK_FILE = 'policy-bundle.lock';

// Map source directories to bundle destinations
// Source -> Destination (relative to bundle root)
// '.' means files directly in POLICY_DIR
export const DIRECTORY_MAPPINGS: Record<string, string> = {
    '.': 'policies',
    'schema': 'schemas',
    'sample_inputs': 'test-vectors'
};

// Files/Dirs to exclude
export const EXCLUDES = [
    'bundle',
    'node_modules',
    '.git',
    'dist'
];

async function calculateHash(filePath: string): Promise<string> {
  const fileBuffer = await fs.readFile(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

async function getFilesRecursively(dir: string, baseDir: string = ''): Promise<string[]> {
  let files: string[] = [];
  try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(baseDir, entry.name);

        if (EXCLUDES.includes(entry.name)) continue;

        if (entry.isDirectory()) {
          files = files.concat(await getFilesRecursively(fullPath, relativePath));
        } else if (entry.isFile()) {
          files.push(relativePath);
        }
      }
  } catch (e) {
      // Directory might not exist, ignore
  }
  return files;
}

export async function collectBundleFiles(sourceRoot: string): Promise<{
    files: BundleFileEntry[],
    contentHash: string
}> {
    const bundleFiles: BundleFileEntry[] = [];
    const allSourceFiles = await getFilesRecursively(sourceRoot);

    // Deterministic sort
    allSourceFiles.sort();

    for (const file of allSourceFiles) {
        // file is relative to sourceRoot e.g. "access_control.rego" or "schema/foo.json"

        const parts = file.split(path.sep);
        const topDir = parts.length > 1 ? parts[0] : '.';

        let destRelativePath = '';

        if (DIRECTORY_MAPPINGS[topDir]) {
             const destDir = DIRECTORY_MAPPINGS[topDir];
             const rest = parts.length > 1 ? parts.slice(1).join(path.sep) : parts[0];

             if (topDir === '.') {
                 destRelativePath = path.join(destDir, file);
             } else {
                 destRelativePath = path.join(destDir, rest);
             }
        } else {
             // Default to policies/
             destRelativePath = path.join('policies', file);
        }

        const srcPath = path.join(sourceRoot, file);
        const stats = await fs.stat(srcPath);
        const sha256 = await calculateHash(srcPath);

        bundleFiles.push({
            sourcePath: srcPath,
            path: destRelativePath,
            size: stats.size,
            sha256: sha256
        });
    }

    // Re-sort based on destination path to ensure deterministic manifest order
    bundleFiles.sort((a, b) => a.path.localeCompare(b.path));

    const contentHash = bundleFiles.reduce((acc, file) => {
        return crypto.createHash('sha256').update(acc + file.sha256).digest('hex');
    }, '');

    return { files: bundleFiles, contentHash };
}
