import { describe, test } from 'node:test';
import assert from 'node:assert';
import {
  buildHotfixRecord,
  buildHotfixSnapshot,
  normalizeCommitList,
  parseVersionString,
  stableStringify,
} from '../hotfix-utils.mjs';

describe('Release Scripts: hotfix-utils', () => {
  test('normalizeCommitList preserves order and trims blanks', () => {
    const input = 'abc123\n\n  def456  \n';
    const commits = normalizeCommitList(input);
    assert.deepStrictEqual(commits, ['abc123', 'def456']);
  });

  test('parseVersionString handles v-prefixed versions', () => {
    const parsed = parseVersionString('v4.1.2');
    assert.deepStrictEqual(parsed, {
      major: 4,
      minor: 1,
      patch: 2,
      normalized: '4.1.2',
    });
  });

  test('buildHotfixSnapshot is deterministic', () => {
    const snapshot = buildHotfixSnapshot({
      baseTag: 'v4.1.1',
      baseCommit: 'a'.repeat(40),
      branchName: 'hotfix/v4.1.2',
      selectedCommits: ['b'.repeat(40)],
      resultingCommit: 'c'.repeat(40),
      lockfileHashes: {
        'pnpm-lock.yaml': 'd'.repeat(64),
        'package-lock.json': 'e'.repeat(64),
      },
      generatedAt: '2026-01-10T00:00:00Z',
    });

    const output = stableStringify(snapshot);
    const expected = `{
  "generated_at": "2026-01-10T00:00:00Z",
  "hotfix": {
    "base_commit": "${'a'.repeat(40)}",
    "base_tag": "v4.1.1",
    "branch": "hotfix/v4.1.2",
    "resulting_commit": "${'c'.repeat(40)}",
    "selected_commits": [
      "${'b'.repeat(40)}"
    ]
  },
  "lockfiles": {
    "package-lock.json": "${'e'.repeat(64)}",
    "pnpm-lock.yaml": "${'d'.repeat(64)}"
  },
  "version": "1.0.0"
}
`;

    assert.strictEqual(output, expected);
  });

  test('buildHotfixRecord is deterministic', () => {
    const record = buildHotfixRecord({
      tag: 'v4.1.2',
      version: '4.1.2',
      baseTag: 'v4.1.1',
      baseCommit: 'a'.repeat(40),
      selectedCommits: ['b'.repeat(40)],
      finalCommit: 'c'.repeat(40),
      evidence: {
        sha256: 'd'.repeat(64),
        signature: {
          subject: 'governance/governance_SHA256SUMS',
          sig_path: 'sig',
          cert_path: 'cert',
          metadata_path: 'meta',
        },
        signature_method: 'sigstore',
      },
      dashboard: {
        sha256: 'e'.repeat(64),
        summary_path: 'dashboard.json',
      },
      actor: 'release-captain',
      workflowRun: {
        id: '123',
        url: 'https://example.com',
      },
      recordedAt: '2026-01-10T00:00:00Z',
    });

    const output = stableStringify(record);
    assert.ok(output.includes('"recorded_at": "2026-01-10T00:00:00Z"'));
    assert.ok(output.includes('"signature_method": "sigstore"'));
  });
});
