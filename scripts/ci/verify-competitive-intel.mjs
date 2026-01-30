#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const COMPETITIVE_DIR = 'docs/competitive';
const MANDATORY_FILES = [
  'sources.yml',
  'extractions.md',
  'mapping.yml',
  'risks.md',
  'benchmarks.md',
  'pr-stack.yml'
];

const ID_REGEX = /^ci\.[a-z0-9-]+\.[a-z0-9-]+\.[0-9]+$/;

let hasError = false;

function error(message) {
  console.error(`❌ ${message}`);
  hasError = true;
}

function log(message) {
  console.log(`✅ ${message}`);
}

function validateDossier(target) {
  const dossierPath = path.join(COMPETITIVE_DIR, target);
  if (target === 'template' || target === 'README.md' || target === 'archive') return;
  if (!fs.statSync(dossierPath).isDirectory()) return;

  console.log(`\nAnalyzing dossier: ${target}`);

  // Check mandatory files
  MANDATORY_FILES.forEach(file => {
    if (!fs.existsSync(path.join(dossierPath, file))) {
      error(`Missing mandatory file: ${file} in ${target}`);
    }
  });

  const extractionsPath = path.join(dossierPath, 'extractions.md');
  if (fs.existsSync(extractionsPath)) {
    validateExtractions(extractionsPath, target);
  }
}

function validateExtractions(filePath, target) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Simple bullet parser for the specific format
  const blocks = content.split(/\n-\s+ID:/g).slice(1).map(b => 'ID:' + b);

  if (blocks.length === 0) {
    error(`No extractions found in ${filePath}`);
    return;
  }

  blocks.forEach(block => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    const item = {};
    lines.forEach(line => {
      const match = line.match(/^([^:]+):\s*(.*)$/);
      if (match) {
        item[match[1].toLowerCase()] = match[2];
      }
    });

    const requiredFields = ['id', 'url', 'quote', 'quote sha256', 'claim', 'value', 'summit mapping', 'gate'];
    requiredFields.forEach(f => {
      if (!item[f]) {
        error(`Extraction in ${target} missing field: ${f}`);
      }
    });

    if (item.id && !ID_REGEX.test(item.id)) {
      error(`Invalid ID format: ${item.id} in ${target}. Expected ci.<target>.<area>.<nnn>`);
    }

    if (item.quote) {
      // Remove surrounding quotes if present
      let quoteText = item.quote;
      if (quoteText.startsWith('"') && quoteText.endsWith('"')) {
        quoteText = quoteText.slice(1, -1);
      }

      const wordCount = quoteText.split(/\s+/).filter(Boolean).length;
      if (wordCount > 25) {
        error(`Quote too long (${wordCount} words) in ${item.id}: "${quoteText.substring(0, 30)}..."`);
      }

      if (item['quote sha256']) {
        const expectedHash = crypto.createHash('sha256').update(quoteText).digest('hex');
        if (item['quote sha256'] !== expectedHash) {
          error(`SHA256 mismatch for ${item.id}. Expected: ${expectedHash}, Got: ${item['quote sha256']}`);
        }
      }
    }
  });

  if (!hasError) {
    log(`Extractions in ${target} are valid.`);
  }
}

if (!fs.existsSync(COMPETITIVE_DIR)) {
  console.log('No competitive intelligence directory found.');
  process.exit(0);
}

const targets = fs.readdirSync(COMPETITIVE_DIR);
targets.forEach(validateDossier);

if (hasError) {
  process.exit(1);
} else {
  console.log('\n✨ All competitive intelligence dossiers are compliant.');
  process.exit(0);
}
