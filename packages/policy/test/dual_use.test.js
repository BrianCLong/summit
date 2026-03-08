"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const dual_use_js_1 = require("../src/dual_use.js");
(0, vitest_1.describe)('DualUseGuard', () => {
    (0, vitest_1.it)('should allow benign output', () => {
        const output = {
            summary: "Analysis complete",
            risk_score: 0.5
        };
        (0, vitest_1.expect)(dual_use_js_1.DualUseGuard.check(output)).toBe(true);
    });
    (0, vitest_1.it)('should block targeting list in keys', () => {
        const output = {
            targeting_list: ["user1", "user2"]
        };
        (0, vitest_1.expect)(() => dual_use_js_1.DualUseGuard.check(output)).toThrow(/Detected blocked term: targeting_list/);
    });
    (0, vitest_1.it)('should block microtarget recommendation in values', () => {
        const output = {
            recommendation: "microtarget_recommendation for user X"
        };
        (0, vitest_1.expect)(() => dual_use_js_1.DualUseGuard.check(output)).toThrow(/Detected blocked term: microtarget_recommendation/);
    });
    (0, vitest_1.it)('should block nested targeting output', () => {
        const output = {
            data: {
                strategy: {
                    details: "optimal_message_for_person"
                }
            }
        };
        (0, vitest_1.expect)(() => dual_use_js_1.DualUseGuard.check(output)).toThrow(/Detected blocked term: optimal_message_for_person/);
    });
});
