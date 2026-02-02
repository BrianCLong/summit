import { buildContext } from '../context-engineer.js';
import type { ContextBuildInput } from '../types.js';

describe('Context Engineering Core', () => {
  it('evicts middle history deterministically', () => {
    const input: ContextBuildInput = {
      history: [
        {
          stream: 'history',
          content: 'Early critical intent',
          source: 'history',
          provenance: 'test',
          policyLabels: ['intent'],
          priority: 'high',
        },
        {
          stream: 'history',
          content: 'Middle detail one',
          source: 'history',
          provenance: 'test',
          priority: 'low',
        },
        {
          stream: 'history',
          content: 'Middle detail two',
          source: 'history',
          provenance: 'test',
          priority: 'low',
        },
        {
          stream: 'history',
          content: 'Recent update',
          source: 'history',
          provenance: 'test',
          priority: 'medium',
        },
      ],
      policies: {
        budget: {
          perStream: {
            history: {
              stream: 'history',
              maxTokens: 8,
              priority: 50,
              earlyKeepCount: 1,
              recentKeepCount: 1,
            },
          },
        },
      },
    };
    const result = buildContext(input);
    const evicted = result.manifest.evictions.map(eviction => eviction.itemId);
    expect(evicted.length).toBeGreaterThan(0);
    expect(evicted.some(id => id.includes('history'))).toBe(true);
  });

  it('reduces tool outputs before prompt build', () => {
    const input: ContextBuildInput = {
      toolOutputs: [
        {
          stream: 'toolOutputs',
          content: 'x'.repeat(2000),
          source: 'tool',
          provenance: 'test',
          priority: 'low',
        },
      ],
      policies: {
        toolOutput: {
          maxTokens: 10,
        },
      },
    };
    const result = buildContext(input);
    const toolMessage = result.messages.find(msg =>
      msg.content.includes('x'),
    );
    expect(toolMessage?.content.length).toBeLessThanOrEqual(40);
  });

  it('preserves intents and commitments during compression', () => {
    const input: ContextBuildInput = {
      history: [
        {
          stream: 'history',
          content: 'Intent: keep this exact language intact.',
          source: 'history',
          provenance: 'test',
          policyLabels: ['intent'],
          priority: 'high',
        },
        {
          stream: 'history',
          content: 'Commitment: deliver the report by Friday.',
          source: 'history',
          provenance: 'test',
          policyLabels: ['commitment'],
          priority: 'high',
        },
        {
          stream: 'history',
          content: 'Reasoning trace '.repeat(50),
          source: 'history',
          provenance: 'test',
          policyLabels: ['reasoning'],
          priority: 'low',
        },
      ],
      policies: {
        budget: {
          perStream: {
            history: {
              stream: 'history',
              maxTokens: 200,
              priority: 50,
              compressionThreshold: 10,
            },
          },
        },
      },
    };
    const result = buildContext(input);
    const intent = result.manifest.items.find(item =>
      item.policyLabels?.includes('intent'),
    );
    const commitment = result.manifest.items.find(item =>
      item.policyLabels?.includes('commitment'),
    );
    expect(intent?.content).toBe(
      'Intent: keep this exact language intact.',
    );
    expect(commitment?.content).toBe(
      'Commitment: deliver the report by Friday.',
    );
  });

  it('adds schema version to manifest', () => {
    const input: ContextBuildInput = {
      system: [
        {
          stream: 'system',
          content: 'System directive',
          source: 'system',
          provenance: 'test',
        },
      ],
    };
    const result = buildContext(input);
    expect(result.manifest.schemaVersion).toBe('1.0.0');
  });

  it('rejects items missing provenance', () => {
    const input: ContextBuildInput = {
      user: [
        {
          stream: 'user',
          content: 'Missing provenance',
          source: 'user',
          provenance: '',
        },
      ],
    };
    expect(() => buildContext(input)).toThrow(
      'Context item missing provenance for stream user',
    );
  });
});
