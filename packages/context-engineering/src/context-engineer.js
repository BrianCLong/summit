"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildContext = buildContext;
exports.updateContextOnToolResult = updateContextOnToolResult;
exports.compressIfNeeded = compressIfNeeded;
exports.retrieveIfTriggered = retrieveIfTriggered;
const policy_js_1 = require("./policy.js");
const token_js_1 = require("./token.js");
const tool_output_js_1 = require("./tool-output.js");
const eviction_js_1 = require("./eviction.js");
const compression_js_1 = require("./compression.js");
const manifest_schema_js_1 = require("./manifest-schema.js");
const STREAMS = [
    'system',
    'user',
    'history',
    'tools',
    'toolOutputs',
    'retrieval',
    'state',
    'workingMemory',
];
function nowIso() {
    return new Date().toISOString();
}
function normalizeItems(inputs, stream, offset) {
    if (!inputs?.length)
        return [];
    return inputs.map((input, index) => {
        if (!input.source) {
            throw new Error(`Context item missing source for stream ${stream}`);
        }
        if (!input.provenance) {
            throw new Error(`Context item missing provenance for stream ${stream}`);
        }
        const id = input.id ?? `${stream}-${offset + index + 1}`;
        const content = input.content ?? '';
        const addedAt = input.addedAt ?? nowIso();
        return {
            ...input,
            id,
            stream,
            content,
            addedAt,
            compressionState: input.compressionState ?? 'none',
            tokenCost: (0, token_js_1.estimateTokens)(content),
        };
    });
}
function applyToolPolicies(items, policies) {
    return items.map(item => {
        if (item.stream !== 'toolOutputs') {
            return item;
        }
        const adapted = (0, tool_output_js_1.adaptToolOutput)(item.content, policies.toolOutput);
        return {
            ...item,
            content: adapted.content,
            tokenCost: adapted.tokenCost,
        };
    });
}
function applyCompression(items, policies) {
    return items.map(item => {
        const streamPolicy = policies.budget.perStream[item.stream];
        return (0, compression_js_1.compressItemIfNeeded)(item, streamPolicy);
    });
}
function applyBudgets(items, policies) {
    const perStream = {
        system: [],
        user: [],
        history: [],
        tools: [],
        toolOutputs: [],
        retrieval: [],
        state: [],
        workingMemory: [],
    };
    for (const item of items) {
        perStream[item.stream].push(item);
    }
    const kept = [];
    const evicted = [];
    for (const stream of STREAMS) {
        const policy = policies.budget.perStream[stream];
        const result = (0, eviction_js_1.applyStreamBudget)(perStream[stream], policy);
        kept.push(...result.kept);
        evicted.push(...result.evicted);
    }
    const totalBudget = policies.budget.totalBudget + policies.budget.elasticOverflow;
    const overflow = enforceTotalBudget(kept, policies, totalBudget);
    return { kept: overflow.kept, evicted: [...evicted, ...overflow.evicted] };
}
function enforceTotalBudget(items, policies, totalBudget) {
    const sorted = [...items].sort((a, b) => {
        const aPriority = policies.budget.perStream[a.stream].priority;
        const bPriority = policies.budget.perStream[b.stream].priority;
        if (aPriority !== bPriority) {
            return bPriority - aPriority;
        }
        return a.addedAt.localeCompare(b.addedAt);
    });
    let total = sorted.reduce((sum, item) => sum + item.tokenCost, 0);
    if (total <= totalBudget) {
        return { kept: sorted, evicted: [] };
    }
    const evicted = [];
    for (let i = sorted.length - 1; i >= 0 && total > totalBudget; i -= 1) {
        const item = sorted[i];
        total -= item.tokenCost;
        evicted.push({ ...item, evictionReason: 'total-budget' });
        sorted.splice(i, 1);
    }
    return { kept: sorted, evicted };
}
function buildMetrics(kept, evicted, policies, input) {
    const totalTokens = kept.reduce((sum, item) => sum + item.tokenCost, 0);
    const totalBudget = policies.budget.totalBudget;
    const totalItems = kept.length + evicted.length;
    const evictionFrequency = totalItems ? evicted.length / totalItems : 0;
    const retrievedIds = input.retrievalUsage?.retrievedIds ?? [];
    const referencedIds = new Set(input.retrievalUsage?.referencedIds ?? []);
    const retrievalPrecision = retrievedIds.length === 0
        ? 0
        : retrievedIds.filter(id => referencedIds.has(id)).length /
            retrievedIds.length;
    const pinnedLabels = new Set(policies.budget.perStream.history.pinnedLabels ?? ['intent', 'commitment']);
    const pinnedTotal = kept.filter(item => item.policyLabels?.some(label => pinnedLabels.has(label))).length;
    const pinnedEvicted = evicted.filter(item => item.policyLabels?.some(label => pinnedLabels.has(label))).length;
    const informationPersistence = pinnedTotal + pinnedEvicted === 0
        ? 1
        : pinnedTotal / (pinnedTotal + pinnedEvicted);
    const tokenSinks = STREAMS.map(stream => ({
        stream,
        tokens: kept
            .filter(item => item.stream === stream)
            .reduce((sum, item) => sum + item.tokenCost, 0),
    }))
        .sort((a, b) => b.tokens - a.tokens)
        .slice(0, 5);
    return {
        context_utilization: totalBudget ? totalTokens / totalBudget : 0,
        eviction_frequency: evictionFrequency,
        retrieval_precision_proxy: retrievalPrecision,
        information_persistence: informationPersistence,
        token_sinks: tokenSinks,
        total_tokens: totalTokens,
    };
}
function buildManifest(kept, evicted, metrics) {
    const evictions = evicted.map(item => ({
        itemId: item.id,
        stream: item.stream,
        reason: item.evictionReason ?? 'budget',
        tokenCost: item.tokenCost,
        evictedAt: nowIso(),
    }));
    return {
        schemaVersion: manifest_schema_js_1.CONTEXT_MANIFEST_SCHEMA_VERSION,
        createdAt: nowIso(),
        items: [...kept, ...evicted],
        evictions,
        metrics,
    };
}
function toMessages(items) {
    return items
        .sort((a, b) => a.addedAt.localeCompare(b.addedAt))
        .map(item => ({
        role: item.stream === 'system'
            ? 'system'
            : item.stream === 'user'
                ? 'user'
                : 'assistant',
        content: typeof item.content === 'string'
            ? item.content
            : (0, token_js_1.stableStringify)(item.content),
    }));
}
function buildContext(input) {
    const policies = {
        budget: {
            ...policy_js_1.DEFAULT_CONTEXT_POLICIES.budget,
            ...(input.policies?.budget ?? {}),
            perStream: {
                ...policy_js_1.DEFAULT_CONTEXT_POLICIES.budget.perStream,
                ...(input.policies?.budget?.perStream ?? {}),
            },
        },
        toolOutput: {
            ...policy_js_1.DEFAULT_CONTEXT_POLICIES.toolOutput,
            ...(input.policies?.toolOutput ?? {}),
        },
    };
    const streams = [
        ...normalizeItems(input.system, 'system', 0),
        ...normalizeItems(input.user, 'user', 1000),
        ...normalizeItems(input.history, 'history', 2000),
        ...normalizeItems(input.tools, 'tools', 3000),
        ...normalizeItems(input.toolOutputs, 'toolOutputs', 4000),
        ...normalizeItems(input.retrieval, 'retrieval', 5000),
        ...normalizeItems(input.state, 'state', 6000),
        ...normalizeItems(input.workingMemory, 'workingMemory', 7000),
    ];
    const adapted = applyToolPolicies(streams, policies);
    const compressed = applyCompression(adapted, policies);
    const { kept, evicted } = applyBudgets(compressed, policies);
    const metrics = buildMetrics(kept, evicted, policies, input);
    const manifest = buildManifest(kept, evicted, metrics);
    return {
        messages: toMessages(kept),
        manifest,
        metrics,
    };
}
function updateContextOnToolResult(input, result) {
    const toolOutputs = input.toolOutputs ? [...input.toolOutputs] : [];
    toolOutputs.push({ ...result, stream: 'toolOutputs' });
    return buildContext({ ...input, toolOutputs });
}
function compressIfNeeded(items, policies) {
    const policy = {
        budget: {
            ...policy_js_1.DEFAULT_CONTEXT_POLICIES.budget,
            ...(policies?.budget ?? {}),
            perStream: {
                ...policy_js_1.DEFAULT_CONTEXT_POLICIES.budget.perStream,
                ...(policies?.budget?.perStream ?? {}),
            },
        },
        toolOutput: {
            ...policy_js_1.DEFAULT_CONTEXT_POLICIES.toolOutput,
            ...(policies?.toolOutput ?? {}),
        },
    };
    return applyCompression(items, policy);
}
async function retrieveIfTriggered(trigger, retrieve) {
    if (!trigger) {
        return {
            items: [],
            query: '',
            summary: 'Retrieval not triggered.',
            empty: true,
        };
    }
    const items = await retrieve(trigger.query);
    return {
        items,
        query: trigger.query,
        summary: items.length
            ? `Retrieved ${items.length} items for ${trigger.reason}.`
            : `No docs found for query "${trigger.query}".`,
        empty: items.length === 0,
    };
}
