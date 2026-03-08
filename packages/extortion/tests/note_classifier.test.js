"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const note_classifier_1 = require("../src/note_classifier");
const fs_1 = require("fs");
const path_1 = require("path");
(0, vitest_1.describe)('Note Classifier', () => {
    (0, vitest_1.it)('should classify tactics from the sample ransom note', () => {
        const notePath = (0, path_1.join)(__dirname, '../fixtures/ransom_note.txt');
        const noteText = (0, fs_1.readFileSync)(notePath, 'utf8');
        const result = (0, note_classifier_1.classifyNote)(noteText);
        (0, vitest_1.expect)(result.tactics).toContain('SURVEILLANCE_CLAIM');
        (0, vitest_1.expect)(result.tactics).toContain('TIME_PRESSURE');
        (0, vitest_1.expect)(result.tactics).toContain('LEGAL_LIABILITY_FRAMING');
        (0, vitest_1.expect)(result.tactics).toContain('PUBLIC_SHAMING');
        (0, vitest_1.expect)(result.tactics).toContain('DATA_DISCLOSURE_THREAT');
        (0, vitest_1.expect)(result.tactics).toContain('DOWNTIME_EMPHASIS');
        (0, vitest_1.expect)(result.confidence).toBeGreaterThan(0.5);
    });
    (0, vitest_1.it)('should handle empty or unrelated text', () => {
        const result = (0, note_classifier_1.classifyNote)('Hello world, this is a nice day.');
        (0, vitest_1.expect)(result.tactics).toHaveLength(0);
        (0, vitest_1.expect)(result.confidence).toBe(0.1);
    });
});
