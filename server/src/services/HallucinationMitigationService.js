"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HallucinationMitigationService = void 0;
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const metrics_js_1 = require("../observability/metrics.js");
const z = __importStar(require("zod"));
const CircuitBreaker_js_1 = require("../utils/CircuitBreaker.js");
// Schemas for Hallucination Mitigation
const VerificationQuestionSchema = z.object({
    questions: z.array(z.string()).min(1).max(5),
});
const VerificationResultSchema = z.object({
    question: z.string(),
    answer: z.string(),
    citations: z.array(z.string()),
    confidence: z.number(),
});
const ConflictSchema = z.object({
    hasConflict: z.boolean(),
    type: z.enum(['temporal', 'source_disagreement', 'fact_mismatch', 'none']),
    description: z.string().optional(),
    conflictingSources: z.array(z.string()).optional(),
    recommendedResolution: z.string().optional(),
});
const RevisionSchema = z.object({
    originalAnswer: z.string(),
    revisedAnswer: z.string(),
    inconsistencies: z.array(z.string()),
    corrections: z.array(z.string()),
    confidenceScore: z.number(),
    verificationStatus: z.enum(['verified', 'unverified', 'conflicted']),
    reasoningTrace: z.string(),
    conflictAnalysis: ConflictSchema.optional(),
});
class HallucinationMitigationService {
    graphRAGService;
    intelCorroborationService;
    llmService;
    circuitBreaker;
    constructor(graphRAGService, intelCorroborationService, llmService) {
        this.graphRAGService = graphRAGService;
        this.intelCorroborationService = intelCorroborationService;
        this.llmService = llmService;
        this.circuitBreaker = new CircuitBreaker_js_1.CircuitBreaker({
            failureThreshold: 5,
            successThreshold: 3,
            resetTimeout: 30000,
            p95ThresholdMs: 8000, // Higher timeout for CoVe
            errorRateThreshold: 0.5,
        });
    }
    /**
     * Main entry point for mitigated queries
     */
    async query(request) {
        if (!request.enableCoVe) {
            const response = await this.graphRAGService.answer(request);
            return {
                ...response,
                verificationStatus: 'unverified',
            };
        }
        return this.circuitBreaker.execute(async () => {
            const startTime = Date.now();
            logger_js_1.default.info({ request }, 'Starting CoVe pipeline');
            // Step 1: Baseline Response
            const baseline = await this.graphRAGService.answer(request);
            // Step 2: Generate Verification Questions
            const questions = await this.generateVerificationQuestions(request.question, baseline.answer);
            // Step 3: Execute Verification
            const verificationResults = await this.executeVerification(questions, request);
            // Step 4: Cross-Check and Revise
            const revision = await this.crossCheckAndRevise(request.question, baseline.answer, verificationResults);
            // Step 5: Multi-Source Evidence Fusion Analysis
            // Merge citations from baseline and verification
            const allCitations = new Set([...baseline.citations.entityIds]);
            verificationResults.forEach(r => r.citations.forEach(c => allCitations.add(c)));
            // Use IntelCorroborationService for proper analysis if available, otherwise fallback to basic stats
            // Currently IntelCorroborationService is basic, so we use a mix.
            const evidenceMetrics = await this.analyzeEvidence(Array.from(allCitations));
            const executionTime = Date.now() - startTime;
            // Use default label 'false' for hasPreview since we can't add new labels dynamically to prom-client metric
            metrics_js_1.metrics.graphragQueryDurationMs.observe({ hasPreview: 'false' }, executionTime);
            return {
                answer: revision.revisedAnswer,
                confidence: revision.confidenceScore,
                citations: { entityIds: Array.from(allCitations) },
                why_paths: baseline.why_paths,
                verificationStatus: revision.conflictAnalysis?.hasConflict ? 'conflicted' : revision.verificationStatus,
                inconsistencies: revision.inconsistencies,
                corrections: revision.corrections,
                reasoningTrace: revision.reasoningTrace,
                conflictDetails: revision.conflictAnalysis,
                evidenceMetrics
            };
        });
    }
    async generateVerificationQuestions(originalQuestion, answer) {
        const prompt = `
You are a skeptical verifier.
Given the User Question: "${originalQuestion}"
And the Generated Answer: "${answer}"

Generate 3-5 specific, factual verification questions that, if answered, would verify the claims in the generated answer.
Focus on names, dates, locations, and relationships.
Return ONLY valid JSON.
Format: { "questions": ["Q1", "Q2", ...] }
    `;
        const response = await this.llmService.complete({
            prompt,
            temperature: 0.1,
            responseFormat: 'json'
        });
        try {
            const parsed = JSON.parse(response);
            return VerificationQuestionSchema.parse(parsed).questions;
        }
        catch (e) {
            logger_js_1.default.error({ error: e, response }, 'Failed to parse verification questions');
            return [];
        }
    }
    async executeVerification(questions, originalRequest) {
        const results = [];
        const promises = questions.map(async (q) => {
            try {
                const res = await this.graphRAGService.answer({
                    ...originalRequest,
                    question: q,
                    maxHops: 1
                });
                return {
                    question: q,
                    answer: res.answer,
                    citations: res.citations.entityIds,
                    confidence: res.confidence
                };
            }
            catch (e) {
                logger_js_1.default.warn({ question: q, error: e }, 'Verification query failed');
                return null;
            }
        });
        const executed = await Promise.all(promises);
        return executed.filter((r) => r !== null);
    }
    async crossCheckAndRevise(originalQuestion, originalAnswer, verificationResults) {
        const verificationContext = verificationResults.map(r => `Q: ${r.question}\nA: ${r.answer} (Confidence: ${r.confidence})`).join('\n\n');
        const prompt = `
User Question: "${originalQuestion}"
Original Answer: "${originalAnswer}"

Verification Results:
${verificationContext}

Task:
1. Compare the Original Answer with the Verification Results.
2. Identify any inconsistencies, hallucinations, or conflicts.
3. If verification results contradict each other or the original answer, identify the conflict type (temporal, source disagreement, etc.).
4. Generate a Revised Answer that is factually grounded.
5. Provide a reasoning trace.

Return valid JSON:
{
    "originalAnswer": "...",
    "revisedAnswer": "...",
    "inconsistencies": ["..."],
    "corrections": ["..."],
    "confidenceScore": 0.0-1.0,
    "verificationStatus": "verified" | "unverified" | "conflicted",
    "reasoningTrace": "...",
    "conflictAnalysis": {
        "hasConflict": boolean,
        "type": "temporal" | "source_disagreement" | "fact_mismatch" | "none",
        "description": "...",
        "conflictingSources": ["..."],
        "recommendedResolution": "..."
    }
}
        `;
        const response = await this.llmService.complete({
            prompt,
            temperature: 0,
            responseFormat: 'json'
        });
        try {
            const parsed = JSON.parse(response);
            return RevisionSchema.parse(parsed);
        }
        catch (e) {
            logger_js_1.default.error({ error: e, response }, 'Failed to parse revision');
            return {
                originalAnswer,
                revisedAnswer: originalAnswer,
                inconsistencies: [],
                corrections: [],
                confidenceScore: 0.5,
                verificationStatus: 'unverified',
                reasoningTrace: 'Failed to verify due to parsing error.',
                conflictAnalysis: { hasConflict: false, type: 'none' }
            };
        }
    }
    async analyzeEvidence(entityIds) {
        // Logic:
        // 1. Group by Source Type (OSINT, SIGINT, HUMINT, etc.)
        // 2. Count distinct sources
        // 3. Check for provenance
        // Since we don't have direct access to Entity objects here without re-fetching,
        // we assume IDs might encode source info or we rely on a future enhancement where entities are passed in.
        // However, IntelCorroborationService is available.
        // Let's iterate and use IntelCorroborationService if possible.
        // But IntelCorroborationService.evaluateClaim takes 'evidence' objects, which we don't have here.
        // Fallback: simple metrics
        const sourceTypes = new Set();
        // Simulate detection based on ID prefixes if any, else default
        entityIds.forEach(id => {
            if (id.startsWith('osint:'))
                sourceTypes.add('OSINT');
            else if (id.startsWith('sigint:'))
                sourceTypes.add('SIGINT');
            else if (id.startsWith('humint:'))
                sourceTypes.add('HUMINT');
            else
                sourceTypes.add('UNKNOWN');
        });
        return {
            confirmingSourcesCount: entityIds.length,
            sourceDiversity: Array.from(sourceTypes),
            hasProvenance: true // GraphRAG results are considered to have provenance
        };
    }
}
exports.HallucinationMitigationService = HallucinationMitigationService;
