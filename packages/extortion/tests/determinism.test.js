"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const artifacts_1 = require("../src/artifacts");
(0, vitest_1.describe)('Determinism', () => {
    (0, vitest_1.it)('should generate the same Evidence ID for the same content', () => {
        const content = { b: 2, a: 1 };
        const content2 = { a: 1, b: 2 };
        const date = '2026-01-27';
        const id1 = (0, artifacts_1.generateEvidenceId)('EXTORTION', date, content);
        const id2 = (0, artifacts_1.generateEvidenceId)('EXTORTION', date, content2);
        (0, vitest_1.expect)(id1).toBe(id2);
        (0, vitest_1.expect)(id1).toMatch(/^EVD-EXTORTION-20260127-[a-f0-9]{8}$/);
    });
    (0, vitest_1.it)('should produce stable JSON with sorted keys', () => {
        const content = { z: 1, a: 2, m: { c: 3, b: 4 } };
        const artifact = (0, artifacts_1.createDeterministicArtifact)(content);
        const keys = Object.keys(artifact);
        (0, vitest_1.expect)(keys).toEqual(['a', 'm', 'z']);
        (0, vitest_1.expect)(Object.keys(artifact.m)).toEqual(['b', 'c']);
    });
});
