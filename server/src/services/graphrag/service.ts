/**
 * Evidence-First GraphRAG Service
 *
 * Main service that orchestrates the GraphRAG pipeline:
 * 1. Retrieve graph context for case
 * 2. Filter evidence by policy
 * 3. Generate answer with LLM (citations enforced)
 * 4. Validate citations exist in context
 * 5. Log audit record
 */

import crypto from 'crypto';
import logger from '../../utils/logger.js';
import {
  GraphRagService as IGraphRagService,
  GraphRagRequest,
  GraphRagResponse,
  GraphRagAnswer,
  UserContext,
  CaseGraphRepository,
  EvidenceRepository,
  PolicyEngine,
  GraphRagLlmAdapter,
  GraphRagAuditLog,
  RetrievalParams,
  NoEvidenceError,
  PolicyViolationError,
  Citation,
} from './types.js';
import {
  retrieveGraphContext,
  buildLlmContextPayload,
  getContextSummary,
  getValidEvidenceIds,
  getValidClaimIds,
} from './retrieval.js';
import { applyPolicyToContext, canAccessCase } from './policy-guard.js';
import { createAuditRecord } from './audit-log.js';

// Default retrieval parameters
const DEFAULT_RETRIEVAL_PARAMS: RetrievalParams = {
  maxNodes: 50,
  maxDepth: 3,
  maxEvidenceSnippets: 20,
};

// Fallback messages
const FALLBACK_NO_EVIDENCE =
  'No evidence is available for you to view in this case based on your current permissions.';
const FALLBACK_CITATION_FAILURE =
  'Unable to generate a citation-backed answer from the provided evidence. The system refused to answer without verifiable citations.';
const FALLBACK_NO_CASE_ACCESS =
  'You do not have access to this case.';

export class EvidenceFirstGraphRagService implements IGraphRagService {
  private readonly caseGraphRepo: CaseGraphRepository;
  private readonly evidenceRepo: EvidenceRepository;
  private readonly policyEngine: PolicyEngine;
  private readonly llmAdapter: GraphRagLlmAdapter;
  private readonly auditLog: GraphRagAuditLog;
  private readonly retrievalParams: RetrievalParams;

  constructor(deps: {
    caseGraphRepo: CaseGraphRepository;
    evidenceRepo: EvidenceRepository;
    policyEngine: PolicyEngine;
    llmAdapter: GraphRagLlmAdapter;
    auditLog: GraphRagAuditLog;
    retrievalParams?: Partial<RetrievalParams>;
  }) {
    this.caseGraphRepo = deps.caseGraphRepo;
    this.evidenceRepo = deps.evidenceRepo;
    this.policyEngine = deps.policyEngine;
    this.llmAdapter = deps.llmAdapter;
    this.auditLog = deps.auditLog;
    this.retrievalParams = {
      ...DEFAULT_RETRIEVAL_PARAMS,
      ...deps.retrievalParams,
    };
  }

