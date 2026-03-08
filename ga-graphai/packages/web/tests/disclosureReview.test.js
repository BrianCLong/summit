"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const disclosure_review_js_1 = require("../src/disclosure-review.js");
(0, vitest_1.describe)('disclosure review', () => {
    (0, vitest_1.it)('summarizes artifacts and redactions', () => {
        const review = (0, disclosure_review_js_1.buildDisclosureReview)({
            documents: [{ id: 'doc-1', path: 'doc.txt' }],
            disclosure: {
                audience: { policyId: 'aud:public' },
                license: { id: 'CC-BY-4.0' },
                redactions: [{ field: 'email' }, { field: 'phone' }],
            },
        }, 2_000_000);
        (0, vitest_1.expect)(review.artifacts).toHaveLength(1);
        (0, vitest_1.expect)(review.redactionCount).toBe(2);
        (0, vitest_1.expect)(review.licenseId).toBe('CC-BY-4.0');
        (0, vitest_1.expect)(review.estimatedSizeMb).toBeGreaterThan(0);
        const diff = (0, disclosure_review_js_1.diffArtifacts)([], review.artifacts);
        (0, vitest_1.expect)(diff.added).toHaveLength(1);
    });
});
