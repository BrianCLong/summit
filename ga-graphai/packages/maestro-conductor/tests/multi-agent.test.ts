import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MultiAgentOrchestrator } from '../src/orchestrator/multi-agent';
// Mock Imports from relative paths
import { AgentLearningPipeline } from '../../../../packages/agents/src/learning/pipeline';
import { NarrativeWarfareDetector } from '../../../../packages/agents/src/detectors/narrative';

// Mock Dependencies
const mockLearningPipeline = {
  learn: vi.fn(),
} as unknown as AgentLearningPipeline;

const mockNarrativeDetector = {
  detectNarrative: vi.fn(),
} as unknown as NarrativeWarfareDetector;

describe('MultiAgentOrchestrator', () => {
  let orchestrator: MultiAgentOrchestrator;

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new MultiAgentOrchestrator(mockLearningPipeline, mockNarrativeDetector);
  });

  it('should prioritize NarrativeAgent alert over LearningAgent fix', async () => {
    const driftEvent = { id: 'drift-1' } as any;
    const graphSlice = { nodes: [] } as any;

    (mockLearningPipeline.learn as any).mockResolvedValue({
      confidence: 0.9,
      suggestedFix: 'AutoFix',
      source: 'short-term'
    });

    (mockNarrativeDetector.detectNarrative as any).mockResolvedValue([{
      type: 'narrative-injection',
      confidence: 0.95
    }]);

    const action = await orchestrator.processDrift(driftEvent, graphSlice);

    expect(action).not.toBeNull();
    expect(action?.agent).toBe('NarrativeAgent');
    expect(action?.type).toBe('alert');
  });

  it('should fallback to LearningAgent fix if no narrative threat', async () => {
    const driftEvent = { id: 'drift-1' } as any;
    const graphSlice = { nodes: [] } as any;

    (mockLearningPipeline.learn as any).mockResolvedValue({
      confidence: 0.85,
      suggestedFix: 'AutoFix',
      source: 'short-term'
    });

    (mockNarrativeDetector.detectNarrative as any).mockResolvedValue([]);

    const action = await orchestrator.processDrift(driftEvent, graphSlice);

    expect(action).not.toBeNull();
    expect(action?.agent).toBe('LearningAgent');
    expect(action?.type).toBe('fix');
  });
});
