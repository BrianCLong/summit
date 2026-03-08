"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphXAIExplainer = void 0;
exports.explainGraph = explainGraph;
// @ts-nocheck
const crypto_1 = __importDefault(require("crypto"));
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const SUPPORTED_TYPES = [
    'node_importance',
    'edge_importance',
    'path_rationale',
    'subgraph_reasoning',
];
const isSupportedType = (type) => SUPPORTED_TYPES.includes(type) || type === 'path_explanation';
const makeErrorExplanation = (reason) => ({
    kind: 'error',
    title: 'Explainability unavailable',
    summary: 'We could not generate an explanation for this request.',
    details: { reason },
});
const normalizeType = (type) => {
    if (type === 'path_explanation') {
        return 'path_rationale';
    }
    if (SUPPORTED_TYPES.includes(type)) {
        return type;
    }
    return 'node_importance';
};
const normalizeGraph = (graph) => ({
    nodes: Array.isArray(graph?.nodes) ? graph?.nodes.slice(0, 50) : [],
    edges: Array.isArray(graph?.edges) ? graph?.edges.slice(0, 100) : [],
});
const hashToNumber = (seed) => {
    const digest = crypto_1.default.createHash('sha256').update(seed).digest('hex').slice(0, 12);
    const int = parseInt(digest, 16);
    return (int % 10_000) / 10_000;
};
const deriveUncertainty = (seed) => {
    const base = hashToNumber(`uncertainty:${seed}`);
    return Number((0.1 + base * 0.2).toFixed(3));
};
const nodeImportance = (graph, query) => {
    const explanations = graph.nodes.map((node, index) => {
        const score = hashToNumber(`node:${node.id}:${query ?? ''}`);
        return {
            kind: 'node_importance',
            title: `Node ${node.id}`,
            summary: `Node ${node.id} is influential for the request${query ? ` "${query}"` : ''}.`,
            details: {
                nodeId: node.id,
                nodeType: node.type ?? 'unknown',
                rank: index + 1,
                score: Number(score.toFixed(3)),
                uncertainty: deriveUncertainty(node.id),
            },
        };
    });
    return explanations.sort((a, b) => (b.details?.score ?? 0) - (a.details?.score ?? 0));
};
const edgeImportance = (graph, query) => {
    const explanations = graph.edges.map((edge, index) => {
        const seed = `${edge.source}-${edge.target}-${query ?? ''}`;
        const score = hashToNumber(seed);
        return {
            kind: 'edge_importance',
            title: `Edge ${edge.source} → ${edge.target}`,
            summary: `Connection ${edge.source} → ${edge.target} provides support for the requested analysis.`,
            details: {
                edgeType: edge.type ?? 'unknown',
                score: Number(score.toFixed(3)),
                rank: index + 1,
                uncertainty: deriveUncertainty(seed),
            },
        };
    });
    return explanations.sort((a, b) => (b.details?.score ?? 0) - (a.details?.score ?? 0));
};
const pathRationale = (graph, query) => {
    if (graph.nodes.length < 2 && graph.edges.length < 1) {
        return [
            makeErrorExplanation('Insufficient graph structure to produce a path rationale.'),
        ];
    }
    const source = graph.nodes[0]?.id ?? graph.edges[0]?.source ?? 'unknown';
    const target = graph.nodes[1]?.id ?? graph.edges[0]?.target ?? 'unknown';
    const seed = `path:${source}:${target}:${query ?? ''}`;
    const score = hashToNumber(seed);
    return [
        {
            kind: 'path_rationale',
            title: `Path from ${source} to ${target}`,
            summary: 'A concise rationale describing how the path connects relevant entities for the request.',
            details: {
                source,
                target,
                steps: Math.max(1, graph.edges.length),
                score: Number(score.toFixed(3)),
                uncertainty: deriveUncertainty(seed),
            },
        },
    ];
};
async function explainGraph(req) {
    try {
        const unsupportedType = req.type !== undefined &&
            !SUPPORTED_TYPES.includes(req.type) &&
            req.type !== 'path_explanation';
        const type = normalizeType(req.type);
        const graph = normalizeGraph(req.graph);
        logger_js_1.default.info({
            message: 'graph_explainer_request',
            type,
            node_count: graph.nodes.length,
            edge_count: graph.edges.length,
        });
        if (unsupportedType) {
            return [makeErrorExplanation(`Unsupported explanation type: ${req.type}`)];
        }
        switch (type) {
            case 'node_importance':
                return nodeImportance(graph, req.query);
            case 'edge_importance':
                return edgeImportance(graph, req.query);
            case 'path_rationale':
            case 'subgraph_reasoning':
                return pathRationale(graph, req.query);
            default:
                return [makeErrorExplanation('Unsupported explanation type')];
        }
    }
    catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        logger_js_1.default.warn({
            message: 'graph_explainer_failed',
            reason,
        });
        return [makeErrorExplanation(reason)];
    }
}
class GraphXAIExplainer {
    static instance;
    explanationCache = new Map();
    modelCards = new Map([
        [
            'ga-core-1.0',
            {
                model_id: 'graph-explainer',
                model_version: 'ga-core-1.0',
                model_type: 'rule_based',
                summary: 'Deterministic, fail-open graph explainer surface.',
                limitations: ['Does not access external models', 'Summaries are heuristic only'],
            },
        ],
    ]);
    static getInstance() {
        if (!GraphXAIExplainer.instance) {
            GraphXAIExplainer.instance = new GraphXAIExplainer();
        }
        return GraphXAIExplainer.instance;
    }
    async generateExplanation(request) {
        const started = Date.now();
        const requestedType = request.explanation_type;
        const explanationType = normalizeType(requestedType);
        const explainRequest = {
            type: explanationType,
            graph: request.graph_data,
            query: request.query,
            context: request.context,
        };
        const requestHash = this.hashRequest(explainRequest);
        const cached = this.getCachedExplanation(requestHash);
        if (cached) {
            return { ...cached, cached: true };
        }
        const explanations = requestedType === undefined || isSupportedType(requestedType)
            ? await explainGraph(explainRequest)
            : [makeErrorExplanation(`Unsupported explanation type: ${requestedType}`)];
        const performance_metrics = this.buildPerformanceMetrics(explanations, explainRequest.graph, started);
        const result = {
            explanation_id: crypto_1.default.randomUUID(),
            request_hash: requestHash,
            explanation_type: explanationType,
            confidence: this.deriveConfidence(explanations),
            model_version: request.model_version ?? 'ga-core-1.0',
            explanations,
            performance_metrics,
            created_at: new Date(),
            cached: false,
        };
        this.explanationCache.set(requestHash, result);
        logger_js_1.default.info({
            message: 'graph_explainer_generated',
            type: explanationType,
            node_count: explainRequest.graph?.nodes?.length ?? 0,
            edge_count: explainRequest.graph?.edges?.length ?? 0,
        });
        return result;
    }
    getModelCard(modelVersion) {
        return this.modelCards.get(modelVersion) ?? null;
    }
    getCacheStatistics() {
        return {
            cache_size: this.explanationCache.size,
            model_cards_loaded: this.modelCards.size,
            hit_rate_estimate: 0.5,
        };
    }
    clearCache() {
        this.explanationCache.clear();
        logger_js_1.default.info({ message: 'graph_explainer_cache_cleared' });
    }
    getCachedExplanation(requestHash) {
        const cached = this.explanationCache.get(requestHash);
        if (!cached) {
            return null;
        }
        const ageMs = Date.now() - cached.created_at.getTime();
        if (ageMs > CACHE_TTL_MS) {
            this.explanationCache.delete(requestHash);
            return null;
        }
        return cached;
    }
    hashRequest(request) {
        const normalized = {
            type: normalizeType(request.type),
            query: request.query ?? '',
            graph: normalizeGraph(request.graph),
            context_keys: Object.keys(request.context ?? {}).sort(),
        };
        return crypto_1.default
            .createHash('sha256')
            .update(JSON.stringify(normalized))
            .digest('hex');
    }
    deriveConfidence(explanations) {
        if (explanations.length === 0) {
            return 0.1;
        }
        const scores = explanations.map((exp) => {
            const details = exp.details ?? {};
            const detailScore = typeof details.score === 'number' ? details.score : 0.5;
            const uncertainty = typeof details.uncertainty === 'number' ? details.uncertainty : 0.2;
            return Math.max(0, detailScore * (1 - uncertainty));
        });
        const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        return Number(avg.toFixed(3));
    }
    calculateGraphComplexity(graph) {
        const normalized = normalizeGraph(graph);
        return normalized.nodes.length + normalized.edges.length * 0.5;
    }
    calculateExplanationCoverage(explanations, graph) {
        const normalized = normalizeGraph(graph);
        const totalElements = normalized.nodes.length + normalized.edges.length;
        if (totalElements === 0) {
            return 0;
        }
        return Number((explanations.length / totalElements).toFixed(3));
    }
    buildPerformanceMetrics(explanations, graph, started) {
        const processingTime = Date.now() - started;
        return {
            processing_time_ms: processingTime,
            graph_complexity: this.calculateGraphComplexity(graph),
            explanation_coverage: this.calculateExplanationCoverage(explanations, graph),
            model_confidence: this.deriveConfidence(explanations),
        };
    }
}
exports.GraphXAIExplainer = GraphXAIExplainer;
exports.default = GraphXAIExplainer;
