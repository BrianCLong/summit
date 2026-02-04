import { stripSpeculation } from '../src/pipeline/extract-intent.js';
import { fillTemplate } from '../src/utils/prompt.js';
import { StepSummary } from '../src/types.js';

const baseSummary: StepSummary = {
  schemaVersion: 'v1',
  screenContext: [
    {
      value: 'Home screen with search bar',
      factuality: 'observed',
      evidencePointers: [{ elementId: 'node-1' }],
      uncertainty: 0.1,
    },
  ],
  actions: [
    {
      value: 'Tap search bar',
      factuality: 'observed',
      evidencePointers: [{ elementId: 'node-2' }],
      uncertainty: 0.05,
    },
  ],
  speculationText: 'User likely wants to search for flights.',
  locale: 'en-US',
  provenance: {
    modelId: 'test-model',
    promptHash: 'hash',
    promptId: 'intent-stage1',
    promptVersion: 'v1',
    window: {
      currentFrameId: 'frame-1',
    },
    generatedAt: '2026-01-01T00:00:00Z',
  },
};

describe('stripSpeculation', () => {
  it('removes speculation while keeping factual context', () => {
    const factual = stripSpeculation([baseSummary]);
    expect(factual).toHaveLength(1);
    expect(factual[0].screenContext[0].value).toBe(
      'Home screen with search bar',
    );
    expect(factual[0].actions[0].value).toBe('Tap search bar');
    expect((factual[0] as Record<string, unknown>).speculationText).toBe(
      undefined,
    );
  });
});

describe('fillTemplate', () => {
  it('replaces placeholders', () => {
    const template = 'Hello {{name}}';
    const result = fillTemplate(template, { name: 'Summit' });
    expect(result).toBe('Hello Summit');
  });
});
