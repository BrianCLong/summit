import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { selectTrainPullRequest } from '../train_pr.mjs';

describe('Release Train PR selection', () => {
  test('returns none when no labeled PR exists', () => {
    const pulls = [{ number: 1, labels: [{ name: 'other' }] }];
    const result = selectTrainPullRequest(pulls, 'release-train');

    assert.equal(result.status, 'none');
  });

  test('returns found when a labeled PR exists', () => {
    const pulls = [{ number: 2, labels: [{ name: 'release-train' }] }];
    const result = selectTrainPullRequest(pulls, 'release-train');

    assert.equal(result.status, 'found');
    assert.equal(result.pull.number, 2);
  });

  test('returns multiple when more than one labeled PR exists', () => {
    const pulls = [
      { number: 3, labels: [{ name: 'release-train' }] },
      { number: 4, labels: [{ name: 'release-train' }] },
    ];
    const result = selectTrainPullRequest(pulls, 'release-train');

    assert.equal(result.status, 'multiple');
    assert.equal(result.pulls.length, 2);
  });
});
