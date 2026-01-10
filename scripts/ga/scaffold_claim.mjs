#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

// File Paths
const LEDGER_PATH = path.resolve(REPO_ROOT, 'docs/claims/CLAIMS_REGISTRY.md');
const EVIDENCE_INDEX_PATH = path.resolve(REPO_ROOT, 'docs/release/GA_EVIDENCE_INDEX.md');
const WEBSITE_CLAIMS_PATH = path.resolve(REPO_ROOT, 'website/src/content/ga.claims.json');

// Configuration
const FORBIDDEN_WORDS = [
  'best', 'better', 'faster', 'cheaper', 'leading', 'state-of-the-art',
  'cutting-edge', 'unrivaled', 'unique', 'robust', 'powerful', 'seamless'
];

const CATEGORIES = {
  security: 'SEC',
  reliability: 'REL',
  performance: 'PERF',
  ops: 'OPS',
  feature: 'FEAT',
  governance: 'GOV',
  data: 'DAT',
  architecture: 'ARC',
  ai: 'AI'
};

function fatal(msg) {
  console.error(`\x1b[31m❌ Error: ${msg}\x1b[0m`);
  process.exit(1);
}

function success(msg) {
  console.log(`\x1b[32m✅ ${msg}\x1b[0m`);
}

function warn(msg) {
  console.log(`\x1b[33m⚠️  ${msg}\x1b[0m`);
}

