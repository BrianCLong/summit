import { DecisionLedger } from '../../packages/decision-ledger/src/index.ts';
import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

// This script simulates applying a policy decision.
// Usage: node scripts/decision/apply_policy.mjs <policy_path> <input_data_json>

const policyPath = process.argv[2] || 'packages/decision-policy/policy.v1.yaml';
const inputData = process.argv[3] ? JSON.parse(process.argv[3]) : { cpu_usage: "85%" };
const ledgerPath = 'packages/decision-ledger/decision_ledger.json';

const ledger = new DecisionLedger(ledgerPath);

try {
  const policyContent = fs.readFileSync(policyPath, 'utf8');
  const policy = yaml.load(policyContent);

  console.log(`Applying Policy: ${policy.name} (v${policy.version})`);
  console.log(`Input:`, inputData);

  // Simple rule evaluation engine
  let action = 'none';
  let matchedRule = null;

  for (const rule of policy.rules) {
     // Very basic evaluation: "cpu_usage > 80%" -> check inputData.cpu_usage
     // This is a simulation, so we parse simplistic conditions
     const [metric, operator, value] = rule.condition.split(' ');
     const inputValue = inputData[metric];

     if (inputValue) {
         // rudimentary check
         const inputNum = parseFloat(inputValue);
         const thresholdNum = parseFloat(value);

         if (operator === '>' && inputNum > thresholdNum) {
             action = rule.action;
             matchedRule = rule;
             break;
         }
     }
  }

  const decision = {
      agentId: 'infra-agent-01',
      policyVersion: policy.version,
      inputHash: Buffer.from(JSON.stringify(inputData)).toString('base64'),
      decision: { action, rule: matchedRule },
      reasoning: matchedRule ? `Matched condition: ${matchedRule.condition}` : 'No rule matched'
  };

  const record = ledger.record(decision);
  console.log(`Decision recorded: ${record.id}`);
  console.log(`Action: ${action}`);

} catch (error) {
  console.error('Error applying policy:', error);
  process.exit(1);
}
