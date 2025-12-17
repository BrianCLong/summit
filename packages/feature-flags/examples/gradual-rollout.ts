/**
 * Gradual Rollout Example
 */

import {
  createGradualRollout,
  evaluateRollout,
  validateRollout,
} from '@intelgraph/feature-flags';

// Start with 5% rollout
const rollout5 = createGradualRollout('enabled', 'disabled', 5);

console.log('5% Rollout:', rollout5);

// Validate
const validation = validateRollout(rollout5);
console.log('Valid:', validation.valid);

// Test with users
const users = Array.from({ length: 100 }, (_, i) => `user-${i}`);
const results = { enabled: 0, disabled: 0 };

for (const userId of users) {
  const variation = evaluateRollout(rollout5, { userId });
  if (variation) {
    results[variation as keyof typeof results]++;
  }
}

console.log('Results:', results);
console.log('Enabled %:', (results.enabled / 100) * 100);

// Gradually increase
const rollout25 = createGradualRollout('enabled', 'disabled', 25);
const rollout50 = createGradualRollout('enabled', 'disabled', 50);
const rollout100 = createGradualRollout('enabled', 'disabled', 100);

console.log('Rollout stages:');
console.log('- 5%:', rollout5);
console.log('- 25%:', rollout25);
console.log('- 50%:', rollout50);
console.log('- 100%:', rollout100);

// User remains in same bucket
const testUser = 'user-123';
console.log('\nConsistent bucketing for user-123:');
console.log('5%:', evaluateRollout(rollout5, { userId: testUser }));
console.log('25%:', evaluateRollout(rollout25, { userId: testUser }));
console.log('50%:', evaluateRollout(rollout50, { userId: testUser }));
console.log('100%:', evaluateRollout(rollout100, { userId: testUser }));
