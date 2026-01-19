import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// minimalist redaction logic
const REDACTION_PATTERNS = [
  // IPv4 internal (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
  { regex: /\b10\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, replacement: '[REDACTED_IP]' },
  { regex: /\b192\.168\.\d{1,3}\.\d{1,3}\b/g, replacement: '[REDACTED_IP]' },
  { regex: /\b172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}\b/g, replacement: '[REDACTED_IP]' },
  // AWS Keys (basic pattern)
  { regex: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g, replacement: '[REDACTED_AWS_KEY]' },
  // Private Keys
  { regex: /-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/g, replacement: '[REDACTED_PRIVATE_KEY]' }
];

async function redactFile(inputPath: string, outputPath: string) {
  let content = await fs.readFile(inputPath, 'utf-8');
  let original = content;

  for (const { regex, replacement } of REDACTION_PATTERNS) {
    content = content.replace(regex, replacement);
  }

  if (content !== original) {
    console.log(`Redacted sensitive info in: ${path.basename(inputPath)}`);
  }

  await fs.writeFile(outputPath, content);
}

async function processDirectory(inputDir: string, outputDir: string) {
  await fs.mkdir(outputDir, { recursive: true });
  const entries = await fs.readdir(inputDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(inputDir, entry.name);
    const destPath = path.join(outputDir, entry.name);

    if (entry.isDirectory()) {
      await processDirectory(srcPath, destPath);
    } else if (entry.isFile()) {
        // Only redact text-based files roughly
        if (entry.name.endsWith('.json') || entry.name.endsWith('.md') || entry.name.endsWith('.txt') || entry.name.endsWith('.xml') || entry.name.endsWith('.log')) {
            await redactFile(srcPath, destPath);
        } else {
            // Copy binary files as is
            await fs.copyFile(srcPath, destPath);
        }
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: tsx redact_public_artifacts.ts <input_dir> <output_dir>');
    process.exit(1);
  }

  const inputDir = args[0];
  const outputDir = args[1];

  console.log(`Starting redaction from ${inputDir} to ${outputDir}...`);
  try {
    await processDirectory(inputDir, outputDir);
    console.log('Redaction complete.');
  } catch (error) {
    console.error('Error during redaction:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
