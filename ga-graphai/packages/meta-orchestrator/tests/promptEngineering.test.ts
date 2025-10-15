import { describe, expect, it } from 'vitest';

import {
  CollaborativeContextBroker,
  ContextAwareDecomposer,
  HierarchicalSummarizer,
  MetaPromptPlanner,
  RecursiveSelfImprovementEngine,
  SelfConsensusEngine,
  TokenAwareRetriever,
  clampValue,
  cosineSimilarity
} from '../src/index.js';

function keywordEmbedder(text: string): number[] {
  const keywords = ['climate', 'energy', 'history', 'quantum', 'accuracy', 'clarity', 'facts', 'summary'];
  return keywords.map(keyword => (text.toLowerCase().includes(keyword) ? 1 : 0));
}

describe('RecursiveSelfImprovementEngine', () => {
  it('improves until threshold and prioritizes weakest aspects', async () => {
    let iterationCount = 0;
    const engine = new RecursiveSelfImprovementEngine({
      aspects: ['relevance', 'clarity', 'completeness'],
      qualityThreshold: 0.72,
      maxIterations: 4,
      generator: async (_prompt, iteration) => {
        iterationCount = iteration;
        return iteration < 3 ? `draft v${iteration}` : 'refined answer with clarity and completeness';
      },
      evaluator: async (_output, aspect, iteration) => {
        if (iteration < 3) {
          return aspect === 'clarity' ? 0.3 : aspect === 'completeness' ? 0.4 : 0.5;
        }
        return 0.9;
      }
    });

    const result = await engine.run('Explain the topic.');
    expect(result.success).toBe(true);
    expect(result.iterations).toBe(3);
    expect(iterationCount).toBe(3);
    expect(result.logs[0].prioritizedAspects[0]).toBe('clarity');
    expect(result.logs.at(-1)?.aggregateScore).toBeGreaterThanOrEqual(0.72);
  });
});

describe('ContextAwareDecomposer', () => {
  it('selects high saliency segments and adapts threshold', async () => {
    const decomposer = new ContextAwareDecomposer({
      embed: keywordEmbedder,
      adaptiveThreshold: true
    });
    const segments = [
      { id: '1', text: 'Climate change impacts include energy transition.' },
      { id: '2', text: 'Ancient history details.' },
      { id: '3', text: 'Renewable energy adoption strategies and climate policy.' }
    ];

    const result = await decomposer.decompose('How is climate policy improving energy?', segments);
    expect(result.selected).toHaveLength(2);
    expect(result.selected.map(segment => segment.id)).toContain('1');
    expect(result.selected.map(segment => segment.id)).toContain('3');
    expect(result.threshold).toBeGreaterThan(0.55);
  });
});

describe('TokenAwareRetriever', () => {
  it('keeps documents within token budget sorted by saliency', async () => {
    const retriever = new TokenAwareRetriever({
      embed: keywordEmbedder,
      tokenBudget: 12,
      minimumRelevance: 0.4,
      estimateTokens: text => text.split(/\s+/).length
    });
    const docs = [
      { id: 'a', text: 'Climate science facts and accuracy improvements.' },
      { id: 'b', text: 'Cooking recipes unrelated to climate.' },
      { id: 'c', text: 'Energy transition and climate resilience summary.' }
    ];

    const retrieved = await retriever.retrieve('climate energy accuracy', docs);
    expect(retrieved.documents).toHaveLength(2);
    expect(retrieved.usedTokens).toBeLessThanOrEqual(12);
    expect(retrieved.documents[0].saliency).toBeGreaterThanOrEqual(retrieved.documents[1].saliency);
  });
});

describe('MetaPromptPlanner', () => {
  it('selects modules within budget and updates weights from feedback', () => {
    const planner = new MetaPromptPlanner({
      tokenBudget: 120,
      modules: [
        {
          name: 'summary',
          estimatedTokens: 40,
          template: context => `Summarize: ${context.task}`
        },
        {
          name: 'fact-check',
          estimatedTokens: 70,
          template: context => `Verify facts in: ${context.task}`
        },
        {
          name: 'brainstorm',
          estimatedTokens: 60,
          minComplexity: 0.6,
          template: context => `Brainstorm ideas about ${context.task}`
        }
      ]
    });

    const plan = planner.plan({ task: 'climate strategy', complexity: 0.8 });
    expect(plan.modules).toContain('summary');
    expect(plan.modules).toContain('brainstorm');
    expect(plan.estimatedTokens).toBeLessThanOrEqual(120);

    planner.recordFeedback({ module: 'fact-check', score: 0.9, tokenCost: 80 });
    const updated = planner.plan({ task: 'climate strategy', complexity: 0.4 });
    expect(updated.modules).toContain('summary');
    expect(updated.modules).not.toContain('brainstorm');
  });
});

describe('SelfConsensusEngine', () => {
  it('clusters candidates and returns consensus from majority cluster', async () => {
    const engine = new SelfConsensusEngine(cosineSimilarity);
    const outputs = ['Answer about climate accuracy.', 'Answer about climate accuracy!', 'Different topic entirely.'];
    const consensus = await engine.generateConsensus({
      prompt: 'Explain climate accuracy measures.',
      variants: outputs.length,
      generator: async (_prompt, variant) => outputs[variant],
      embed: keywordEmbedder
    });
    expect(consensus.clusters[0].members.length).toBeGreaterThanOrEqual(2);
    expect(consensus.consensus).toContain('climate');
  });
});

describe('HierarchicalSummarizer', () => {
  it('produces progressively shorter summaries until within limit', async () => {
    const summarizer = new HierarchicalSummarizer({
      layers: [
        {
          maxTokens: 20,
          summarizer: async text => text.split(/\s+/).slice(0, 20).join(' ')
        },
        {
          maxTokens: 10,
          summarizer: async text => text.split(/\s+/).slice(0, 10).join(' ')
        }
      ],
      tokenEstimator: text => text.split(/\s+/).length
    });
    const text = Array.from({ length: 40 }, (_, index) => `token${index}`).join(' ');
    const result = await summarizer.summarize(text);
    expect(result.layers.length).toBeGreaterThanOrEqual(2);
    expect(result.finalSummary.split(/\s+/).length).toBeLessThanOrEqual(10);
  });
});

describe('CollaborativeContextBroker', () => {
  it('produces token-bounded diffs and assignments', () => {
    const broker = new CollaborativeContextBroker({ tokenBudget: 30 });
    broker.upsert({ id: 'ctx1', content: 'Climate accuracy metrics update.', updatedAt: 10, relevance: 0.9 });
    broker.upsert({ id: 'ctx2', content: 'Energy efficiency gains summary.', updatedAt: 12, relevance: 0.8 });
    broker.upsert({ id: 'ctx3', content: 'Irrelevant note about history.', updatedAt: 15, relevance: 0.2 });

    const diffs = broker.diffSince(9);
    expect(diffs.length).toBeGreaterThanOrEqual(2);
    const assignments = broker.assignContext(['alpha', 'beta'], 'Base prompt', 9);
    expect(assignments[0].prompt).toContain('Context');
    expect(assignments[0].contextIds.length).toBeGreaterThanOrEqual(1);
  });
});

it('clampValue helper constrains values', () => {
  expect(clampValue(2, 0, 1)).toBe(1);
  expect(clampValue(-1, 0, 1)).toBe(0);
});
