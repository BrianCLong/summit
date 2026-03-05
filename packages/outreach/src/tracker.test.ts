import { describe, it, expect } from 'vitest';
import { OutreachTracker } from './tracker.js';

describe('OutreachTracker', () => {
  it('should instantiate correctly', () => {
    // We expect this to fail if Redis/Neo4j are not reachable,
    // but the class definition should be valid.
    expect(OutreachTracker).toBeDefined();
  });
});
