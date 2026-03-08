"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollaborativeContextBroker = exports.HierarchicalSummarizer = exports.SelfConsensusEngine = exports.MetaPromptPlanner = exports.TokenAwareRetriever = exports.ContextAwareDecomposer = exports.RecursiveSelfImprovementEngine = void 0;
exports.clampValue = clamp;
exports.cosineSimilarity = cosineSimilarity;
const node_crypto_1 = require("node:crypto");
const DEFAULT_ASPECT_WEIGHTS = {
    relevance: 0.3,
    clarity: 0.2,
    completeness: 0.25,
    factuality: 0.2,
    safety: 0.05
};
const DEFAULT_MAX_ITERATIONS = 5;
const DEFAULT_THRESHOLD = 0.88;
const DEFAULT_FOCUS_WINDOW = 3;
function normalizeWeights(weights) {
    const entries = Object.entries(weights);
    const total = entries.reduce((acc, [, value]) => acc + value, 0);
    if (total === 0) {
        const normalized = {};
        for (const [aspect] of entries) {
            normalized[aspect] = 1 / entries.length;
        }
        return normalized;
    }
    const normalized = {};
    for (const [aspect, value] of entries) {
        normalized[aspect] = value / total;
    }
    return normalized;
}
class RecursiveSelfImprovementEngine {
    aspects;
    generator;
    evaluator;
    refinePrompt;
    maxIterations;
    qualityThreshold;
    focusWindow;
    weights;
    logger;
    constructor(options) {
        if (options.aspects.length === 0) {
            throw new Error('RSIP requires at least one quality aspect.');
        }
        this.aspects = [...options.aspects];
        this.generator = options.generator;
        this.evaluator = options.evaluator;
        this.refinePrompt = options.refinePrompt;
        this.maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
        this.qualityThreshold = options.qualityThreshold ?? DEFAULT_THRESHOLD;
        this.focusWindow = options.focusWindow ?? DEFAULT_FOCUS_WINDOW;
        const mergedWeights = { ...DEFAULT_ASPECT_WEIGHTS };
        for (const aspect of this.aspects) {
            mergedWeights[aspect] = options.aspectWeights?.[aspect] ?? mergedWeights[aspect] ?? 1;
        }
        this.weights = normalizeWeights(mergedWeights);
        this.logger = options.logger;
    }
    async run(initialPrompt) {
        let currentPrompt = initialPrompt;
        const logs = [];
        for (let iteration = 1; iteration <= this.maxIterations; iteration += 1) {
            const output = await this.generator(currentPrompt, iteration, logs);
            const aspectScores = {};
            for (const aspect of this.aspects) {
                const score = await this.evaluator(output, aspect, iteration, logs);
                aspectScores[aspect] = clamp(score, 0, 1);
            }
            const prioritizedAspects = this.prioritizeAspects(logs, aspectScores);
            const aggregateScore = this.aggregateScore(aspectScores);
            const iterationLog = {
                iteration,
                prompt: currentPrompt,
                output,
                aspectScores,
                prioritizedAspects,
                aggregateScore
            };
            logs.push(iterationLog);
            if (this.logger) {
                this.logger(iterationLog);
            }
            if (aggregateScore >= this.qualityThreshold) {
                return {
                    success: true,
                    finalOutput: output,
                    iterations: iteration,
                    logs
                };
            }
            currentPrompt = this.buildRefinementPrompt(currentPrompt, output, prioritizedAspects, iteration, logs);
        }
        const finalLog = logs[logs.length - 1];
        return {
            success: false,
            finalOutput: finalLog?.output ?? '',
            iterations: logs.length,
            logs
        };
    }
    prioritizeAspects(history, latestScores) {
        const window = history.slice(Math.max(0, history.length - (this.focusWindow - 1)));
        const blendedScores = new Map();
        for (const aspect of this.aspects) {
            const historical = window.map(entry => entry.aspectScores[aspect]).filter(score => typeof score === 'number');
            const historyAverage = historical.length === 0
                ? 1
                : historical.reduce((acc, value) => acc + value, 0) / historical.length;
            const blended = (historyAverage + latestScores[aspect]) / 2;
            blendedScores.set(aspect, blended);
        }
        return [...blendedScores.entries()]
            .sort(([, scoreA], [, scoreB]) => scoreA - scoreB)
            .map(([aspect]) => aspect);
    }
    aggregateScore(aspectScores) {
        return this.aspects.reduce((acc, aspect) => acc + (aspectScores[aspect] ?? 0) * (this.weights[aspect] ?? 0), 0);
    }
    buildRefinementPrompt(previousPrompt, output, prioritizedAspects, iteration, history) {
        if (this.refinePrompt) {
            return this.refinePrompt(previousPrompt, output, prioritizedAspects, iteration, history);
        }
        const focus = prioritizedAspects.slice(0, 2).join(' and ') || 'overall quality';
        return [
            'You are refining a draft response. Improve it with focus on the weakest aspects.',
            `Priority aspects: ${focus}.`,
            'Original prompt:',
            previousPrompt,
            'Current draft:',
            output,
            'Return an improved version that addresses the priority aspects while keeping strengths intact.'
        ].join('\n\n');
    }
}
exports.RecursiveSelfImprovementEngine = RecursiveSelfImprovementEngine;
const DEFAULT_SALIENCY_THRESHOLD = 0.55;
function cosineSimilarity(a, b) {
    if (a.length !== b.length || a.length === 0) {
        return 0;
    }
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i += 1) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) {
        return 0;
    }
    return dot / Math.sqrt(normA * normB);
}
class ContextAwareDecomposer {
    embed;
    similarity;
    saliencyThreshold;
    adaptiveThreshold;
    maxSegments;
    constructor(options) {
        this.embed = options.embed;
        this.similarity = options.similarity ?? cosineSimilarity;
        this.saliencyThreshold = options.saliencyThreshold ?? DEFAULT_SALIENCY_THRESHOLD;
        this.adaptiveThreshold = options.adaptiveThreshold ?? true;
        this.maxSegments = options.maxSegments;
    }
    async decompose(task, segments) {
        const taskEmbedding = await this.embed(task);
        const scoredSegments = [];
        for (const segment of segments) {
            const embedding = await this.embed(segment.text);
            const saliency = clamp(this.similarity(taskEmbedding, embedding), 0, 1);
            scoredSegments.push({ ...segment, saliency });
        }
        const threshold = this.computeThreshold(scoredSegments);
        const selected = scoredSegments
            .filter(segment => segment.saliency >= threshold)
            .sort((a, b) => b.saliency - a.saliency);
        const cappedSelected = this.maxSegments ? selected.slice(0, this.maxSegments) : selected;
        const selectedIds = new Set(cappedSelected.map(segment => segment.id));
        const discarded = scoredSegments.filter(segment => !selectedIds.has(segment.id));
        return {
            selected: cappedSelected,
            discarded,
            threshold
        };
    }
    computeThreshold(segments) {
        if (!this.adaptiveThreshold || segments.length === 0) {
            return this.saliencyThreshold;
        }
        const values = segments.map(segment => segment.saliency).sort((a, b) => a - b);
        const median = values[Math.floor(values.length / 2)];
        const dynamic = Math.max(this.saliencyThreshold, (median + Math.max(...values)) / 2 - 0.1);
        return clamp(dynamic, this.saliencyThreshold, 0.95);
    }
}
exports.ContextAwareDecomposer = ContextAwareDecomposer;
const DEFAULT_TOKEN_BUDGET = 1024;
function defaultTokenEstimator(text) {
    return text.split(/\s+/).filter(Boolean).length;
}
class TokenAwareRetriever {
    embed;
    similarity;
    estimateTokens;
    tokenBudget;
    minimumRelevance;
    constructor(options) {
        this.embed = options.embed;
        this.similarity = options.similarity ?? cosineSimilarity;
        this.estimateTokens = options.estimateTokens ?? defaultTokenEstimator;
        this.tokenBudget = options.tokenBudget ?? DEFAULT_TOKEN_BUDGET;
        this.minimumRelevance = options.minimumRelevance ?? 0.4;
    }
    async retrieve(query, documents) {
        const queryEmbedding = await this.embed(query);
        const scoredDocuments = [];
        for (const document of documents) {
            const embedding = await this.embed(document.text);
            const saliency = clamp(this.similarity(queryEmbedding, embedding), 0, 1);
            const tokens = this.estimateTokens(document.text);
            if (saliency >= this.minimumRelevance) {
                scoredDocuments.push({ ...document, saliency, tokens });
            }
        }
        scoredDocuments.sort((a, b) => b.saliency - a.saliency || a.tokens - b.tokens);
        const selected = [];
        let usedTokens = 0;
        for (const doc of scoredDocuments) {
            if (usedTokens + doc.tokens > this.tokenBudget) {
                continue;
            }
            selected.push(doc);
            usedTokens += doc.tokens;
        }
        return {
            documents: selected,
            usedTokens,
            budget: this.tokenBudget
        };
    }
}
exports.TokenAwareRetriever = TokenAwareRetriever;
class MetaPromptPlanner {
    modules;
    tokenBudget;
    weights = new Map();
    constructor(options) {
        this.modules = options.modules;
        this.tokenBudget = options.tokenBudget;
        for (const module of this.modules) {
            this.weights.set(module.name, 1);
        }
    }
    plan(context) {
        const sorted = [...this.modules].sort((a, b) => {
            const weightA = this.weights.get(a.name) ?? 1;
            const weightB = this.weights.get(b.name) ?? 1;
            return weightB - weightA;
        });
        const selected = [];
        let estimatedTokens = 0;
        for (const module of sorted) {
            if (!this.isModuleEligible(module, context)) {
                continue;
            }
            if (module.mandatory || estimatedTokens + module.estimatedTokens <= this.tokenBudget) {
                selected.push(module);
                estimatedTokens += module.estimatedTokens;
            }
        }
        const promptSections = selected.map(module => module.template(context));
        return {
            prompt: promptSections.join('\n\n'),
            modules: selected.map(module => module.name),
            estimatedTokens
        };
    }
    recordFeedback(feedback) {
        const current = this.weights.get(feedback.module) ?? 1;
        const adjustment = feedback.score >= 0.8 ? 0.1 : feedback.score < 0.4 ? -0.2 : -0.05;
        const tokenPenalty = feedback.tokenCost ? Math.max(0, feedback.tokenCost - this.tokenBudget) / this.tokenBudget : 0;
        const next = clamp(current + adjustment - tokenPenalty, 0.1, 3);
        this.weights.set(feedback.module, next);
    }
    isModuleEligible(module, context) {
        const complexity = context.complexity ?? 0.5;
        if (module.minComplexity !== undefined && complexity < module.minComplexity) {
            return false;
        }
        if (module.maxComplexity !== undefined && complexity > module.maxComplexity) {
            return false;
        }
        return true;
    }
}
exports.MetaPromptPlanner = MetaPromptPlanner;
const DEFAULT_SIMILARITY_THRESHOLD = 0.82;
function averageVector(vectors) {
    if (vectors.length === 0) {
        return [];
    }
    const length = vectors[0].length;
    const result = new Array(length).fill(0);
    for (const vector of vectors) {
        for (let i = 0; i < length; i += 1) {
            result[i] += vector[i];
        }
    }
    return result.map(value => value / vectors.length);
}
class SelfConsensusEngine {
    similarity;
    constructor(similarity) {
        this.similarity = similarity ?? cosineSimilarity;
    }
    async generateConsensus(options) {
        const totalVariants = options.variants ?? 3;
        const candidates = [];
        for (let variant = 0; variant < totalVariants; variant += 1) {
            const text = await options.generator(options.prompt, variant);
            const embedding = await options.embed(text);
            candidates.push({ variant, text, embedding });
        }
        const clusters = this.clusterCandidates(candidates, options.similarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD);
        const consensus = this.selectConsensus(clusters, candidates);
        return {
            consensus,
            clusters,
            candidates: candidates.map(candidate => ({ variant: candidate.variant, text: candidate.text }))
        };
    }
    clusterCandidates(candidates, threshold) {
        const clusters = [];
        for (const candidate of candidates) {
            let added = false;
            for (const cluster of clusters) {
                const similarity = this.similarity(cluster.centroid, candidate.embedding);
                if (similarity >= threshold) {
                    cluster.members.push(candidate);
                    cluster.centroid = averageVector(cluster.members.map(member => member.embedding));
                    added = true;
                    break;
                }
            }
            if (!added) {
                clusters.push({
                    id: (0, node_crypto_1.randomUUID)(),
                    members: [candidate],
                    centroid: [...candidate.embedding]
                });
            }
        }
        return clusters;
    }
    selectConsensus(clusters, candidates) {
        if (clusters.length === 0) {
            return '';
        }
        const sortedClusters = [...clusters].sort((a, b) => b.members.length - a.members.length);
        const primary = sortedClusters[0];
        if (primary.members.length === 1 && sortedClusters.length > 1) {
            const byCentrality = [...candidates].sort((a, b) => {
                const avgSimA = this.averageSimilarity(a, candidates);
                const avgSimB = this.averageSimilarity(b, candidates);
                return avgSimB - avgSimA;
            });
            return byCentrality[0]?.text ?? primary.members[0].text;
        }
        return primary.members[0].text;
    }
    averageSimilarity(candidate, candidates) {
        if (candidates.length <= 1) {
            return 1;
        }
        const total = candidates.reduce((acc, other) => acc + (other === candidate ? 0 : this.similarity(candidate.embedding, other.embedding)), 0);
        return total / (candidates.length - 1);
    }
}
exports.SelfConsensusEngine = SelfConsensusEngine;
class HierarchicalSummarizer {
    layers;
    estimateTokens;
    constructor(options) {
        if (options.layers.length === 0) {
            throw new Error('Hierarchical summarizer requires at least one layer.');
        }
        this.layers = options.layers;
        this.estimateTokens = options.tokenEstimator ?? defaultTokenEstimator;
    }
    async summarize(text) {
        const results = [];
        let current = text;
        for (let index = 0; index < this.layers.length; index += 1) {
            const layer = this.layers[index];
            const tokens = this.estimateTokens(current);
            if (tokens <= layer.maxTokens) {
                results.push({ layer: index, summary: current, tokens });
                return { layers: results, finalSummary: current };
            }
            const summary = await layer.summarizer(current, index);
            const summaryTokens = this.estimateTokens(summary);
            results.push({ layer: index, summary, tokens: summaryTokens });
            current = summary;
        }
        return { layers: results, finalSummary: current };
    }
}
exports.HierarchicalSummarizer = HierarchicalSummarizer;
const DEFAULT_DECAY = 0.92;
class CollaborativeContextBroker {
    tokenBudget;
    estimateTokens;
    decay;
    states = new Map();
    constructor(options) {
        this.tokenBudget = options.tokenBudget;
        this.estimateTokens = options.tokenEstimator ?? defaultTokenEstimator;
        this.decay = options.relevanceDecay ?? DEFAULT_DECAY;
    }
    upsert(state) {
        const existing = this.states.get(state.id);
        const blendedRelevance = existing
            ? existing.relevance !== undefined && state.relevance !== undefined
                ? clamp(existing.relevance * this.decay + state.relevance * (1 - this.decay), 0, 1)
                : state.relevance ?? existing.relevance
            : state.relevance;
        this.states.set(state.id, {
            ...state,
            relevance: blendedRelevance
        });
    }
    diffSince(timestamp) {
        const diffs = [];
        for (const state of this.states.values()) {
            if (state.updatedAt <= timestamp) {
                continue;
            }
            const tokens = this.estimateTokens(state.content);
            const relevance = state.relevance ?? 0.5;
            diffs.push({ id: state.id, content: state.content, tokens, relevance });
        }
        diffs.sort((a, b) => b.relevance - a.relevance || a.tokens - b.tokens);
        const selected = [];
        let usedTokens = 0;
        for (const diff of diffs) {
            if (usedTokens + diff.tokens > this.tokenBudget) {
                continue;
            }
            selected.push(diff);
            usedTokens += diff.tokens;
        }
        return selected;
    }
    assignContext(agents, basePrompt, timestamp) {
        const diffs = this.diffSince(timestamp);
        const assignments = [];
        let diffIndex = 0;
        for (const agent of agents) {
            const contextIds = [];
            const sections = [basePrompt];
            while (diffIndex < diffs.length) {
                const diff = diffs[diffIndex];
                diffIndex += 1;
                contextIds.push(diff.id);
                sections.push(`Context(${diff.id}):\n${diff.content}`);
                if (contextIds.length >= 2) {
                    break;
                }
            }
            assignments.push({
                agent,
                prompt: sections.join('\n\n'),
                contextIds
            });
        }
        return assignments;
    }
}
exports.CollaborativeContextBroker = CollaborativeContextBroker;
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
