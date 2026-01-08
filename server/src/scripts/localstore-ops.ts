import { PolicyEvaluator } from '../policy/policyEvaluator.js';

// Demo script for Local Store Rotation with Policy Enforcement

const tenantId = process.env.TENANT_ID || 't1';
const operatorFlag = process.env.FORCE_ROTATE === 'true';

async function main() {
  console.log('Starting Local Store Rotation...');

  const evaluator = PolicyEvaluator.getInstance();
  const context = {
    action: 'localstore.rotate',
    tenantId,
    operatorFlag
  };

  console.log('Evaluating Policy...', context);
  const decision = evaluator.evaluate(context as any);

  if (decision.decision === 'DENY') {
    console.error(`❌ ROTATION DENIED: ${decision.reasonCode}`);
    console.error(`Message: ${decision.message}`);
    console.error(`Remediation: Provide FORCE_ROTATE=true`);
    process.exit(1);
  }

  console.log('✅ Policy ALLOWED. Proceeding with rotation...');
  // Actual rotation logic would go here
  console.log('Rotation complete.');
}

main().catch(console.error);