  async answer(
    req: GraphRagRequest,
    user: UserContext,
  ): Promise<GraphRagResponse> {
    const requestId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    logger.info({
      message: 'GraphRAG request started',
      requestId,
      caseId: req.caseId,
      userId: req.userId,
      questionLength: req.question.length,
    });

    try {
      // 1. Check case access
      if (!canAccessCase(user, req.caseId)) {
        throw new PolicyViolationError(FALLBACK_NO_CASE_ACCESS, {
          caseId: req.caseId,
          userId: user.userId,
        });
      }

      // 2. Retrieve graph context
      const retrievalResult = await retrieveGraphContext(
        req,
        this.retrievalParams,
        this.caseGraphRepo,
        this.evidenceRepo,
      );

      // 3. Apply policy filtering to evidence
      const { filteredContext, policyDecisions } = applyPolicyToContext(
        retrievalResult.context,
        user,
        this.policyEngine,
      );

      // 4. Check if any evidence is available after filtering
      if (filteredContext.evidenceSnippets.length === 0) {
        const answer = this.buildNoEvidenceAnswer(policyDecisions);
        const response = this.buildResponse(
          requestId,
          timestamp,
          answer,
          filteredContext,
        );

        // Log audit record
        await this.logAuditRecord(req, user, response, policyDecisions);

        return response;
      }

      // 5. Build LLM context payload
      const llmContext = buildLlmContextPayload(req, {
        context: filteredContext,
      });

      // 6. Generate answer with LLM
      const llmAnswer = await this.llmAdapter.generateAnswer({
        context: llmContext,
      });

      // 7. Validate and enforce citations
      const validatedAnswer = this.validateAndEnforceCitations(
        llmAnswer,
        filteredContext.evidenceSnippets,
      );

      const response = this.buildResponse(
        requestId,
        timestamp,
        validatedAnswer,
        filteredContext,
      );

      // 8. Log audit record
      await this.logAuditRecord(req, user, response, policyDecisions);

      logger.info({
        message: 'GraphRAG request completed',
        requestId,
        caseId: req.caseId,
        citationCount: validatedAnswer.citations.length,
        unknownCount: validatedAnswer.unknowns.length,
        hasAnswer: validatedAnswer.answerText.length > 0,
      });

      return response;
    } catch (error) {
      logger.error({
        message: 'GraphRAG request failed',
        requestId,
        caseId: req.caseId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return safe error response
      const errorAnswer: GraphRagAnswer = {
        answerText:
          error instanceof PolicyViolationError
            ? error.message
            : 'An error occurred while processing your request. Please try again.',
        citations: [],
        unknowns: ['System error prevented answer generation.'],
        usedContextSummary: {
          numNodes: 0,
          numEdges: 0,
          numEvidenceSnippets: 0,
        },
      };

      return {
        answer: errorAnswer,
        rawContext: { nodes: [], edges: [], evidenceSnippets: [] },
        requestId,
        timestamp,
      };
    }
  }

  /**
   * Build answer when no evidence is available
   */
  private buildNoEvidenceAnswer(policyDecisions: {
    filteredEvidenceCount: number;
    allowedEvidenceCount: number;
  }): GraphRagAnswer {
    const unknowns: string[] = [];

    if (policyDecisions.filteredEvidenceCount > 0) {
      unknowns.push(
        `${policyDecisions.filteredEvidenceCount} evidence item(s) were not visible due to policy restrictions.`,
      );
    } else {
      unknowns.push('No evidence was found for this query in the case.');
    }

    return {
      answerText: FALLBACK_NO_EVIDENCE,
      citations: [],
      unknowns,
      usedContextSummary: {
        numNodes: 0,
        numEdges: 0,
        numEvidenceSnippets: 0,
      },
    };
  }

  /**
   * Validate citations and enforce citation requirements
   */
  private validateAndEnforceCitations(
    llmAnswer: {
      answerText: string;
      citations: Citation[];
      unknowns: string[];
    },
    evidenceSnippets: { evidenceId: string; claimId?: string }[],
  ): GraphRagAnswer {
    const validEvidenceIds = new Set(evidenceSnippets.map((e) => e.evidenceId));
    const validClaimIds = new Set(
      evidenceSnippets
        .filter((e) => e.claimId)
        .map((e) => e.claimId as string),
    );

    // Filter to only valid citations
    const validCitations = llmAnswer.citations.filter((citation) => {
      const evidenceValid = validEvidenceIds.has(citation.evidenceId);
      const claimValid = !citation.claimId || validClaimIds.has(citation.claimId);
      return evidenceValid && claimValid;
    });

    // Check if answer has substantive content but no valid citations
    const hasSubstantiveContent =
      llmAnswer.answerText.length > 50 &&
      !llmAnswer.answerText.includes(FALLBACK_NO_EVIDENCE) &&
      !llmAnswer.answerText.includes(FALLBACK_CITATION_FAILURE);

    if (hasSubstantiveContent && validCitations.length === 0) {
      // Enforce citation requirement - reject answer
      logger.warn({
        message: 'Answer rejected due to missing citations',
        originalCitations: llmAnswer.citations.length,
        answerLength: llmAnswer.answerText.length,
      });

      return {
        answerText: FALLBACK_CITATION_FAILURE,
        citations: [],
        unknowns: [
          'The system could not provide citations for the generated answer.',
          ...llmAnswer.unknowns,
        ],
        usedContextSummary: {
          numNodes: 0,
          numEdges: 0,
          numEvidenceSnippets: evidenceSnippets.length,
        },
      };
    }

    return {
      answerText: llmAnswer.answerText,
      citations: validCitations,
      unknowns: llmAnswer.unknowns,
      usedContextSummary: {
        numNodes: 0, // Filled in by buildResponse
        numEdges: 0,
        numEvidenceSnippets: evidenceSnippets.length,
      },
    };
  }

  /**
   * Build final response
   */
  private buildResponse(
    requestId: string,
    timestamp: string,
    answer: GraphRagAnswer,
    context: { nodes: any[]; edges: any[]; evidenceSnippets: any[] },
  ): GraphRagResponse {
    return {
      answer: {
        ...answer,
        usedContextSummary: getContextSummary(context),
      },
      rawContext: context,
      requestId,
      timestamp,
    };
  }

  /**
   * Log audit record
   */
  private async logAuditRecord(
    req: GraphRagRequest,
    user: UserContext,
    response: GraphRagResponse,
    policyDecisions?: {
      filteredEvidenceCount: number;
      allowedEvidenceCount: number;
    },
  ): Promise<void> {
    try {
      const record = createAuditRecord({
        userId: user.userId,
        caseId: req.caseId,
        question: req.question,
        contextSummary: response.answer.usedContextSummary,
        answerSummary: {
          hasAnswer: response.answer.answerText.length > 0,
          numCitations: response.answer.citations.length,
          numUnknowns: response.answer.unknowns.length,
        },
        policyDecisions,
      });

      await this.auditLog.append(record);
    } catch (error) {
      // Don't fail the request if audit logging fails
      logger.error({
        message: 'Failed to log audit record',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/**
 * Factory function to create configured GraphRAG service
 */
export function createGraphRagService(deps: {
  caseGraphRepo: CaseGraphRepository;
  evidenceRepo: EvidenceRepository;
  policyEngine: PolicyEngine;
  llmAdapter: GraphRagLlmAdapter;
  auditLog: GraphRagAuditLog;
  retrievalParams?: Partial<RetrievalParams>;
}): IGraphRagService {
  return new EvidenceFirstGraphRagService(deps);
}
