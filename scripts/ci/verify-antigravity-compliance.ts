import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { program } from 'commander';
import yaml from 'js-yaml';

// Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../');
const POLICY_DIR = path.join(REPO_ROOT, 'agents/antigravity/policy');
const TRADEOFF_LEDGER = path.join(REPO_ROOT, 'governance/tradeoffs/tradeoff_ledger.jsonl');
const DECISIONS_DIR = path.join(REPO_ROOT, 'governance/decisions');

// Types
interface TradeoffEntry {
  ts: string;
  agent: string;
  change_id: string;
  summary: string;
  tradeoff: {
    cost_delta_percent: number;
    reliability_delta: string;
    velocity_delta: string;
  };
  risk: {
    security_score: number;
    reliability_score: number;
  };
  confidence: number;
}

// Helpers
const loadYaml = (filepath: string) => {
  try {
    return yaml.load(fs.readFileSync(filepath, 'utf8'));
  } catch (e) {
    console.error(`Error loading YAML file: ${filepath}`, e);
    process.exit(1);
  }
};

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
      const entry = JSON.parse(line) as TradeoffEntry;
      // Basic validation schema
      if (!entry.ts || !entry.agent || !entry.change_id) {
        console.error(`❌ Invalid entry at line ${index + 1}: Missing required fields`);
        isValid = false;
      }
      if (entry.agent === 'antigravity' && (!entry.confidence || !entry.tradeoff)) {
        console.error(`❌ Invalid Antigravity entry at line ${index + 1}: Missing confidence or tradeoff data`);
        isValid = false;
      }
    } catch (e) {
      console.error(`❌ Invalid JSON at line ${index + 1}`);
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

const validateDecisionRecord = (prId: string) => {
    console.log(`Checking for Decision Record for PR ${prId}...
`);
    // In a real scenario, we might look for a file named ADR-AG-{PR_ID}.md or similar
    // For now, we'll just scan the directory for a matching pattern or generic check
    
    // This is a placeholder for actual PR-to-file logic
    console.log(`ℹ️  Skipping specific file check for ${prId} (logic placeholder).`);
    return true; 
}

// Main execution
const main = () => {
  console.log("=== Antigravity Compliance Verifier ===");
  
  const policiesValid = checkPoliciesExist();
  const ledgerValid = checkTradeoffLedger();

  if (!policiesValid || !ledgerValid) {
    console.error("\nFAILED: Governance checks failed.");
    process.exit(1);
  }

  console.log("\nSUCCESS: Antigravity governance artifacts are intact.");
};

main();
