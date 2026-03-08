"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const verifier_1 = require("../../ai/rag/verifier");
const citation_resolver_1 = require("../../ai/rag/citation_resolver");
describe('Verifier Loop', () => {
    it('should resolve citations correctly', () => {
        const isValid = (0, citation_resolver_1.resolveCitations)("Here is a claim [c1]", ["c1", "c2"]);
        expect(isValid).toBe(true);
    });
    it('should reject invalid citations', () => {
        const isValid = (0, citation_resolver_1.resolveCitations)("Here is a claim [c3]", ["c1", "c2"]);
        expect(isValid).toBe(false);
    });
    it('verifyAndRetrieve should retry on failure and eventually refuse', async () => {
        const mockRetrieval = jest.fn().mockResolvedValue(["c1"]);
        const mockGeneration = jest.fn().mockResolvedValue("Uncited claim [c2]");
        const result = await (0, verifier_1.verifyAndRetrieve)("Test query", mockRetrieval, mockGeneration, 2);
        expect(result).toBe("I'm sorry, I could not find supported evidence to answer this query.");
        expect(mockRetrieval).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });
    it('verifyAndRetrieve should succeed on valid citation', async () => {
        const mockRetrieval = jest.fn().mockResolvedValue(["c1"]);
        const mockGeneration = jest.fn().mockResolvedValue("Cited claim [c1]");
        const result = await (0, verifier_1.verifyAndRetrieve)("Test query", mockRetrieval, mockGeneration, 2);
        expect(result).toBe("Cited claim [c1]");
        expect(mockRetrieval).toHaveBeenCalledTimes(1);
    });
});
