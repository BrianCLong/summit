'use strict';

const path = require('path');
const assert = require('assert');
const { test } = require('node:test');
const { scanDependencyDrift, renderMarkdownReport } = require('../lib/report');

test('scanDependencyDrift finds unpinned, risky, and duplicate majors', async () => {
  const fixturesDir = path.join(__dirname, 'fixtures');
  const report = await scanDependencyDrift({ rootDir: fixturesDir });

  const unpinnedNames = report.unpinned.map((item) => item.name);
  assert.ok(unpinnedNames.includes('left-pad'));
  assert.ok(unpinnedNames.includes('flask'));

  const riskyNames = report.risky.map((item) => item.name);
  assert.ok(riskyNames.some((name) => name.includes('git+')));
  assert.ok(riskyNames.includes('local-lib'));

  const duplicate = report.duplicates.find((item) => item.name === 'lodash');
  assert.ok(duplicate);
  assert.deepStrictEqual(duplicate.majors, ['4', '5']);
});

test('renderMarkdownReport includes summary and sections', async () => {
  const fixturesDir = path.join(__dirname, 'fixtures');
  const report = await scanDependencyDrift({ rootDir: fixturesDir });
  const markdown = renderMarkdownReport(report);

  assert.match(markdown, /# Dependency Drift Report/);
  assert.match(markdown, /## Summary/);
  assert.match(markdown, /## Unpinned Versions/);
  assert.match(markdown, /## Risky Dependency Specs/);
  assert.match(markdown, /## Duplicate Major Versions/);
});
