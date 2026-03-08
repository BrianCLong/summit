"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
function keywordEmbedder(text) {
    const keywords = ['climate', 'energy', 'history', 'quantum', 'accuracy', 'clarity', 'facts', 'summary'];
    return keywords.map(keyword => (text.toLowerCase().includes(keyword) ? 1 : 0));
}
(0, vitest_1.describe)('RecursiveSelfImprovementEngine', () => {
    (0, vitest_1.it)('improves until threshold and prioritizes weakest aspects', async () => {
        let iterationCount = 0;
        const engine = new index_js_1.RecursiveSelfImprovementEngine({
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
        (0, vitest_1.expect)(result.success).toBe(true);
        (0, vitest_1.expect)(result.iterations).toBe(3);
        (0, vitest_1.expect)(iterationCount).toBe(3);
        (0, vitest_1.expect)(result.logs[0].prioritizedAspects[0]).toBe('clarity');
        (0, vitest_1.expect)(result.logs.at(-1)?.aggregateScore).toBeGreaterThanOrEqual(0.72);
    });
});
(0, vitest_1.describe)('ContextAwareDecomposer', () => {
    (0, vitest_1.it)('selects high saliency segments and adapts threshold', async () => {
        const decomposer = new index_js_1.ContextAwareDecomposer({
            embed: keywordEmbedder,
            adaptiveThreshold: true
        });
        const segments = [
            { id: '1', text: 'Climate change impacts include energy transition.' },
            { id: '2', text: 'Ancient history details.' },
            { id: '3', text: 'Renewable energy adoption strategies and climate policy.' }
        ];
        const result = await decomposer.decompose('How is climate policy improving energy?', segments);
        (0, vitest_1.expect)(result.selected).toHaveLength(2);
        (0, vitest_1.expect)(result.selected.map(segment => segment.id)).toContain('1');
        (0, vitest_1.expect)(result.selected.map(segment => segment.id)).toContain('3');
        (0, vitest_1.expect)(result.threshold).toBeGreaterThan(0.55);
    });
});
(0, vitest_1.describe)('TokenAwareRetriever', () => {
    (0, vitest_1.it)('keeps documents within token budget sorted by saliency', async () => {
        const retriever = new index_js_1.TokenAwareRetriever({
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
        (0, vitest_1.expect)(retrieved.documents).toHaveLength(2);
        (0, vitest_1.expect)(retrieved.usedTokens).toBeLessThanOrEqual(12);
        (0, vitest_1.expect)(retrieved.documents[0].saliency).toBeGreaterThanOrEqual(retrieved.documents[1].saliency);
    });
});
(0, vitest_1.describe)('MetaPromptPlanner', () => {
    (0, vitest_1.it)('selects modules within budget and updates weights from feedback', () => {
        const planner = new index_js_1.MetaPromptPlanner({
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
        (0, vitest_1.expect)(plan.modules).toContain('summary');
        (0, vitest_1.expect)(plan.modules).toContain('brainstorm');
        (0, vitest_1.expect)(plan.estimatedTokens).toBeLessThanOrEqual(120);
        planner.recordFeedback({ module: 'fact-check', score: 0.9, tokenCost: 80 });
        const updated = planner.plan({ task: 'climate strategy', complexity: 0.4 });
        (0, vitest_1.expect)(updated.modules).toContain('summary');
        (0, vitest_1.expect)(updated.modules).not.toContain('brainstorm');
    });
});
(0, vitest_1.describe)('SelfConsensusEngine', () => {
    (0, vitest_1.it)('clusters candidates and returns consensus from majority cluster', async () => {
        const engine = new index_js_1.SelfConsensusEngine(index_js_1.cosineSimilarity);
        const outputs = ['Answer about climate accuracy.', 'Answer about climate accuracy!', 'Different topic entirely.'];
        const consensus = await engine.generateConsensus({
            prompt: 'Explain climate accuracy measures.',
            variants: outputs.length,
            generator: async (_prompt, variant) => outputs[variant],
            embed: keywordEmbedder
        });
        (0, vitest_1.expect)(consensus.clusters[0].members.length).toBeGreaterThanOrEqual(2);
        (0, vitest_1.expect)(consensus.consensus).toContain('climate');
    });
});
(0, vitest_1.describe)('HierarchicalSummarizer', () => {
    (0, vitest_1.it)('produces progressively shorter summaries until within limit', async () => {
        const summarizer = new index_js_1.HierarchicalSummarizer({
            layers: [
                {
                    maxTokens: 20,
                    summarizer: async (text) => text.split(/\s+/).slice(0, 20).join(' ')
                },
                {
                    maxTokens: 10,
                    summarizer: async (text) => text.split(/\s+/).slice(0, 10).join(' ')
                }
            ],
            tokenEstimator: text => text.split(/\s+/).length
        });
        const text = Array.from({ length: 40 }, (_, index) => `token${index}`).join(' ');
        const result = await summarizer.summarize(text);
        (0, vitest_1.expect)(result.layers.length).toBeGreaterThanOrEqual(2);
        (0, vitest_1.expect)(result.finalSummary.split(/\s+/).length).toBeLessThanOrEqual(10);
    });
});
(0, vitest_1.describe)('PromptEngineeringToolkit', () => {
    (0, vitest_1.it)('runs end-to-end optimisation pipeline and returns structured report', async () => {
        const toolkit = new index_js_1.PromptEngineeringToolkit({
            decomposition: {
                embed: keywordEmbedder,
                adaptiveThreshold: true,
                maxSegments: 2
            },
            retrieval: {
                embed: keywordEmbedder,
                tokenBudget: 20,
                minimumRelevance: 0.3
            },
            summarization: {
                layers: [
                    {
                        maxTokens: 30,
                        summarizer: async (text) => text.split(/\s+/).slice(0, 30).join(' ')
                    },
                    {
                        maxTokens: 15,
                        summarizer: async (text) => text.split(/\s+/).slice(0, 15).join(' ')
                    }
                ]
            },
            planner: {
                tokenBudget: 60,
                modules: [
                    {
                        name: 'summary',
                        estimatedTokens: 20,
                        template: context => `Summarize task: ${context.task}`
                    },
                    {
                        name: 'validate',
                        estimatedTokens: 30,
                        template: context => `Validate insights for ${context.task}`
                    }
                ]
            },
            rsip: {
                aspects: ['relevance', 'clarity'],
                generator: async (prompt) => prompt.includes('::refined::') ? `${prompt.replace('::refined::', '')} ::final::` : `${prompt} ::draft::`,
                evaluator: async (output) => output.includes('::final::') ? 0.95 : output.includes('::draft::') ? 0.6 : 0.8,
                refinePrompt: (previousPrompt, output) => output.includes('::draft::') ? `${previousPrompt} ::refined::` : previousPrompt,
                maxIterations: 3,
                qualityThreshold: 0.8
            },
            consensusThreshold: 0.7,
            broker: {
                tokenLimitPerSync: 50
            }
        });
        const report = await toolkit.optimise({
            task: 'climate strategy accuracy',
            complexity: 0.7,
            segments: [
                { id: 's1', text: 'Climate strategy overview with energy transition focus.' },
                { id: 's2', text: 'Historical anecdotes unrelated.' }
            ],
            documents: [
                { id: 'd1', text: 'Climate energy policy improvements boost accuracy.' },
                { id: 'd2', text: 'Cooking recipe with no relation.' }
            ],
            initialPrompt: 'Explain the latest climate accuracy metrics.',
            agents: ['alpha', 'beta'],
            basePrompt: 'Collaborate on the refined plan.'
        });
        (0, vitest_1.expect)(report.decomposition.selected.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(report.retrieval.documents.length).toBe(1);
        (0, vitest_1.expect)(report.plannedPrompt.modules).toContain('summary');
        (0, vitest_1.expect)(report.rsip.iterations).toBeLessThanOrEqual(3);
        (0, vitest_1.expect)(report.consensus.clusters.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(report.assignments.length).toBe(2);
    });
});
(0, vitest_1.describe)('CollaborativeContextBroker', () => {
    (0, vitest_1.it)('produces token-bounded diffs and assignments', () => {
        const broker = new index_js_1.CollaborativeContextBroker({ tokenLimitPerSync: 30 });
        broker.upsert({ id: 'ctx1', content: 'Climate accuracy metrics update.', lastUpdated: 10 });
        broker.upsert({ id: 'ctx2', content: 'Energy efficiency gains summary.', lastUpdated: 12 });
        broker.upsert({ id: 'ctx3', content: 'Irrelevant note about history.', lastUpdated: 15 });
        const diffs = broker.diffSince(9);
        (0, vitest_1.expect)(diffs.length).toBeGreaterThanOrEqual(2);
        const assignments = broker.assignAgents(['alpha', 'beta'], 'Base prompt', 9);
        (0, vitest_1.expect)(assignments[0].prompt).toContain('Context update');
        (0, vitest_1.expect)(assignments.length).toBe(2);
    });
});
(0, vitest_1.it)('clampValue helper constrains values', () => {
    (0, vitest_1.expect)((0, index_js_1.clampValue)(2, 0, 1)).toBe(1);
    (0, vitest_1.expect)((0, index_js_1.clampValue)(-1, 0, 1)).toBe(0);
});
