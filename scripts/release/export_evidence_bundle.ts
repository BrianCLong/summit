import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import yaml from 'js-yaml';

const ARTIFACTS_DIR = path.join(process.cwd(), 'artifacts');
const BUNDLE_ROOT = path.join(ARTIFACTS_DIR, 'release-bundles');
const CONTROL_MAP_PATH = path.join(process.cwd(), 'docs/compliance/control_evidence_map.yml');
const CATALOG_PATH = path.join(process.cwd(), 'docs/compliance/control_catalog.yml');

// Helper to copy file
function copyFile(src: string, dest: string) {
  if (fs.existsSync(src)) {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
        fs.cpSync(src, dest, { recursive: true });
    } else {
        const destDir = path.dirname(dest);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(src, dest);
    }
  } else {
    console.warn(`Warning: Source file not found: ${src}`);
  }
}

// Helper to calculate checksum
function calculateFileChecksum(filePath: string): string {
    if (!fs.existsSync(filePath)) return '';
    if (fs.statSync(filePath).isDirectory()) return ''; // Skip directories for now

    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

async function exportBundle() {
  const sha = process.env.GITHUB_SHA || 'local-sha';
  const bundleDir = path.join(BUNDLE_ROOT, sha);

  if (fs.existsSync(bundleDir)) {
    fs.rmSync(bundleDir, { recursive: true, force: true });
  }
  fs.mkdirSync(bundleDir, { recursive: true });

  const structure = ['evidence', 'policies', 'runbooks', 'attestations'];
  structure.forEach(dir => fs.mkdirSync(path.join(bundleDir, dir)));

  console.log(`Exporting bundle for SHA: ${sha}`);

  // 1. Copy Policies (Catalog & Map)
  copyFile(CATALOG_PATH, path.join(bundleDir, 'policies', 'control_catalog.yml'));
  copyFile(CONTROL_MAP_PATH, path.join(bundleDir, 'policies', 'control_evidence_map.yml'));

  // 2. Read Evidence Map to copy artifacts
  try {
      const mapContent = fs.readFileSync(CONTROL_MAP_PATH, 'utf8');
      const map = yaml.load(mapContent) as any;

      if (map && map.mappings) {
          map.mappings.forEach((mapping: any) => {
              // Copy Artifacts
              if (mapping.artifacts) {
                  mapping.artifacts.forEach((artifact: string) => {
                      const srcPath = path.join(process.cwd(), artifact);
                      const destPath = path.join(bundleDir, 'evidence', artifact);
                      copyFile(srcPath, destPath);
                  });
              }
              // Copy Docs
              if (mapping.docs) {
                  mapping.docs.forEach((doc: string) => {
                       const srcPath = path.join(process.cwd(), doc);
                       // We can put docs in 'runbooks' or 'evidence/docs'
                       // The schema separates docs, but for the bundle we might want to mirror structure or group them.
                       // Let's mirror structure under 'evidence' for simplicity unless they are specifically runbooks.
                       // Actually, the prompt says "evidence/ (copied/linked artifacts)" and "runbooks/ (indexes + critical docs)"
                       // I'll put docs in 'evidence' unless they are in 'docs/runbooks'

                       let destDir = 'evidence';
                       if (doc.includes('runbooks') || doc.includes('GO_NO_GO')) {
                           destDir = 'runbooks';
                       }

                       const destPath = path.join(bundleDir, destDir, doc);
                       copyFile(srcPath, destPath);
                  });
              }
          });
      }
  } catch (error) {
      console.error('Error processing evidence map:', error);
  }

  // Generate Manifest
  const manifest = {
      bundle_id: sha,
      timestamp: new Date().toISOString(),
      contents: [] as any[]
  };

  // Generate Checksums
  const checksums: string[] = [];

  function walkDir(dir: string, baseDir: string) {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
              walkDir(filePath, baseDir);
          } else {
              const relPath = path.relative(baseDir, filePath);
              const checksum = calculateFileChecksum(filePath);
              checksums.push(`${checksum}  ${relPath}`);
              manifest.contents.push({ path: relPath, sha256: checksum });
          }
      });
  }

  walkDir(bundleDir, bundleDir);

  // Write Manifest
  // We want deterministic output, so we sort contents
  manifest.contents.sort((a, b) => a.path.localeCompare(b.path));
  fs.writeFileSync(path.join(bundleDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // Write Checksums (sorted)
  checksums.sort();
  fs.writeFileSync(path.join(bundleDir, 'checksums.txt'), checksums.join('\n'));

  console.log(`Bundle exported to: ${bundleDir}`);
}

exportBundle();
