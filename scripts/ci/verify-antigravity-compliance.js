"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const js_yaml_1 = __importDefault(require("js-yaml"));
// Paths
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const REPO_ROOT = path_1.default.resolve(__dirname, '../../');
const POLICY_DIR = path_1.default.join(REPO_ROOT, 'agents/antigravity/policy');
const TRADEOFF_LEDGER = path_1.default.join(REPO_ROOT, 'governance/tradeoffs/tradeoff_ledger.jsonl');
const DECISIONS_DIR = path_1.default.join(REPO_ROOT, 'governance/decisions');
// Helpers
const loadYaml = (filepath) => {
    try {
        return js_yaml_1.default.load(fs_1.default.readFileSync(filepath, 'utf8'));
    }
    catch (e) {
        console.error(`Error loading YAML file: ${filepath}`, e);
        process.exit(1);
    }
};
const checkTradeoffLedger = () => {
    console.log('Verifying Tradeoff Ledger integrity...');
    if (!fs_1.default.existsSync(TRADEOFF_LEDGER)) {
        console.error('❌ Tradeoff Ledger not found!');
        return false;
    }
    const content = fs_1.default.readFileSync(TRADEOFF_LEDGER, 'utf8');
    const lines = content.trim().split('\n');
    let isValid = true;
    lines.forEach((line, index) => {
        if (!line.trim())
            return;
        try {
            const entry = JSON.parse(line);
            // Basic validation schema
            if (!entry.ts || !entry.agent || !entry.change_id) {
                console.error(`❌ Invalid entry at line ${index + 1}: Missing required fields`);
                isValid = false;
            }
            if (entry.agent === 'antigravity' && (!entry.confidence || !entry.tradeoff)) {
                console.error(`❌ Invalid Antigravity entry at line ${index + 1}: Missing confidence or tradeoff data`);
                isValid = false;
            }
        }
        catch (e) {
            console.error(`❌ Invalid JSON at line ${index + 1}`);
            isValid = false;
        }
    });
    if (isValid)
        console.log('✅ Tradeoff Ledger is valid.');
    return isValid;
};
const checkPoliciesExist = () => {
    console.log('Verifying Antigravity Policy existence...');
    const requiredFiles = ['CHARTER.yaml']; // In agents/antigravity/
    const requiredPolicies = ['thresholds.yaml', 'change_classification.rego', 'merge_decision.rego']; // In agents/antigravity/policy/
    let allExist = true;
    // Check Charter
    const charterPath = path_1.default.join(REPO_ROOT, 'agents/antigravity/CHARTER.yaml');
    if (!fs_1.default.existsSync(charterPath)) {
        console.error(`❌ Missing Charter: ${charterPath}`);
        allExist = false;
    }
    // Check Policies
    requiredPolicies.forEach(file => {
        const filePath = path_1.default.join(POLICY_DIR, file);
        if (!fs_1.default.existsSync(filePath)) {
            console.error(`❌ Missing Policy Artifact: ${file}`);
            allExist = false;
        }
    });
    if (allExist)
        console.log('✅ All policy artifacts present.');
    return allExist;
};
const validateDecisionRecord = (prId) => {
    console.log(`Checking for Decision Record for PR ${prId}...
`);
    // In a real scenario, we might look for a file named ADR-AG-{PR_ID}.md or similar
    // For now, we'll just scan the directory for a matching pattern or generic check
    // This is a placeholder for actual PR-to-file logic
    console.log(`ℹ️  Skipping specific file check for ${prId} (logic placeholder).`);
    return true;
};
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
