import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';
import assert from 'node:assert';
import {
  buildReleaseNotesMarkdown,
  extractBreakingChanges,
  groupPullRequests,
  loadPolicy,
  normalizePullRequest,
  selectHighlights,
  sortPullRequests,
} from '../lib/assemble-release-notes.mjs';

const fixturesDir = path.resolve('scripts', 'release', '__tests__', 'fixtures');

function loadFixture(name) {
  return JSON.parse(readFileSync(path.join(fixturesDir, name), 'utf8'));
}

describe('Release Scripts: assemble-release-notes', () => {
  const policy = loadPolicy('scripts/release/release-notes.policy.json');
  const fixture = loadFixture('release-notes-input.json');
  const pullRequests = sortPullRequests(
    fixture.pullRequests.map(pr => normalizePullRequest(pr)),
  );

  test('should sort and group pull requests deterministically', () => {
    const sections = groupPullRequests(pullRequests, policy);
    assert.deepStrictEqual(
      sections.Added.map(pr => pr.number),
      [12],
    );
    assert.deepStrictEqual(
      sections.Changed.map(pr => pr.number),
      [9],
    );
    assert.deepStrictEqual(
      sections.Fixed.map(pr => pr.number),
      [8],
    );
    assert.deepStrictEqual(
      sections['Build/CI'].map(pr => pr.number),
      [15],
    );
    assert.deepStrictEqual(
      sections.Docs.map(pr => pr.number),
      [20],
    );
  });

  test('should identify highlights and breaking changes', () => {
    const highlights = selectHighlights(pullRequests, policy);
    const breakingChanges = extractBreakingChanges(pullRequests, policy);
    assert.deepStrictEqual(highlights.map(pr => pr.number), [12]);
    assert.deepStrictEqual(breakingChanges.map(pr => pr.number), [9]);
  });

  test('should produce deterministic markdown output', () => {
    const highlights = selectHighlights(pullRequests, policy);
    const sections = groupPullRequests(pullRequests, policy);
    const breakingChanges = extractBreakingChanges(pullRequests, policy);

    const markdown = buildReleaseNotesMarkdown({
      tag: fixture.tag,
      generatedAt: fixture.generatedAt,
      targetSha: fixture.targetSha,
      previousTag: fixture.previousTag,
      highlights,
      sections,
      breakingChanges,
      assurance: fixture.assurance,
      evidence: fixture.evidence,
      issues: fixture.issues,
      metadata: fixture.metadata,
    });

    const expected = readFileSync(
      path.join(fixturesDir, 'release-notes-expected.md'),
      'utf8',
    ).trim();

    assert.strictEqual(markdown.trim(), expected);
  });
});
