import { describe, expect, it } from 'vitest';

import { PromptContextAttributionReporter } from '../src/pcar.js';

interface RetrievalChunk {
  id: string;
  label: string;
  content: string;
  mustInclude?: boolean;
}

interface PromptSegment {
  id: string;
  role: string;
  content: string;
  mustInclude?: boolean;
}

type RunnerInput = {
  retrievalChunks: RetrievalChunk[];
  promptSegments: PromptSegment[];
};

function synthesizeOutput({ retrievalChunks, promptSegments }: RunnerInput): string {
  const promptText = promptSegments
    .map((segment) => `[${segment.role}] ${segment.content}`)
    .join('\n');
  const chunkText = retrievalChunks
    .map((chunk, index) => (chunk.content ? `Source[${index + 1}]: ${chunk.content}` : ''))
    .filter(Boolean)
    .join('\n');
  return [promptText, chunkText].filter(Boolean).join('\n').trim();
}

describe('PromptContextAttributionReporter', () => {
  it('prioritizes must-include retrieval snippets in attribution scores', async () => {
    const reporter = new PromptContextAttributionReporter({ secret: 'pcar-test', seed: 17 });
    const retrievalChunks: RetrievalChunk[] = [
      {
        id: 'must-include',
        label: 'Critical compliance evidence',
        content: 'All releases must include SOC2 controls signed on 2025-09-01.',
        mustInclude: true,
      },
      {
        id: 'nice-to-have',
        label: 'Optional reference',
        content: 'Consider referencing the 2024 customer briefing if space allows.',
      },
    ];
    const promptSegments: PromptSegment[] = [
      { id: 'objective', role: 'user', content: 'Summarize compliance readiness.', mustInclude: true },
      { id: 'purpose', role: 'system', content: 'purpose:investigation' },
    ];

    const baseline = synthesizeOutput({ retrievalChunks, promptSegments });

    const bundle = await reporter.evaluate({
      runId: 'tenant:case:run',
      outputText: baseline,
      retrievalChunks,
      promptSegments,
      generator: async (input) => synthesizeOutput(input),
    });

    const mustIncludeScore = bundle.sources.find((source) => source.id === 'must-include');
    const optionalScore = bundle.sources.find((source) => source.id === 'nice-to-have');

    expect(mustIncludeScore?.score ?? 0).toBeGreaterThan(optionalScore?.score ?? 0);
    expect((mustIncludeScore?.methodContributions ?? []).find((entry) => entry.method === 'leave-one-out')?.delta ?? 0).toBeGreaterThan(0);

    const highlights = PromptContextAttributionReporter.replayHighlights(bundle, 'pcar-test');
    expect(highlights['must-include'][0].text).toContain('SOC2 controls');
  });

  it('produces deterministic scores with a fixed seed', async () => {
    const reporter = new PromptContextAttributionReporter({ secret: 'pcar-test', seed: 33 });
    const retrievalChunks: RetrievalChunk[] = [
      { id: 'alpha', label: 'Alpha', content: 'Alpha evidence snippet', mustInclude: false },
      { id: 'beta', label: 'Beta', content: 'Beta includes important nuance', mustInclude: true },
    ];
    const promptSegments: PromptSegment[] = [
      { id: 'objective', role: 'user', content: 'Provide findings.', mustInclude: true },
      { id: 'purpose', role: 'system', content: 'purpose:investigation' },
    ];
    const baseline = synthesizeOutput({ retrievalChunks, promptSegments });

    const first = await reporter.evaluate({
      outputText: baseline,
      retrievalChunks,
      promptSegments,
      generator: async (input) => synthesizeOutput(input),
    });
    const second = await reporter.evaluate({
      outputText: baseline,
      retrievalChunks,
      promptSegments,
      generator: async (input) => synthesizeOutput(input),
    });

    expect(first.signature).toBe(second.signature);
    expect(first.sources.map((source) => source.score)).toEqual(second.sources.map((source) => source.score));
  });
});
