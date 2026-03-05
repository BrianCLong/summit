import fs from 'fs';
import crypto from 'crypto';
import path from 'path';

/**
 * Generates an evidence bundle with SHA256 hashes of all provided files.
 * Mandatory for GA bitwise reproducibility verification.
 */
function main() {
  const files = process.argv.slice(2);

  if (files.length === 0) {
    console.warn('No files provided to generate evidence bundle. Searching in artifacts/ directory...');

    const supplyChainDir = path.join('artifacts', 'supplychain');
    if (fs.existsSync(supplyChainDir)) {
      const walkSync = (dir, filelist = []) => {
        fs.readdirSync(dir).forEach(file => {
          const filepath = path.join(dir, file);
          if (fs.statSync(filepath).isDirectory()) {
            filelist = walkSync(filepath, filelist);
          } else {
            filelist.push(filepath);
          }
        });
        return filelist;
      };

      const foundFiles = walkSync(supplyChainDir);
      console.log(`Found ${foundFiles.length} supply chain artifacts.`);
      files.push(...foundFiles);
    }
  }

  // Generate hashes
  const bundle = files.map(f => {
    if (!fs.existsSync(f)) {
      console.error(`Error: File not found: ${f}`);
      process.exit(1);
    }
    return {
      file: f,
      sha256: crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')
    };
  });

  // Sort bundle by file path for deterministic ordering
  bundle.sort((a, b) => a.file.localeCompare(b.file));

  // Bundle output (deterministic: no timestamp)
  const output = {
    bundle
  };

  // Stamp output (non-deterministic: timestamp)
  const stamp = {
    generatedAt: new Date().toISOString(),
    filesCount: bundle.length
  };

  const artifactsDir = 'artifacts';
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  const outputPath = path.join(artifactsDir, 'evidence-bundle.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  const stampPath = path.join(artifactsDir, 'stamp.json');
  fs.writeFileSync(stampPath, JSON.stringify(stamp, null, 2));

  console.log(`Evidence bundle generated at ${outputPath} with ${bundle.length} entries.`);
  console.log(`Stamp generated at ${stampPath}`);
}

main();
