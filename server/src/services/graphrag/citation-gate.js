"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCitationGateEnabled = void 0;
exports.normalizeCitationModel = normalizeCitationModel;
exports.validateCitationsAgainstContext = validateCitationsAgainstContext;
exports.enforceCitationGateForAnswer = enforceCitationGateForAnswer;
exports.assertPublishReadyCitations = assertPublishReadyCitations;
// @ts-nocheck
/**
 * Citation Gate - shared enforcement utilities for GraphRAG endpoints
 *
 * Requirements:
 * - When CITATION_GATE=1, substantive answers must include resolvable citations.
 * - Missing citations should return actionable diagnostics (not silent failure).
 * - Publish/export flows must hard-fail on missing or dangling citations.
 */
const crypto_1 = require("crypto");
const types_js_1 = require("./types.js");
const FALLBACK_CITATION_FAILURE = 'Unable to generate a citation-backed answer from the provided evidence. The system refused to answer without verifiable citations.';
const isCitationGateEnabled = () => process.env.CITATION_GATE === '1';
exports.isCitationGateEnabled = isCitationGateEnabled;
function normalizeCitationModel(citation) {
    // Add snippetHash if snippet is present and hash is missing
    if (citation.snippet && !citation.snippetHash) {
        return {
            ...citation,
            snippetHash: (0, crypto_1.createHash)('sha256').update(citation.snippet).digest('hex'),
        };
    }
    return citation;
}
function validateCitationsAgainstContext(params) {
    const { answerText, citations, evidenceSnippets, requireCitations } = params;
    const validEvidenceIds = new Set(evidenceSnippets.map((e) => e.evidenceId));
    const validClaimIds = new Set(evidenceSnippets
        .filter((e) => e.claimId)
        .map((e) => e.claimId));
    const normalized = citations.map(normalizeCitationModel);
    const validCitations = [];
    const danglingCitations = [];
    for (const citation of normalized) {
        const evidenceValid = validEvidenceIds.has(citation.evidenceId);
        const claimValid = !citation.claimId || validClaimIds.has(citation.claimId);
        if (evidenceValid && claimValid) {
            validCitations.push(citation);
        }
        else {
            danglingCitations.push(citation);
        }
    }
    const hasSubstantiveContent = requireCitations ||
        (answerText.trim().length > 50 &&
            !answerText.includes(FALLBACK_CITATION_FAILURE));
    const diagnostics = {};
    if (hasSubstantiveContent && validCitations.length === 0) {
        diagnostics.missingCitations = {
            message: 'CITATION_GATE requires every claim to reference at least one evidenceId/snippet provenance.',
            claimIds: [],
        };
    }
    if (danglingCitations.length > 0) {
        diagnostics.danglingCitations = {
            message: 'One or more citations could not be resolved in the evidence context.',
            evidenceIds: danglingCitations.map((c) => c.evidenceId),
        };
    }
    const blocked = (0, exports.isCitationGateEnabled)() &&
        (Boolean(diagnostics.missingCitations) ||
            Boolean(diagnostics.danglingCitations));
    return {
        validCitations,
        diagnostics: diagnostics.missingCitations || diagnostics.danglingCitations
            ? diagnostics
            : undefined,
        blocked,
    };
}
function enforceCitationGateForAnswer(params) {
    const { llmAnswer, evidenceSnippets } = params;
    const gateResult = validateCitationsAgainstContext({
        answerText: llmAnswer.answerText,
        citations: llmAnswer.citations,
        evidenceSnippets,
    });
    if (gateResult.blocked && gateResult.diagnostics?.missingCitations) {
        return {
            answer: {
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
            },
            diagnostics: gateResult.diagnostics,
        };
    }
    return {
        answer: {
            answerText: llmAnswer.answerText,
            citations: gateResult.validCitations,
            unknowns: llmAnswer.unknowns,
            usedContextSummary: {
                numNodes: 0,
                numEdges: 0,
                numEvidenceSnippets: evidenceSnippets.length,
            },
        },
        diagnostics: gateResult.diagnostics,
    };
}
function assertPublishReadyCitations(params) {
    if (!(0, exports.isCitationGateEnabled)()) {
        return;
    }
    const evidenceSnippets = params.evidenceSnippets ?? [];
    const { diagnostics, blocked } = validateCitationsAgainstContext({
        answerText: 'publish',
        citations: params.citations,
        evidenceSnippets,
        requireCitations: true,
    });
    if (blocked) {
        throw new types_js_1.CitationValidationError('BLOCK: Publication/export blocked due to missing or unresolved citations.', { diagnostics });
    }
}
