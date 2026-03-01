import fs from 'fs';
import crypto from 'crypto';
import path from 'path';

/**
 * Generates an evidence bundle with SHA256 hashes of all provided files.
 * Mandatory for GA bitwise reproducibility verification.
 */
function main() {
  const args = process.argv.slice(2);
  let files = [];

  if (args.length === 0) {
    console.log('No files provided to generate evidence bundle. Searching in artifacts/ directory...');
    const artifactsDir = 'artifacts';
    if (fs.existsSync(artifactsDir)) {
      const findFiles = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const res = path.resolve(dir, entry.name);
          if (entry.isDirectory()) {
            findFiles(res);
          } else if (entry.name.endsWith('.json') || entry.name.endsWith('.txt') || entry.name.endsWith('.log')) {
            files.push(path.relative(process.cwd(), res));
          }
        }
      };
      findFiles(artifactsDir);
    }
  } else {
    files = args;
  }

  if (files.length === 0) {
    console.error('Error: No supply chain artifacts found to bundle.');
    process.exit(1);
  }

  // Sort files for deterministic processing order
  files.sort();

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

  const output = {
    // timestamp removed for determinism; use evidence-stamp.json if needed
    bundle
  };

  const artifactsDir = 'artifacts';
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  const outputPath = path.join(artifactsDir, 'evidence-bundle.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  // Write a separate stamp file with runtime metadata (not part of the deterministic bundle)
  const stampPath = path.join(artifactsDir, 'evidence-stamp.json');
  fs.writeFileSync(stampPath, JSON.stringify({ generatedAt: new Date().toISOString() }, null, 2));

  console.log(`Evidence bundle generated at ${outputPath} with ${bundle.length} entries.`);
  console.log(`Runtime stamp generated at ${stampPath}.`);
}

main();
