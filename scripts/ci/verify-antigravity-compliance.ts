import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

// Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../');
const POLICY_DIR = path.join(REPO_ROOT, 'agents/antigravity/policy');
const TRADEOFF_LEDGER = path.join(REPO_ROOT, 'governance/tradeoffs/tradeoff_ledger.jsonl');
const DECISIONS_DIR = path.join(REPO_ROOT, 'governance/decisions');

// Schemas
const TradeoffEntrySchema = z.object({
  ts: z.string(),
  agent: z.string(),
  change_id: z.string(),
  summary: z.string(),
  tradeoff: z.object({
    cost_delta_percent: z.number(),
    reliability_delta: z.string(),
    velocity_delta: z.string(),
  }),
  risk: z.object({
    security_score: z.number(),
    reliability_score: z.number(),
  }),
  confidence: z.number(),
}).strict();

type TradeoffEntry = z.infer<typeof TradeoffEntrySchema>;

const checkTradeoffLedger = () => {
  console.log('Verifying Tradeoff Ledger integrity...');
  if (!fs.existsSync(TRADEOFF_LEDGER)) {
    console.error('❌ Tradeoff Ledger not found!');
    return false;
  }

  const content = fs.readFileSync(TRADEOFF_LEDGER, 'utf8');
  const lines = content.trim().split('\n');
  let isValid = true;

  lines.forEach((line, index) => {
    if (!line.trim()) return;
    try {
      const json = JSON.parse(line);
      const result = TradeoffEntrySchema.safeParse(json);

      if (!result.success) {
        console.error(`❌ Invalid entry at line ${index + 1}: ${result.error.message}`);
        isValid = false;
        return;
      }

      const entry = result.data;
      if (entry.agent === 'antigravity' && entry.confidence < 0.8) {
        console.warn(`⚠️  Low confidence entry at line ${index + 1}: ${entry.confidence}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`❌ Invalid JSON at line ${index + 1}: ${msg}`);
      isValid = false;
    }
  });

  if (isValid) console.log('✅ Tradeoff Ledger is valid.');
  return isValid;
};

const checkPoliciesExist = () => {
  console.log('Verifying Antigravity Policy existence...');
  const requiredFiles = ['CHARTER.yaml']; // In agents/antigravity/
  const requiredPolicies = ['thresholds.yaml', 'change_classification.rego', 'merge_decision.rego']; // In agents/antigravity/policy/

  let allExist = true;

  // Check Charter
  const charterPath = path.join(REPO_ROOT, 'agents/antigravity/CHARTER.yaml');
  if (!fs.existsSync(charterPath)) {
    console.error(`❌ Missing Charter: ${charterPath}`);
    allExist = false;
  }

  // Check Policies
  requiredPolicies.forEach(file => {
    const filePath = path.join(POLICY_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Missing Policy Artifact: ${file}`);
      allExist = false;
    }
  });

  if (allExist) console.log('✅ All policy artifacts present.');
  return allExist;
};

const validateDecisionRecords = () => {
  console.log('Scanning Decision Records (ADRs)...');

  if (!fs.existsSync(DECISIONS_DIR)) {
    console.error('❌ Decisions directory not found!');
    return false;
  }

  const files = fs.readdirSync(DECISIONS_DIR);
  const adrFiles = files.filter(f => f.startsWith('ADR-AG-') && f.endsWith('.md'));

  if (adrFiles.length === 0) {
    console.warn('⚠️  No Antigravity Decision Records (ADR-AG-*) found.');
    // We don't fail here as there might not be any required for this specific run, 
    // but in CI we might want to check against a specific list.
  } else {
    console.log(`✅ Found ${adrFiles.length} decision records.`);
    adrFiles.forEach(f => console.log(`  - ${f}`));
  }

  return true;
}

// Main execution
const main = () => {
  console.log("=== Antigravity Compliance Verifier ===");

  const policiesValid = checkPoliciesExist();
  const ledgerValid = checkTradeoffLedger();
  const adrsScanned = validateDecisionRecords();

  if (!policiesValid || !ledgerValid || !adrsScanned) {
    console.error("\nFAILED: Governance checks failed.");
    process.exit(1);
  }

  console.log("\nSUCCESS: Antigravity governance artifacts are intact.");
};

main();
