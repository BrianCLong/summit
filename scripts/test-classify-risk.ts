import { classifyRisk } from './classify-risk.js';
import assert from 'assert';

console.log('Running tests for classify-risk...');

// Test 1: Docs only -> Low
{
  const files = ['docs/README.md', 'README.md', 'LICENSE'];
  const result = classifyRisk(files);
  assert.strictEqual(result.level, 'low', 'Docs should be low risk');
  console.log('✔ Docs only -> Low');
}

// Test 2: Auth -> High
{
  const files = ['server/src/auth/AuthService.ts', 'docs/README.md'];
  const result = classifyRisk(files);
  assert.strictEqual(result.level, 'high', 'Auth should be high risk');
  assert.ok(result.reasons.some(r => r.includes('server/src/auth')), 'Reason should mention auth');
  console.log('✔ Auth -> High');
}

// Test 3: Secrets -> High
{
  const files = ['config/secrets.ts'];
  const result = classifyRisk(files);
  assert.strictEqual(result.level, 'high', 'Secrets should be high risk');
  console.log('✔ Secrets -> High');
}

// Test 4: Code -> Medium
{
  const files = ['server/src/utils/helper.ts', 'client/src/components/Button.tsx'];
  const result = classifyRisk(files);
  assert.strictEqual(result.level, 'medium', 'Code should be medium risk');
  console.log('✔ Code -> Medium');
}

// Test 5: Empty -> Low
{
  const result = classifyRisk([]);
  assert.strictEqual(result.level, 'low', 'Empty should be low risk');
  console.log('✔ Empty -> Low');
}

// Test 6: Mixed High/Low -> High
{
  const files = ['docs/safe.md', 'server/src/auth/danger.ts'];
  const result = classifyRisk(files);
  assert.strictEqual(result.level, 'high', 'High should override low');
  console.log('✔ Mixed High/Low -> High');
}

console.log('All tests passed!');