// 1. Input Collection
async function collectInput() {
  // Check for CLI args first
  const args = process.argv.slice(2);
  if (args.length > 0) {
     const options = {
        text: { type: 'string' },
        scope: { type: 'string' },
        category: { type: 'string' },
        evidence: { type: 'string' },
        command: { type: 'string', default: 'TBD' }
     };
     try {
         const { values } = parseArgs({ args, options, strict: false });
         if (values.text && values.scope && values.category && values.evidence) {
             return {
                 text: values.text,
                 scope: values.scope.toLowerCase(),
                 category: values.category.toLowerCase(),
                 evidenceType: values.evidence,
                 reproCommand: values.command || 'TBD'
             };
         }
     } catch (e) {
         // ignore parsing errors, fall to interactive
     }
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  console.log('\x1b[1m🏔️  Summit Claim Scaffolder\x1b[0m');
  console.log('--------------------------------------------------');

  const text = await question('📝 Proposed Claim Text: ');
  if (!text || text.length < 10) {
      rl.close();
      fatal('Claim text too short.');
  }

  // Validation
  const lowerText = text.toLowerCase();
  const violations = FORBIDDEN_WORDS.filter(w => lowerText.includes(w));
  if (violations.length > 0) {
    rl.close();
    fatal(`Claim contains forbidden vague/comparative words: ${violations.join(', ')}`);
  }

  const scope = await question('🔭 Scope (ga | post-ga): ');
  if (!['ga', 'post-ga'].includes(scope.toLowerCase())) {
      rl.close();
      fatal('Invalid scope. Must be ga or post-ga.');
  }

  const categoryKeys = Object.keys(CATEGORIES).join(', ');
  const categoryInput = await question(`🗂️  Category (${categoryKeys}): `);
  const category = categoryInput.toLowerCase();
  if (!CATEGORIES[category]) {
      rl.close();
      fatal(`Invalid category. Must be one of: ${categoryKeys}`);
  }

  const evidenceType = await question('🔍 Expected Evidence Type (test | log | scan | endpoint | sbom | doc): ');

  let reproCommand = await question('💻 Reproduction Command (or "TBD"): ');
  if (!reproCommand) reproCommand = 'TBD';

  rl.close();
  return { text, scope: scope.toLowerCase(), category, evidenceType, reproCommand };
}

// 2. ID Generation
function generateId(ledgerContent, categoryCode) {
  const regex = new RegExp(`\\*\\*${categoryCode}-(\\d{3})\\*\\*`, 'g');
  let max = 0;
  let match;
  while ((match = regex.exec(ledgerContent)) !== null) {
    const num = parseInt(match[1], 10);
    if (num > max) max = num;
  }
  const next = max + 1;
  return `${categoryCode}-${String(next).padStart(3, '0')}`;
}

// 3. Execution
async function main() {
  const inputs = await collectInput();

  console.log('\n⚙️  Scaffolding...');

  // --- Update Ledger ---
  if (!fs.existsSync(LEDGER_PATH)) fatal(`Ledger not found at ${LEDGER_PATH}`);
  let ledgerContent = fs.readFileSync(LEDGER_PATH, 'utf8');

  const id = generateId(ledgerContent, CATEGORIES[inputs.category]);
  const status = inputs.scope === 'post-ga' ? 'POST-GA' : 'PROPOSED';

  let targetHeader = '## Security & Governance'; // default
  if (['data'].includes(inputs.category)) targetHeader = '## Data & Provenance';
  if (['architecture', 'reliability', 'ops', 'performance'].includes(inputs.category)) targetHeader = '## Architecture & Resilience';
  if (['ai', 'feature'].includes(inputs.category)) targetHeader = '## Intelligence & AI';

  const newLedgerRow = `| **${id}** | **${inputs.text}** | \`pending\` | ${inputs.scope} | TBD | **${status}** |`;

  const headerIndex = ledgerContent.indexOf(targetHeader);
  if (headerIndex === -1) {
     ledgerContent += `\n\n${targetHeader}\n\n| ID | Claim | Evidence Path | Scope / Limit | Owner | Status |\n|---|---|---|---|---|---|\n${newLedgerRow}\n`;
  } else {
    const nextHeaderRegex = /\n## /g;
    nextHeaderRegex.lastIndex = headerIndex + 1;
    const nextHeaderMatch = nextHeaderRegex.exec(ledgerContent);

    if (nextHeaderMatch) {
       const insertPos = nextHeaderMatch.index;
       ledgerContent = ledgerContent.slice(0, insertPos) + `${newLedgerRow}\n` + ledgerContent.slice(insertPos);
    } else {
       ledgerContent = ledgerContent.trimEnd() + `\n${newLedgerRow}\n`;
    }
  }

  fs.writeFileSync(LEDGER_PATH, ledgerContent);
  success(`Updated Claim Ledger: ${id}`);

  // --- Update Evidence Index ---
  if (fs.existsSync(EVIDENCE_INDEX_PATH)) {
    let evidenceContent = fs.readFileSync(EVIDENCE_INDEX_PATH, 'utf8');
    const newEvidenceRow = `| \`${inputs.reproCommand}\` | ⚠️ Pending | Claim ${id}: ${inputs.text.substring(0, 30)}... | ${inputs.evidenceType} needed |`;

    if (!evidenceContent.includes('## Proposed Claims')) {
        evidenceContent += `\n\n## Proposed Claims\n\n| Command | Status | Evidence | Notes |\n| --- | --- | --- | --- |\n`;
    }
    evidenceContent += `${newEvidenceRow}\n`;

    fs.writeFileSync(EVIDENCE_INDEX_PATH, evidenceContent);
    success(`Updated Evidence Index`);
  } else {
    warn(`Evidence Index not found at ${EVIDENCE_INDEX_PATH}, skipping.`);
  }

  // --- Update Website Stub ---
  const webDir = path.dirname(WEBSITE_CLAIMS_PATH);
  if (!fs.existsSync(webDir)) fs.mkdirSync(webDir, { recursive: true });

  let claimsJson = [];
  if (fs.existsSync(WEBSITE_CLAIMS_PATH)) {
    try {
      claimsJson = JSON.parse(fs.readFileSync(WEBSITE_CLAIMS_PATH, 'utf8'));
    } catch (e) {
      warn('Existing ga.claims.json was invalid, starting fresh.');
    }
  }

  claimsJson.push({
    id,
    text: inputs.text,
    status,
    scope: inputs.scope,
    evidence: "pending"
  });

  fs.writeFileSync(WEBSITE_CLAIMS_PATH, JSON.stringify(claimsJson, null, 2));
  success(`Updated website/src/content/ga.claims.json`);

  // --- Output Instructions ---
  console.log('\n--------------------------------------------------');
  console.log(`🎉 Claim ${id} scaffolded successfully.`);
  console.log(`\nNext Steps:`);
  console.log(`1. 📝 Edit docs/claims/CLAIMS_REGISTRY.md to refine text/owner.`);
  console.log(`2. 🧪 Implement the evidence (test, log, etc.).`);
  console.log(`3. 🔗 Update docs/release/GA_EVIDENCE_INDEX.md with the real command.`);
  console.log(`4. 🚨 NOTE: Drift Guard will BLOCK this claim from public docs until verified.`);
  console.log('--------------------------------------------------');
}

main().catch(err => fatal(err.message));
