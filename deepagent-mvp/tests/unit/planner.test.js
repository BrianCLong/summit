"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const planner_1 = require("../../src/agent/reasoning/planner");
const store_1 = require("../../src/agent/memory/store");
const llm_1 = require("../../src/agent/reasoning/llm");
jest.mock('../../src/agent/memory/store');
jest.mock('../../src/agent/reasoning/llm');
const mockMemoryStore = store_1.MemoryStore;
const mockLLM = llm_1.LLM;
describe('Planner', () => {
    beforeEach(() => {
        mockMemoryStore.mockClear();
        mockLLM.mockClear();
    });
    it('should return a valid action', async () => {
        mockMemoryStore.prototype.getEpisodicMemory.mockResolvedValue([]);
        mockMemoryStore.prototype.getWorkingMemory.mockResolvedValue(null);
        mockLLM.prototype.generate.mockResolvedValue(JSON.stringify({ type: 'finish', answer: 'done' }));
        const planner = new planner_1.Planner('test-tenant', 'test-run', new llm_1.LLM());
        const action = await planner.decide();
        expect(action).toHaveProperty('type');
    });
});
