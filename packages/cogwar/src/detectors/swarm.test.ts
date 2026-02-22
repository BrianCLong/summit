import { describe, it, expect } from 'vitest';
import { SwarmDetector } from './swarm';
import fs from 'fs';
import path from 'path';

interface FixtureMessage {
  id: string;
  content: string;
  timestamp: number;
  authorId: string;
}

describe('SwarmDetector', () => {
  it('should detect coordinated swarm behavior', () => {
    const fixturePath = path.join(process.cwd(), 'fixtures/cogwar/swarm_coordination.jsonl');
    const fileContent = fs.readFileSync(fixturePath, 'utf-8');
    const messages: FixtureMessage[] = fileContent
      .trim()
      .split('\n')
      .map(line => JSON.parse(line));

    const detector = new SwarmDetector();
    detector.ingest(messages);
    const result = detector.analyze();

    expect(result.detectedSwarms.length).toBeGreaterThanOrEqual(1);
    const swarm = result.detectedSwarms[0];

    expect(swarm.authorCount).toBeGreaterThanOrEqual(5);
    expect(swarm.synchronicityScore).toBeGreaterThan(0.5);
    expect(swarm.isSwarm).toBe(true);
  });

  it('should reject single-author spam as swarm', () => {
    const messages: FixtureMessage[] = [];
    // Generate spam: 10 messages from 1 author in 10 seconds
    for (let i = 0; i < 10; i++) {
      messages.push({
        id: `spam-${i}`,
        content: "Buy crypto now!",
        timestamp: 1700000000000 + (i * 1000),
        authorId: "spammer-1"
      });
    }

    const detector = new SwarmDetector();
    detector.ingest(messages);
    const result = detector.analyze();

    // Should detect 0 swarms because author ratio is 0.1
    // Synchronicity = Density(1.0) * Ratio(0.1) = 0.1
    // Threshold is 0.5
    expect(result.detectedSwarms.length).toBe(0);
  });
});
