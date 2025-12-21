import { WishbookService } from '../src/services/WishbookService.js';
import { DependencyClass, RevenueImpact, RiskTier } from '../src/wishbook/types.js';

async function main() {
  console.log('--- Wishbook Service Verification ---');

  const wishbookService = WishbookService.getInstance();
  wishbookService._resetForTesting();

  // 1. Intake
  console.log('\n1. Testing Intake...');
  const newItem = {
    title: 'New Feature: Automated Reports',
    problem: 'Users spend too much time manually creating reports.',
    user: 'Analyst Team',
    impact: 'Saves 5 hours per week per analyst.',
    evidence: 'User interviews from Q1.',
    tags: {
      riskTier: RiskTier.LOW,
      revenueImpact: RevenueImpact.MEDIUM,
      dependencyClass: DependencyClass.NONE,
    },
    prioritization: {
      whyNow: 'Contract renewal pending.',
      whatBreaks: 'Potential churn if not addressed.',
    }
  };

  try {
    const created = await wishbookService.intake(newItem, 'test-user-123');
    console.log('✅ Intake successful. Created ID:', created.id);

    // 2. List
    console.log('\n2. Testing List...');
    const list = await wishbookService.list();
    console.log(`✅ List successful. Found ${list.length} items.`);
    if (list.length !== 1) throw new Error('List count mismatch');
    if (list[0].id !== created.id) throw new Error('Item ID mismatch');

    // 3. Update Tags
    console.log('\n3. Testing Update Tags...');
    const updated = await wishbookService.updateTags(created.id, { riskTier: RiskTier.HIGH });
    console.log('✅ Update successful. New Risk Tier:', updated.tags?.riskTier);
    if (updated.tags?.riskTier !== RiskTier.HIGH) throw new Error('Update failed');

    // 4. Canonicalize
    console.log('\n4. Testing Canonicalize...');
    const canonical = await wishbookService.canonicalize(created.id);
    console.log('✅ Canonicalize successful. New Status:', canonical.status);
    if (canonical.status !== 'TRIAGED') throw new Error('Canonicalization status update failed');

    console.log('\n🎉 ALL TESTS PASSED');
  } catch (error) {
    console.error('❌ Test Failed:', error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
