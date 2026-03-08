"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const score_1 = require("../../../src/connectors/evidence/score");
const rules_1 = require("../../../src/connectors/evidence/rules");
(0, globals_1.describe)('Evidence Scoring Engine', () => {
    (0, globals_1.it)('should score a perfect evidence record correctly', () => {
        const perfectRecord = {
            id: '123',
            timestamp: new Date(),
            content: 'Some content with [REDACTED] info',
            url: 'http://example.com',
        };
        const result = (0, score_1.scoreEvidence)(perfectRecord);
        (0, globals_1.expect)(result.score).toBe(1);
        (0, globals_1.expect)(result.missing).toHaveLength(0);
    });
    (0, globals_1.it)('should detect missing required fields', () => {
        const incompleteRecord = {
            // id missing
            timestamp: new Date(),
            content: 'Some content',
            url: 'http://example.com',
        };
        const result = (0, score_1.scoreEvidence)(incompleteRecord);
        (0, globals_1.expect)(result.missing).toContain(rules_1.REQUIRED_FIELDS_RULE.id);
        (0, globals_1.expect)(result.score).toBeLessThan(1);
    });
    (0, globals_1.it)('should detect missing redaction markers', () => {
        const unredactedRecord = {
            id: '123',
            timestamp: new Date(),
            content: 'Some raw content without protection',
            url: 'http://example.com',
        };
        const result = (0, score_1.scoreEvidence)(unredactedRecord);
        (0, globals_1.expect)(result.missing).toContain(rules_1.REDACTION_MARKER_PRESENCE_RULE.id);
        (0, globals_1.expect)(result.score).toBeLessThan(1);
    });
    (0, globals_1.it)('should detect missing source', () => {
        const noSourceRecord = {
            id: '123',
            timestamp: new Date(),
            content: 'Some content with [REDACTED]',
            // url missing
        };
        const result = (0, score_1.scoreEvidence)(noSourceRecord);
        (0, globals_1.expect)(result.missing).toContain(rules_1.SOURCE_REFERENCE_RULE.id);
        (0, globals_1.expect)(result.score).toBeLessThan(1);
    });
});
