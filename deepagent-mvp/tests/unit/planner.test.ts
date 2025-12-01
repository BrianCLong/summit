import { Planner } from '../../src/agent/reasoning/planner';
import { MemoryStore } from '../../src/agent/memory/store';
import { LLM } from '../../src/agent/reasoning/llm';

jest.mock('../../src/agent/memory/store');
jest.mock('../../src/agent/reasoning/llm');

const mockMemoryStore = MemoryStore as jest.MockedClass<typeof MemoryStore>;
const mockLLM = LLM as jest.MockedClass<typeof LLM>;


describe('Planner', () => {
  beforeEach(() => {
    mockMemoryStore.mockClear();
    mockLLM.mockClear();
  });
  it('should return a valid action', async () => {
    mockMemoryStore.prototype.getEpisodicMemory.mockResolvedValue([]);
    mockMemoryStore.prototype.getWorkingMemory.mockResolvedValue(null);
    mockLLM.prototype.generate.mockResolvedValue(JSON.stringify({ type: 'finish', answer: 'done' }));
    const planner = new Planner('test-tenant', 'test-run', new LLM());
    const action = await planner.decide();
    expect(action).toHaveProperty('type');
  });
});
