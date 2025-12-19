import fs from 'fs-extra';
import path from 'path';
import { createHash } from 'crypto';
import { BundleManifest, manifestSchema } from './schemas';

export interface BuildBundleOptions {
  manifest: BundleManifest;
  sourceDir: string;
  outputDir: string;
  sign?: (artifactPath: string) => Promise<string>;
}

export async function buildBundle(options: BuildBundleOptions): Promise<string> {
  const parsed = manifestSchema.parse(options.manifest);
  const bundleDir = path.resolve(options.outputDir, `${parsed.name}-${parsed.version}`);
  await fs.emptyDir(bundleDir);

  const manifestPath = path.join(bundleDir, 'manifest.json');
  await fs.writeJson(manifestPath, parsed, { spaces: 2 });

  // Copy source payload (adapter code + assets)
  const payloadDir = path.join(bundleDir, 'payload');
  await fs.ensureDir(payloadDir);
  await fs.copy(options.sourceDir, payloadDir, {
    filter: (src) => !src.includes('node_modules') && !src.includes('dist'),
  });

  // Produce basic digest to aid receipts; real implementation should supply SBOM/SLSA externally.
  const digest = await hashDirectory(payloadDir);
  const digestPath = path.join(bundleDir, 'digest.txt');
  await fs.writeFile(digestPath, digest, 'utf8');

  if (options.sign) {
    const signature = await options.sign(bundleDir);
    await fs.writeFile(path.join(bundleDir, 'signature.txt'), signature, 'utf8');
  }

  return bundleDir;
}

async function hashDirectory(dir: string): Promise<string> {
  const hash = createHash('sha256');
  const entries = await fs.readdir(dir);
  for (const entry of entries.sort()) {
    const full = path.join(dir, entry);
    const stat = await fs.stat(full);
    if (stat.isDirectory()) {
      hash.update(await hashDirectory(full));
    } else {
      hash.update(await fs.readFile(full));
    }
  }
  return hash.digest('hex');
}
