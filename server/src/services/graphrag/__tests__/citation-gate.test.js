"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const citation_gate_js_1 = require("../citation-gate.js");
(0, globals_1.describe)('citation-gate', () => {
    const evidenceSnippets = [
        { evidenceId: 'ev-1', claimId: 'c-1' },
        { evidenceId: 'ev-2' },
    ];
    (0, globals_1.beforeEach)(() => {
        process.env.CITATION_GATE = undefined;
    });
    (0, globals_1.afterEach)(() => {
        process.env.CITATION_GATE = undefined;
    });
    (0, globals_1.it)('detects missing citations without blocking when gate disabled', () => {
        const result = (0, citation_gate_js_1.validateCitationsAgainstContext)({
            answerText: 'A substantive answer that lacks citations entirely.',
            citations: [],
            evidenceSnippets,
        });
        (0, globals_1.expect)((0, citation_gate_js_1.isCitationGateEnabled)()).toBe(false);
        (0, globals_1.expect)(result.blocked).toBe(false);
        (0, globals_1.expect)(result.diagnostics?.missingCitations?.message).toContain('CITATION_GATE requires');
    });
    (0, globals_1.it)('blocks missing citations when gate enabled', () => {
        process.env.CITATION_GATE = '1';
        const result = (0, citation_gate_js_1.validateCitationsAgainstContext)({
            answerText: 'This is an intentionally long substantive answer exceeding the threshold with no citations included anywhere in the text.',
            citations: [],
            evidenceSnippets,
        });
        (0, globals_1.expect)(result.blocked).toBe(true);
        (0, globals_1.expect)(result.diagnostics?.missingCitations).toBeDefined();
    });
    (0, globals_1.it)('flags dangling citations', () => {
        process.env.CITATION_GATE = '1';
        const result = (0, citation_gate_js_1.validateCitationsAgainstContext)({
            answerText: 'Another lengthy answer that references unknown citation identifiers.',
            citations: [{ evidenceId: 'ev-missing' }],
            evidenceSnippets,
        });
        (0, globals_1.expect)(result.diagnostics?.danglingCitations?.evidenceIds).toContain('ev-missing');
    });
    (0, globals_1.it)('returns fallback answer when blocking missing citations', () => {
        process.env.CITATION_GATE = '1';
        const { answer, diagnostics } = (0, citation_gate_js_1.enforceCitationGateForAnswer)({
            llmAnswer: {
                answerText: 'This is a substantive answer text that contains no citations and should be blocked when the gate is enabled.',
                citations: [],
                unknowns: [],
            },
            evidenceSnippets,
        });
        (0, globals_1.expect)(answer.citations.length).toBe(0);
        (0, globals_1.expect)(answer.answerText).toContain('citation-backed answer');
        (0, globals_1.expect)(diagnostics?.missingCitations).toBeDefined();
    });
});
