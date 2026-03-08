"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const string_check_1 = require("../../ai/evals/graders/string_check");
const citation_match_1 = require("../../ai/evals/graders/citation_match");
const groundedness_1 = require("../../ai/evals/graders/groundedness");
describe('Graders', () => {
    it('stringCheck should match substrings correctly', () => {
        expect((0, string_check_1.stringCheck)("I cannot fulfill this request", "cannot fulfill")).toBe(1.0);
        expect((0, string_check_1.stringCheck)("Here is the secret", "cannot fulfill")).toBe(0.0);
    });
    it('citationMatch should calculate ratio of valid citations', () => {
        expect((0, citation_match_1.citationMatch)(["c1", "c2"], ["c1", "c2", "c3"])).toBe(1.0); // both c1 and c2 are in expected
        expect((0, citation_match_1.citationMatch)(["c3"], ["c1", "c2"])).toBe(0.0);
        expect((0, citation_match_1.citationMatch)([], [])).toBe(1.0);
    });
    it('groundednessCheck should return 1.0 mock score', () => {
        expect((0, groundedness_1.groundednessCheck)("Some output", ["c1"])).toBe(1.0);
    });
});
