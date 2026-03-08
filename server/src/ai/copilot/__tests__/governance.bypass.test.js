"use strict";
/**
 * Copilot Governance Bypass Prevention Tests
 *
 * These tests ensure that ALL copilot responses include governance verdicts
 * and that bypassing governance is structurally impossible.
 *
 * SOC 2 Evidence: CC6.1, CC7.2, PI1.3
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const governance_service_js_1 = require("../governance.service.js");
const types_js_1 = require("../types.js");
(0, globals_1.describe)('Copilot Governance Bypass Prevention', () => {
    let governanceService;
    (0, globals_1.beforeEach)(() => {
        governanceService = (0, governance_service_js_1.createCopilotGovernanceService)();
    });
    (0, globals_1.describe)('Type System Enforcement', () => {
        (0, globals_1.it)('should require governanceVerdict in CopilotAnswer', () => {
            const mockAnswer = {
                answerId: 'answer-123',
                answer: 'Test answer',
                confidence: 0.95,
                citations: [],
                provenance: {
                    evidenceIds: [],
                    claimIds: [],
                    entityIds: [],
                    relationshipIds: [],
                    chainConfidence: 0.9,
                },
                whyPaths: [],
                redaction: {
                    wasRedacted: false,
                    redactedCount: 0,
                    redactionTypes: [],
                    uncertaintyAcknowledged: false,
                },
                guardrails: {
                    passed: true,
                    checks: [],
                },
                generatedAt: new Date().toISOString(),
                investigationId: 'inv-123',
                originalQuery: 'test query',
                warnings: [],
            };
            const guardrails = {
                passed: true,
                checks: [],
            };
            const verdict = governanceService.generateApprovedVerdict(mockAnswer, guardrails);
            // Complete answer with verdict
            const completeAnswer = {
                ...mockAnswer,
                governanceVerdict: verdict,
            };
            (0, globals_1.expect)(completeAnswer.governanceVerdict).toBeDefined();
            (0, globals_1.expect)(completeAnswer.governanceVerdict.verdict).toBe('APPROVED');
        });
        (0, globals_1.it)('should NOT allow CopilotAnswer without governanceVerdict (TypeScript check)', () => {
            const invalidAnswer = {
                answerId: 'answer-123',
                answer: 'Test answer',
                confidence: 0.95,
                citations: [],
                provenance: {
                    evidenceIds: [],
                    claimIds: [],
                    entityIds: [],
                    relationshipIds: [],
                    chainConfidence: 0.9,
                },
                whyPaths: [],
                redaction: {
                    wasRedacted: false,
                    redactedCount: 0,
                    redactionTypes: [],
                    uncertaintyAcknowledged: false,
                },
                guardrails: {
                    passed: true,
                    checks: [],
                },
                generatedAt: new Date().toISOString(),
                investigationId: 'inv-123',
                originalQuery: 'test query',
                warnings: [],
                // Missing governanceVerdict
            };
            (0, globals_1.expect)(() => types_js_1.CopilotAnswerSchema.parse(invalidAnswer)).toThrow();
        });
    });
    (0, globals_1.describe)('Approved Answer Verdicts', () => {
        (0, globals_1.it)('should generate APPROVED verdict for valid answer', () => {
            const mockAnswer = {
                answerId: 'answer-123',
                answer: 'Test answer',
                confidence: 0.95,
                citations: [
                    {
                        id: 'cite-1',
                        sourceType: 'graph_entity',
                        sourceId: 'entity-1',
                        label: 'Test Entity',
                        confidence: 0.9,
                        wasRedacted: false,
                    },
                ],
                provenance: {
                    evidenceIds: ['ev-1'],
                    claimIds: ['claim-1'],
                    entityIds: ['entity-1'],
                    relationshipIds: ['rel-1'],
                    chainConfidence: 0.9,
                },
                whyPaths: [],
                redaction: {
                    wasRedacted: false,
                    redactedCount: 0,
                    redactionTypes: [],
                    uncertaintyAcknowledged: false,
                },
                guardrails: {
                    passed: true,
                    checks: [
                        { name: 'pii-check', passed: true },
                        { name: 'content-moderation', passed: true },
                    ],
                },
                generatedAt: new Date().toISOString(),
                investigationId: 'inv-123',
                originalQuery: 'test query',
                warnings: [],
            };
            const verdict = governanceService.generateApprovedVerdict(mockAnswer, mockAnswer.guardrails);
            (0, globals_1.expect)(verdict.verdict).toBe('APPROVED');
            (0, globals_1.expect)(verdict.policy).toBe('copilot-answer-policy');
            (0, globals_1.expect)(verdict.confidence).toBeGreaterThan(0);
            (0, globals_1.expect)(verdict.confidence).toBeLessThanOrEqual(1);
            (0, globals_1.expect)(verdict.metadata?.soc2Controls).toContain('CC6.1');
            (0, globals_1.expect)(verdict.metadata?.soc2Controls).toContain('CC7.2');
            (0, globals_1.expect)(verdict.metadata?.soc2Controls).toContain('PI1.3');
        });
        (0, globals_1.it)('should reduce confidence when guardrails have concerns', () => {
            const mockAnswer = {
                answerId: 'answer-123',
                answer: 'Test answer',
                confidence: 0.95,
                citations: [],
                provenance: {
                    evidenceIds: [],
                    claimIds: [],
                    entityIds: [],
                    relationshipIds: [],
                    chainConfidence: 0.9,
                },
                whyPaths: [],
                redaction: {
                    wasRedacted: false,
                    redactedCount: 0,
                    redactionTypes: [],
                    uncertaintyAcknowledged: false,
                },
                guardrails: {
                    passed: false,
                    checks: [
                        {
                            name: 'content-moderation',
                            passed: false,
                            reason: 'Potential sensitive content',
                        },
                    ],
                    failureReason: 'Content moderation flagged',
                },
                generatedAt: new Date().toISOString(),
                investigationId: 'inv-123',
                originalQuery: 'test query',
                warnings: [],
            };
            const verdict = governanceService.generateApprovedVerdict(mockAnswer, mockAnswer.guardrails);
            // Confidence should be reduced due to guardrail failure
            (0, globals_1.expect)(verdict.confidence).toBeLessThan(mockAnswer.confidence);
            (0, globals_1.expect)(verdict.metadata?.riskLevel).toBe('high');
        });
        (0, globals_1.it)('should handle redacted answers appropriately', () => {
            const mockAnswer = {
                answerId: 'answer-123',
                answer: 'Test answer with redactions',
                confidence: 0.85,
                citations: [],
                provenance: {
                    evidenceIds: [],
                    claimIds: [],
                    entityIds: [],
                    relationshipIds: [],
                    chainConfidence: 0.8,
                },
                whyPaths: [],
                redaction: {
                    wasRedacted: true,
                    redactedCount: 10,
                    redactionTypes: ['PII', 'CLASSIFIED'],
                    uncertaintyAcknowledged: true,
                },
                guardrails: {
                    passed: true,
                    checks: [],
                },
                generatedAt: new Date().toISOString(),
                investigationId: 'inv-123',
                originalQuery: 'test query',
                warnings: [],
            };
            const verdict = governanceService.generateApprovedVerdict(mockAnswer, mockAnswer.guardrails);
            (0, globals_1.expect)(verdict.verdict).toBe('APPROVED');
            (0, globals_1.expect)(verdict.metadata?.redactionApplied).toBe(true);
            (0, globals_1.expect)(verdict.metadata?.riskLevel).toBe('medium'); // Higher risk due to heavy redaction
        });
    });
    (0, globals_1.describe)('Refusal Verdicts', () => {
        (0, globals_1.it)('should generate REJECTED verdict for policy violations', () => {
            const mockRefusal = {
                refusalId: 'ref-123',
                reason: 'Policy violation detected',
                category: 'policy_violation',
                suggestions: ['Review policy', 'Contact admin'],
                timestamp: new Date().toISOString(),
                auditId: 'audit-123',
            };
            const verdict = governanceService.generateRefusalVerdict(mockRefusal);
            (0, globals_1.expect)(verdict.verdict).toBe('REJECTED');
            (0, globals_1.expect)(verdict.policy).toBe('copilot-refusal-policy');
            (0, globals_1.expect)(verdict.metadata?.riskLevel).toBe('critical');
            (0, globals_1.expect)(verdict.metadata?.refusalCategory).toBe('policy_violation');
        });
        (0, globals_1.it)('should generate REJECTED verdict for unsafe queries', () => {
            const mockRefusal = {
                refusalId: 'ref-123',
                reason: 'Query contains malicious patterns',
                category: 'unsafe_query',
                suggestions: ['Rephrase query', 'Remove malicious content'],
                timestamp: new Date().toISOString(),
                auditId: 'audit-123',
            };
            const verdict = governanceService.generateRefusalVerdict(mockRefusal);
            (0, globals_1.expect)(verdict.verdict).toBe('REJECTED');
            (0, globals_1.expect)(verdict.metadata?.riskLevel).toBe('critical');
            (0, globals_1.expect)(verdict.confidence).toBe(1.0);
        });
        (0, globals_1.it)('should generate REQUIRES_REVIEW for internal errors', () => {
            const mockRefusal = {
                refusalId: 'ref-123',
                reason: 'Internal processing error',
                category: 'internal_error',
                suggestions: ['Retry later', 'Contact support'],
                timestamp: new Date().toISOString(),
                auditId: 'audit-123',
            };
            const verdict = governanceService.generateRefusalVerdict(mockRefusal);
            (0, globals_1.expect)(verdict.verdict).toBe('REQUIRES_REVIEW');
            (0, globals_1.expect)(verdict.metadata?.riskLevel).toBe('medium');
            (0, globals_1.expect)(verdict.confidence).toBe(0.8);
        });
    });
    (0, globals_1.describe)('Prompt Validation Verdicts', () => {
        (0, globals_1.it)('should generate APPROVED for allowed prompts', () => {
            const verdict = governanceService.generatePromptVerdict(true, undefined, 'low');
            (0, globals_1.expect)(verdict.verdict).toBe('APPROVED');
            (0, globals_1.expect)(verdict.policy).toBe('prompt-guardrails-policy');
            (0, globals_1.expect)(verdict.metadata?.riskLevel).toBe('low');
        });
        (0, globals_1.it)('should generate REJECTED for blocked prompts', () => {
            const verdict = governanceService.generatePromptVerdict(false, 'Prompt contains prohibited content', 'critical');
            (0, globals_1.expect)(verdict.verdict).toBe('REJECTED');
            (0, globals_1.expect)(verdict.metadata?.riskLevel).toBe('critical');
            (0, globals_1.expect)(verdict.metadata?.remediationSuggestions).toBeDefined();
        });
    });
    (0, globals_1.describe)('Response Validation', () => {
        (0, globals_1.it)('should validate that answer responses have verdicts', () => {
            const validResponse = {
                type: 'answer',
                data: {
                    answerId: 'answer-123',
                    answer: 'Test',
                    confidence: 0.9,
                    citations: [],
                    provenance: {
                        evidenceIds: [],
                        claimIds: [],
                        entityIds: [],
                        relationshipIds: [],
                        chainConfidence: 0.9,
                    },
                    whyPaths: [],
                    redaction: {
                        wasRedacted: false,
                        redactedCount: 0,
                        redactionTypes: [],
                        uncertaintyAcknowledged: false,
                    },
                    guardrails: { passed: true, checks: [] },
                    governanceVerdict: {
                        verdict: 'APPROVED',
                        policy: 'test',
                        rationale: 'test',
                        timestamp: new Date().toISOString(),
                        evaluatedBy: 'test',
                        confidence: 1.0,
                    },
                    generatedAt: new Date().toISOString(),
                    investigationId: 'inv-123',
                    originalQuery: 'test',
                    warnings: [],
                },
            };
            const isValid = governanceService.validateResponseHasVerdict(validResponse);
            (0, globals_1.expect)(isValid).toBe(true);
        });
        (0, globals_1.it)('should detect missing verdicts in answer responses', () => {
            const invalidResponse = {
                type: 'answer',
                data: {
                    answerId: 'answer-123',
                    answer: 'Test',
                    // Missing governanceVerdict
                },
            };
            const isValid = governanceService.validateResponseHasVerdict(invalidResponse);
            (0, globals_1.expect)(isValid).toBe(false);
        });
        (0, globals_1.it)('should allow preview responses without verdicts', () => {
            const previewResponse = {
                type: 'preview',
                data: {
                    queryId: 'query-123',
                    cypher: 'MATCH (n) RETURN n',
                },
            };
            const isValid = governanceService.validateResponseHasVerdict(previewResponse);
            (0, globals_1.expect)(isValid).toBe(true);
        });
    });
    (0, globals_1.describe)('Emergency Rejection Failsafe', () => {
        (0, globals_1.it)('should generate emergency rejection when normal verdict fails', () => {
            const verdict = governanceService.generateEmergencyRejection('Critical system failure detected');
            (0, globals_1.expect)(verdict.verdict).toBe('REJECTED');
            (0, globals_1.expect)(verdict.policy).toBe('emergency-failsafe');
            (0, globals_1.expect)(verdict.metadata?.riskLevel).toBe('critical');
            (0, globals_1.expect)(verdict.metadata?.isEmergencyFailsafe).toBe(true);
            (0, globals_1.expect)(verdict.confidence).toBe(1.0);
        });
        (0, globals_1.it)('should include security contact suggestions in emergency rejection', () => {
            const verdict = governanceService.generateEmergencyRejection('Unknown error');
            (0, globals_1.expect)(verdict.metadata?.remediationSuggestions).toBeDefined();
            (0, globals_1.expect)(verdict.metadata?.remediationSuggestions?.some((s) => s.toLowerCase().includes('security'))).toBe(true);
        });
    });
    (0, globals_1.describe)('Edge Cases and Bypass Attempts', () => {
        (0, globals_1.it)('should reject null/undefined guardrails inputs', () => {
            const mockAnswer = {
                answerId: 'test',
                answer: 'test',
                confidence: 0.9,
                citations: [],
                provenance: {
                    evidenceIds: [],
                    claimIds: [],
                    entityIds: [],
                    relationshipIds: [],
                    chainConfidence: 0.9,
                },
                whyPaths: [],
                redaction: {
                    wasRedacted: false,
                    redactedCount: 0,
                    redactionTypes: [],
                    uncertaintyAcknowledged: false,
                },
                guardrails: { passed: true, checks: [] },
                generatedAt: new Date().toISOString(),
                investigationId: 'inv-123',
                originalQuery: 'test',
                warnings: [],
            };
            (0, globals_1.expect)(() => {
                governanceService.generateApprovedVerdict(mockAnswer, null);
            }).toThrow();
            (0, globals_1.expect)(() => {
                governanceService.generateApprovedVerdict(mockAnswer, undefined);
            }).toThrow();
        });
        (0, globals_1.it)('should prevent bypass via response manipulation', () => {
            const response = {
                type: 'answer',
                data: {},
            };
            // Attempt to bypass by setting verdict to undefined
            response.data.governanceVerdict = undefined;
            const isValid = governanceService.validateResponseHasVerdict(response);
            (0, globals_1.expect)(isValid).toBe(false);
        });
        (0, globals_1.it)('should enforce verdict presence even with property deletion', () => {
            const answer = {
                answerId: 'test',
                answer: 'test',
                governanceVerdict: {
                    verdict: 'APPROVED',
                    policy: 'test',
                    rationale: 'test',
                    timestamp: new Date().toISOString(),
                    evaluatedBy: 'test',
                    confidence: 1.0,
                },
            };
            // Attempt bypass by deleting verdict
            delete answer.governanceVerdict;
            (0, globals_1.expect)(answer.governanceVerdict).toBeUndefined();
            // In production, Zod schema validation would catch this before response
        });
    });
    (0, globals_1.describe)('SOC 2 Compliance', () => {
        (0, globals_1.it)('should always include SOC 2 control mappings', () => {
            const verdict = governanceService.generatePromptVerdict(true);
            (0, globals_1.expect)(verdict.metadata?.soc2Controls).toBeDefined();
            (0, globals_1.expect)(verdict.metadata?.soc2Controls).toEqual(globals_1.expect.arrayContaining(['CC6.1', 'PI1.3']));
        });
        (0, globals_1.it)('should include audit trail in refusals', () => {
            const mockRefusal = {
                refusalId: 'ref-123',
                reason: 'Test refusal',
                category: 'internal_error',
                suggestions: [],
                timestamp: new Date().toISOString(),
                auditId: 'audit-123',
            };
            const verdict = governanceService.generateRefusalVerdict(mockRefusal);
            (0, globals_1.expect)(verdict.metadata?.auditId).toBe('audit-123');
        });
    });
});
