import { describe, it, expect } from 'vitest';
import { AdaptivityDetector } from './adaptivity';
import fs from 'fs';
import path from 'path';

interface FixtureMessage {
  id: string;
  content: string;
  timestamp: number;
  authorId: string;
}

describe('AdaptivityDetector', () => {
  it('should detect A/B pivot patterns from fixture', () => {
    const fixturePath = path.join(process.cwd(), 'fixtures/cogwar/adaptivity_ab_pivot.jsonl');
    const fileContent = fs.readFileSync(fixturePath, 'utf-8');
    const messages: FixtureMessage[] = fileContent
      .trim()
      .split('\n')
      .map(line => JSON.parse(line));

    const detector = new AdaptivityDetector();
    detector.ingest(messages);

    // The fixture messages are very close in time (seconds apart).
    // The VariantGraph calculates rate as messages per hour.
    // 4 messages in ~15 seconds is extremely high velocity.

    // We analyze at a time after the last message
    const result = detector.analyze(1700000040000);

    // We expect 2 clusters: "Aliens/Sky" and "Mole People/Water"
    expect(result.activeVariants).toBeGreaterThanOrEqual(2);
    expect(result.pivotCount).toBeGreaterThanOrEqual(2);
    expect(result.score).toBeGreaterThan(0.2); // Should be higher than single variant
  });

  it('should create separate clusters for distinct narratives', () => {
    const detector = new AdaptivityDetector();
    const messages = [
      { id: '1', content: 'The economy is crashing hard.', timestamp: 1000, authorId: 'a' },
      { id: '2', content: 'The economy is crashing hard!', timestamp: 2000, authorId: 'b' }, // Similar to 1
      { id: '3', content: 'Aliens have landed in Nevada.', timestamp: 3000, authorId: 'c' },
      { id: '4', content: 'Aliens have landed in Nevada!', timestamp: 4000, authorId: 'd' }  // Similar to 3
    ];

    detector.ingest(messages);
    const result = detector.analyze(5000);

    // Expected: 2 clusters, each with 2 members.
    // Rate for cluster 1: 2 members / (1000ms) = high.
    // Rate for cluster 2: 2 members / (1000ms) = high.
    expect(result.activeVariants).toBe(2);
  });
});
