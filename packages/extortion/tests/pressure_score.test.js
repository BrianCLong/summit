"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const pressure_score_1 = require("../src/pressure_score");
(0, vitest_1.describe)('Pressure Score', () => {
    (0, vitest_1.it)('should calculate a deterministic score based on inputs', () => {
        const leakRecords = [
            {
                evidence_id: 'EVD-1',
                victim_name: 'Test Corp',
                source: 'Site A',
                sector: 'Healthcare',
                dataset_tags: ['pii']
            }
        ];
        const findings = [
            {
                evidence_id: 'EVD-2',
                finding_type: 'MISCONFIG',
                description: 'Internet exposed MongoDB with PII',
                severity: 'CRITICAL',
                affected_asset: 'db.example.com'
            }
        ];
        const noteAnalysis = {
            evidence_id: 'EVD-3',
            tactics: ['SURVEILLANCE_CLAIM', 'TIME_PRESSURE', 'LEGAL_LIABILITY_FRAMING'],
            confidence: 0.8,
            summary: 'High pressure note'
        };
        const score = (0, pressure_score_1.calculatePressureScore)(leakRecords, findings, noteAnalysis);
        (0, vitest_1.expect)(score.overall_score).toBeGreaterThan(50);
        (0, vitest_1.expect)(score.vectors.legal_regulatory).toBe(10); // 5 (PII) + 5 (Healthcare) + 2 (Note) capped at 10
        (0, vitest_1.expect)(score.vectors.coercion).toBe(10); // 5 + 5
        (0, vitest_1.expect)(score.explain.legal_regulatory).toContain('PII exposure: true');
    });
    (0, vitest_1.it)('should handle minimal inputs', () => {
        const score = (0, pressure_score_1.calculatePressureScore)([], [], null);
        (0, vitest_1.expect)(score.overall_score).toBe(0);
        (0, vitest_1.expect)(score.vectors.legal_regulatory).toBe(0);
    });
});
