
import { GraphRAGService, GraphRAGRequest, GraphRAGResponse } from './GraphRAGService.js';
import { IntelCorroborationService } from './IntelCorroborationService.js';
import logger from '../utils/logger.js';
import { metrics } from '../observability/metrics.js';
import * as z from 'zod';
import { CircuitBreaker } from '../utils/CircuitBreaker.js';

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

export type HallucinationMitigationRequest = GraphRAGRequest & {
  enableCoVe?: boolean;
};

export type EvidenceMetrics = {
  confirmingSourcesCount: number;
  sourceDiversity: string[];
  hasProvenance: boolean;
};

export type HallucinationMitigationResponse = GraphRAGResponse & {
  verificationStatus: 'verified' | 'unverified' | 'conflicted';
  inconsistencies?: string[];
  corrections?: string[];
  reasoningTrace?: string;
  conflictDetails?: z.infer<typeof ConflictSchema>;
  evidenceMetrics?: EvidenceMetrics;
};

interface LLMService {
    complete(params: {
      prompt: string;
      model?: string;
      maxTokens?: number;
      temperature?: number;
      responseFormat?: 'json';
    }): Promise<string>;
  }

export class HallucinationMitigationService {
  private graphRAGService: GraphRAGService;
  private intelCorroborationService: IntelCorroborationService;
  private llmService: LLMService;
  private circuitBreaker: CircuitBreaker;

  constructor(
    graphRAGService: GraphRAGService,
    intelCorroborationService: IntelCorroborationService,
    llmService: LLMService
  ) {
    this.graphRAGService = graphRAGService;
    this.intelCorroborationService = intelCorroborationService;
    this.llmService = llmService;
    this.circuitBreaker = new CircuitBreaker({
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
  async query(request: HallucinationMitigationRequest): Promise<HallucinationMitigationResponse> {
    if (!request.enableCoVe) {
      const response = await this.graphRAGService.answer(request);
      return {
        ...response,
        verificationStatus: 'unverified',
      };
    }

    return this.circuitBreaker.execute(async () => {
        const startTime = Date.now();
        logger.info({ request }, 'Starting CoVe pipeline');

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
        metrics.graphragQueryDurationMs.observe({ hasPreview: 'false' }, executionTime);

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

  private async generateVerificationQuestions(originalQuestion: string, answer: string): Promise<string[]> {
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
    } catch (e) {
        logger.error({ error: e, response }, 'Failed to parse verification questions');
        return [];
    }
  }

  private async executeVerification(questions: string[], originalRequest: HallucinationMitigationRequest): Promise<z.infer<typeof VerificationResultSchema>[]> {
      const results: z.infer<typeof VerificationResultSchema>[] = [];

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
          } catch (e) {
              logger.warn({ question: q, error: e }, 'Verification query failed');
              return null;
          }
      });

      const executed = await Promise.all(promises);
      return executed.filter((r): r is z.infer<typeof VerificationResultSchema> => r !== null);
  }

  private async crossCheckAndRevise(
      originalQuestion: string,
      originalAnswer: string,
      verificationResults: z.infer<typeof VerificationResultSchema>[]
    ): Promise<z.infer<typeof RevisionSchema>> {
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
        } catch (e) {
            logger.error({ error: e, response }, 'Failed to parse revision');
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

  private async analyzeEvidence(entityIds: string[]): Promise<EvidenceMetrics> {
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
      const sourceTypes = new Set<string>();
      // Simulate detection based on ID prefixes if any, else default
      entityIds.forEach(id => {
          if (id.startsWith('osint:')) sourceTypes.add('OSINT');
          else if (id.startsWith('sigint:')) sourceTypes.add('SIGINT');
          else if (id.startsWith('humint:')) sourceTypes.add('HUMINT');
          else sourceTypes.add('UNKNOWN');
      });

      return {
          confirmingSourcesCount: entityIds.length,
          sourceDiversity: Array.from(sourceTypes),
          hasProvenance: true // GraphRAG results are considered to have provenance
      };
  }
}
