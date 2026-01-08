import { PolicyEvaluator } from '../../server/src/policy/policyEvaluator.js';

async function main() {
  const evaluator = PolicyEvaluator.getInstance();

  const envNow = process.env.NOW;
  const override = process.env.OVERRIDE === 'true';
  const overrideReason = process.env.OVERRIDE_REASON || '';

  const context = {
    action: 'release.promotion.verify',
    targetEnv: 'rc', // Default to RC check for generic freeze
    timestamp: envNow || new Date().toISOString(),
    override,
    overrideReason
  };

  const decision = evaluator.evaluate(context as any);

  if (decision.decision === 'DENY') {
    console.error(`❌ RELEASE BLOCKED: ${decision.reasonCode}`);
    console.error(`Message: ${decision.message}`);
    process.exit(1);
  }

  console.log(`✅ RELEASE ALLOWED: ${decision.reasonCode}`);
  console.log(`Message: ${decision.message}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
