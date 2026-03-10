import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSnapshotMetrics,
  computeEvolution,
  detectCycles,
  computeDriftTimeline,
  detectStructuralEvents
} from '../architecture-time-machine-core.mjs';

test('detectCycles identifies strongly connected components', () => {
  const cycles = detectCycles([
    { from: 'apps/a', to: 'packages/b' },
    { from: 'packages/b', to: 'apps/a' },
    { from: 'services/c', to: 'apps/a' }
  ]);

  assert.deepEqual(cycles, [['apps/a', 'packages/b']]);
});

test('evolution and drift compute deterministic deltas', () => {
  const base = buildSnapshotMetrics({
    commit: 'c1',
    date: '2024-01-01',
    files: ['apps/a/package.json', 'packages/b/package.json'],
    packageMeta: [
      { module: 'apps/a', name: '@x/a', dependencies: [] },
      { module: 'packages/b', name: '@x/b', dependencies: [] }
    ]
  });
  const next = buildSnapshotMetrics({
    commit: 'c2',
    date: '2024-01-02',
    files: ['apps/a/package.json', 'packages/b/package.json'],
    packageMeta: [
      { module: 'apps/a', name: '@x/a', dependencies: ['@x/b'] },
      { module: 'packages/b', name: '@x/b', dependencies: ['@x/a'] }
    ]
  });

  const evolution = computeEvolution([base, next]);
  assert.equal(evolution[0].introducedDependencies.length, 2);
  const drift = computeDriftTimeline([base, next]);
  assert.ok(drift[1].driftScore > drift[0].driftScore);

  const events = detectStructuralEvents([base, next], evolution, drift);
  assert.ok(events.some((event) => event.type === 'circular-dependency-introduced'));
});
