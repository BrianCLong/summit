import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '../../');
const ARTIFACTS_DIR = path.join(ROOT_DIR, 'artifacts/enterprise');
const TAG = process.env.TAG || 'dev-snapshot';
const OUTPUT_DIR = path.join(ARTIFACTS_DIR, TAG);

// Helper to copy directory recursively
function copyRecursiveSync(src: string, dest: string) {
  const exists = fs.existsSync(src);
  if (!exists) return;

  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Calculate SHA256 of a file
function calculateChecksum(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
}

function generateManifest(dir: string, baseDir: string): Record<string, string> {
    const manifest: Record<string, string> = {};
    const walkSync = (d: string) => {
        if (!fs.existsSync(d)) return;
        const files = fs.readdirSync(d);
        files.forEach(file => {
            const filepath = path.join(d, file);
            const stats = fs.statSync(filepath);
            if (stats.isDirectory()) {
                walkSync(filepath);
            } else {
                const relativePath = path.relative(baseDir, filepath);
                manifest[relativePath] = calculateChecksum(filepath);
            }
        });
    };
    walkSync(dir);
    return manifest;
}

function main() {
  console.log(`📦 Packaging Enterprise Adoption Kit for tag: ${TAG}`);

  // 1. Create Output Directory
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // 2. Copy Artifacts
  const kitDir = path.join(OUTPUT_DIR, 'adoption-kit');
  fs.mkdirSync(kitDir, { recursive: true });

  // Copy Docs
  copyRecursiveSync(path.join(ROOT_DIR, 'docs/enterprise/reference-architectures'), path.join(kitDir, 'reference-architectures'));
  copyRecursiveSync(path.join(ROOT_DIR, 'docs/enterprise/onboarding'), path.join(kitDir, 'onboarding'));
  copyRecursiveSync(path.join(ROOT_DIR, 'docs/enterprise/due-diligence'), path.join(kitDir, 'due-diligence'));

  // Copy Overlays
  copyRecursiveSync(path.join(ROOT_DIR, 'deployment/overlays'), path.join(kitDir, 'overlays'));

  // 3. Generate Stamp
  const stamp = {
    tag: TAG,
    timestamp: new Date().toISOString(),
    builder: 'Summit Release Bot',
    components: [
        'reference-architectures',
        'onboarding-runbooks',
        'due-diligence-kit',
        'secure-overlays'
    ]
  };

  fs.writeFileSync(path.join(OUTPUT_DIR, 'stamp.json'), JSON.stringify(stamp, null, 2));

  // 4. Generate Manifest (Checksums)
  const manifest = generateManifest(kitDir, OUTPUT_DIR);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`✅ Package created at ${OUTPUT_DIR}`);
}

main();
