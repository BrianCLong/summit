#!/usr/bin/env node
/**
 * Validation Script - Test Determinism Library
 *
 * Quick sanity check for determinism enforcement functions.
 */

import { validateDeterminism, sortObjectKeys, getGitContext, getToolchainFingerprint } from '../release/lib/determinism.mjs';

console.log('Testing Determinism Library...\n');

// Test 1: Validate clean object (should pass)
console.log('Test 1: Clean object (should pass)');
const cleanObj = {
  git: { sha: 'abc123', branch: 'main' },
  status: 'passed',
  steps: [{ name: 'test', status: 'passed', exitCode: 0 }],
};
const violations1 = validateDeterminism(cleanObj);
if (violations1.length === 0) {
  console.log('  ✓ PASS: No violations detected\n');
} else {
  console.error('  ✗ FAIL: Unexpected violations:', violations1);
  process.exit(1);
}

// Test 2: Detect timestamp field (should fail)
console.log('Test 2: Object with timestamp (should detect violation)');
const badObj1 = {
  status: 'passed',
  timestamp: '2024-01-15T12:34:56Z',
};
const violations2 = validateDeterminism(badObj1);
if (violations2.length > 0 && violations2.some(v => v.type === 'banned_key')) {
  console.log('  ✓ PASS: Detected banned key "timestamp"\n');
} else {
  console.error('  ✗ FAIL: Did not detect banned key');
  process.exit(1);
}

// Test 3: Detect ISO timestamp value (should fail)
console.log('Test 3: Object with ISO timestamp value (should detect violation)');
const badObj2 = {
  status: 'passed',
  completedAt: '2024-01-15T12:34:56.789Z',
};
const violations3 = validateDeterminism(badObj2);
if (violations3.length > 0 && violations3.some(v => v.type === 'timestamp_value')) {
  console.log('  ✓ PASS: Detected ISO timestamp value\n');
} else {
  console.error('  ✗ FAIL: Did not detect ISO timestamp value');
  process.exit(1);
}

// Test 4: Sort object keys
console.log('Test 4: Sort object keys deterministically');
const unsorted = { z: 1, a: 2, m: 3 };
const sorted = sortObjectKeys(unsorted);
const keys = Object.keys(sorted);
if (JSON.stringify(keys) === JSON.stringify(['a', 'm', 'z'])) {
  console.log('  ✓ PASS: Keys sorted correctly\n');
} else {
  console.error('  ✗ FAIL: Keys not sorted:', keys);
  process.exit(1);
}

// Test 5: Get git context (should return deterministic data)
console.log('Test 5: Get git context');
const gitContext = getGitContext();
if (gitContext.sha && gitContext.branch && typeof gitContext.isDirty === 'boolean') {
  console.log(`  ✓ PASS: Git context retrieved`);
  console.log(`    SHA: ${gitContext.sha}`);
  console.log(`    Branch: ${gitContext.branch}`);
  console.log(`    Dirty: ${gitContext.isDirty}\n`);
} else {
  console.error('  ✗ FAIL: Invalid git context');
  process.exit(1);
}

// Test 6: Get toolchain fingerprint
console.log('Test 6: Get toolchain fingerprint');
const toolchain = getToolchainFingerprint();
if (toolchain.node && toolchain.pnpm && toolchain.git) {
  console.log(`  ✓ PASS: Toolchain fingerprint retrieved`);
  console.log(`    Node: ${toolchain.node}`);
  console.log(`    pnpm: ${toolchain.pnpm}`);
  console.log(`    Git: ${toolchain.git}\n`);
} else {
  console.error('  ✗ FAIL: Invalid toolchain fingerprint');
  process.exit(1);
}

console.log('═══════════════════════════════════════════════');
console.log('  ✅ ALL TESTS PASSED');
console.log('═══════════════════════════════════════════════\n');
