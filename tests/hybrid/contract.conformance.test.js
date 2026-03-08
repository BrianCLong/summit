"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const contract_1 = require("../../src/hybrid/contract");
describe("HybridRetrievalContract adapters", () => {
    const input = { tenant: "t-1", query: "q", maxHops: 1 };
    it("blocks adapter execution when feature flag is off", async () => {
        const adapter = {
            execute: jest.fn(async () => ({
                candidates: [],
                trace: {
                    policy: { decision: "deny" },
                    stats: { candidateCount: 0, graphHops: 0 },
                },
            })),
        };
        const env = { [contract_1.HYBRID_ADAPTERS_FLAG]: "false" };
        await expect((0, contract_1.executeWithAdapter)(adapter, input, env)).rejects.toThrow("Hybrid retrieval adapters are disabled.");
        expect(adapter.execute).not.toHaveBeenCalled();
    });
    it("allows adapter execution when feature flag is on", async () => {
        const adapter = {
            execute: jest.fn(async () => ({
                candidates: [],
                trace: { policy: { decision: "allow" }, stats: { candidateCount: 0, graphHops: 0 } },
            })),
        };
        const env = { [contract_1.HYBRID_ADAPTERS_FLAG]: "true" };
        await expect((0, contract_1.executeWithAdapter)(adapter, input, env)).resolves.toEqual({
            candidates: [],
            trace: { policy: { decision: "allow" }, stats: { candidateCount: 0, graphHops: 0 } },
        });
        expect(adapter.execute).toHaveBeenCalledTimes(1);
    });
});
