import { describe, expect, it } from 'vitest';
import { IOActorScorer } from '../src/io-actor-scoring';
import type { IOActorActivity, IOActorGraphEdge } from '../src/types';

describe('IOActorScorer', () => {
  it('scores coordinated actors higher based on synchrony, shared URLs, templates, and graph centrality', () => {
    const now = Date.now();
    const activities: IOActorActivity[] = [
      {
        actorId: 'actor-a',
        timestamp: now,
        content: 'Join the movement at http://example.com/alpha now',
        urls: ['http://example.com/alpha'],
      },
      {
        actorId: 'actor-b',
        timestamp: now + 60 * 1000,
        content: 'Join the movement at http://example.com/alpha now',
        urls: ['http://example.com/alpha'],
      },
      {
        actorId: 'actor-c',
        timestamp: now + 12 * 60 * 1000,
        content: 'Unrelated post with http://example.com/other',
        urls: ['http://example.com/other'],
      },
    ];

    const edges: IOActorGraphEdge[] = [
      { source: 'actor-a', target: 'actor-b', type: 'reply' },
      { source: 'actor-b', target: 'actor-a', type: 'boost' },
    ];

    const scorer = new IOActorScorer();
    const scores = scorer.scoreActors(activities, edges);

    const actorA = scores.find((score) => score.actorId === 'actor-a');
    const actorB = scores.find((score) => score.actorId === 'actor-b');
    const actorC = scores.find((score) => score.actorId === 'actor-c');

    expect(actorA?.compositeScore).toBeGreaterThan(actorC?.compositeScore ?? 0);
    expect(actorB?.compositeScore).toBeGreaterThan(actorC?.compositeScore ?? 0);
    expect(actorA?.signals.sharedUrls).toBeGreaterThan(0.5);
    expect(actorB?.signals.templateSimilarity).toBeGreaterThan(0.5);
  });
});
