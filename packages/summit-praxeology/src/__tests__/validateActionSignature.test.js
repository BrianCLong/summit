"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const validateActionSignature_1 = require("../validate/validateActionSignature");
(0, vitest_1.describe)('validateActionSignature', () => {
    (0, vitest_1.it)('accepts a valid action signature', () => {
        const validSignature = {
            id: "pg.action.sig.coordinated-posting.v1",
            label: "Coordinated posting signature",
            indicators: [
                { id: "ind1", signal: "coordinated posting pattern", weight: 0.7, evidenceKinds: ["post", "report"] }
            ],
            provenance: { source: "seed", createdAt: "2026-03-05T00:00:00Z", curator: "summit.seed" }
        };
        const report = (0, validateActionSignature_1.validateActionSignature)(validSignature);
        (0, vitest_1.expect)(report.ok).toBe(true);
        (0, vitest_1.expect)(report.schemaErrors).toEqual([]);
    });
    (0, vitest_1.it)('rejects an invalid action signature', () => {
        const invalidSignature = {
            id: "pg", // too short
            label: "Co", // too short
            indicators: [], // missing items
            provenance: { source: "seed", createdAt: "invalid-date", curator: "a" }
        };
        const report = (0, validateActionSignature_1.validateActionSignature)(invalidSignature);
        (0, vitest_1.expect)(report.ok).toBe(false);
        (0, vitest_1.expect)(report.schemaErrors.length).toBeGreaterThan(0);
    });
});
