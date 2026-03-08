"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONTEXT_POLICIES = exports.DEFAULT_BUDGET_POLICY = exports.DEFAULT_STREAM_POLICIES = void 0;
exports.DEFAULT_STREAM_POLICIES = {
    system: {
        stream: 'system',
        maxTokens: 800,
        priority: 100,
        earlyKeepCount: 1,
        recentKeepCount: 1,
        compressionThreshold: 400,
        pinnedLabels: ['policy', 'pinned'],
    },
    user: {
        stream: 'user',
        maxTokens: 800,
        priority: 90,
        earlyKeepCount: 1,
        recentKeepCount: 2,
        compressionThreshold: 400,
    },
    history: {
        stream: 'history',
        maxTokens: 1800,
        priority: 60,
        earlyKeepCount: 2,
        recentKeepCount: 3,
        compressionThreshold: 300,
    },
    tools: {
        stream: 'tools',
        maxTokens: 600,
        priority: 50,
        earlyKeepCount: 1,
        recentKeepCount: 1,
        compressionThreshold: 300,
    },
    toolOutputs: {
        stream: 'toolOutputs',
        maxTokens: 1200,
        priority: 40,
        earlyKeepCount: 1,
        recentKeepCount: 2,
        compressionThreshold: 250,
    },
    retrieval: {
        stream: 'retrieval',
        maxTokens: 1200,
        priority: 45,
        earlyKeepCount: 1,
        recentKeepCount: 2,
        compressionThreshold: 250,
    },
    state: {
        stream: 'state',
        maxTokens: 600,
        priority: 80,
        earlyKeepCount: 1,
        recentKeepCount: 1,
        compressionThreshold: 200,
    },
    workingMemory: {
        stream: 'workingMemory',
        maxTokens: 600,
        priority: 70,
        earlyKeepCount: 1,
        recentKeepCount: 2,
        compressionThreshold: 200,
    },
};
exports.DEFAULT_BUDGET_POLICY = {
    totalBudget: 6400,
    elasticOverflow: 400,
    perStream: exports.DEFAULT_STREAM_POLICIES,
};
exports.DEFAULT_CONTEXT_POLICIES = {
    budget: exports.DEFAULT_BUDGET_POLICY,
    toolOutput: {
        maxTokens: 300,
        allowedFields: [],
    },
};
