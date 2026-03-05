const test = require('node:test');
const assert = require('node:assert/strict');

const { classifyIssue } = require('../classifier.cjs');

test('classifies high-confidence GA blocker as P0', () => {
  const issue = {
    number: 17,
    title: 'GA blocker: CI gate deterministic failure in workflow build-check',
    body: 'run_id 1234 failed check: build-check',
    labels: [{ name: 'P0-candidate' }, { name: 'ci' }, { name: 'ga:blocker' }],
  };

  const result = classifyIssue(issue);

  assert.equal(result.isCandidate, true);
  assert.equal(result.priority, 'prio:P0');
  assert.equal(result.confidence, 'high');
  assert.equal(result.category, 'integrity');
  assert.ok(result.desiredLabels.includes('queue:deterministic'));
  assert.ok(result.desiredLabels.includes('ga:blocker'));
});

test('classifies medium-confidence candidate as P1 and needs-triage', () => {
  const issue = {
    number: 23,
    title: 'GA blocker: Reproducibility concern in nightly actions',
    body: 'failing workflow: nightly-actions due to deterministic drift',
    labels: [{ name: 'P0-candidate' }, { name: 'reproducibility' }],
  };

  const result = classifyIssue(issue);

  assert.equal(result.priority, 'prio:P1');
  assert.equal(result.confidence, 'medium');
  assert.ok(result.desiredLabels.includes('needs-triage'));
});

test('applies negative label penalty', () => {
  const issue = {
    number: 88,
    title: 'Security regression potential',
    body: 'Possible CVE but blocked waiting for vendor.',
    labels: [{ name: 'P0-candidate' }, { name: 'blocked' }, { name: 'security' }],
  };

  const result = classifyIssue(issue);

  assert.equal(result.confidence, 'low');
  assert.equal(result.priority, null);
  assert.ok(result.desiredLabels.includes('queue:deterministic'));
});
