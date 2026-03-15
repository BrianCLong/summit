import { EpisodicMemory } from '../memory/schemas';

export interface StrategyCandidate {
  id: string;
  label: string;
  confidence: number;
  rationale: string;
  nextAction: 'search_tools' | 'call_tool' | 'fold_memory' | 'finish';
}

export interface StrategyAssessment {
  recommended: StrategyCandidate;
  candidates: StrategyCandidate[];
  generatedAt: string;
}

function clampConfidence(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return Number(value.toFixed(2));
}

export class StrategyEngine {
  public assess(task: string, goalHints: string[], events: EpisodicMemory[]): StrategyAssessment {
    const serializedEvents = events.map((event) => JSON.stringify(event.event_json).toLowerCase());
    const eventText = serializedEvents.join(' ');
    const toolsObserved = serializedEvents.filter((entry) => entry.includes('tool-call')).length;
    const errorsObserved = serializedEvents.filter((entry) => entry.includes('error')).length;
    const hasAnswer = serializedEvents.some((entry) => entry.includes('final-answer'));

    const taskText = `${task} ${goalHints.join(' ')}`.toLowerCase();

    const candidates: StrategyCandidate[] = [
      {
        id: 'precision-tool-hunt',
        label: 'Precision Tool Hunt',
        confidence: clampConfidence(0.55 + (taskText.length > 40 ? 0.1 : 0) - errorsObserved * 0.05),
        rationale:
          'Prioritize discovering high-fit tools before execution to maximize task-tool alignment.',
        nextAction: 'search_tools',
      },
      {
        id: 'evidence-consolidation',
        label: 'Evidence Consolidation',
        confidence: clampConfidence(0.4 + toolsObserved * 0.2 - errorsObserved * 0.05),
        rationale: 'Consolidate observed outputs into compact memory to reduce context drift.',
        nextAction: 'fold_memory',
      },
      {
        id: 'mission-closeout',
        label: 'Mission Closeout',
        confidence: clampConfidence((hasAnswer ? 0.9 : 0.25) + toolsObserved * 0.05),
        rationale: 'Close the loop when sufficient evidence exists for a traceable final answer.',
        nextAction: 'finish',
      },
    ];

    const recommended = [...candidates].sort((a, b) => b.confidence - a.confidence)[0];

    if (eventText.includes('tool-retrieval') && recommended.nextAction === 'search_tools') {
      recommended.nextAction = 'call_tool';
      recommended.rationale =
        'Tool retrieval already occurred; advance to controlled execution for faster completion.';
    }

    return {
      recommended,
      candidates,
      generatedAt: new Date().toISOString(),
    };
  }
}
