import { AgentLearningPipeline, DriftSignal, Insight } from '../../../../../packages/agents/src/learning/pipeline';
import { NarrativeWarfareDetector, GraphSlice, Signal } from '../../../../../packages/agents/src/detectors/narrative';

export interface AgentAction {
  agent: string;
  type: 'fix' | 'alert' | 'ignore';
  confidence: number;
  payload: any;
}

export class MultiAgentOrchestrator {
  private learningPipeline: AgentLearningPipeline;
  private narrativeDetector: NarrativeWarfareDetector;

  constructor(learningPipeline: AgentLearningPipeline, narrativeDetector: NarrativeWarfareDetector) {
    this.learningPipeline = learningPipeline;
    this.narrativeDetector = narrativeDetector;
  }

  async processDrift(driftEvent: DriftSignal, graphSlice: GraphSlice): Promise<AgentAction | null> {
    // 1. Parallel Processing
    const learningPromise = this.learningPipeline.learn(driftEvent);
    const narrativePromise = this.narrativeDetector.detectNarrative(graphSlice);

    const [insight, narrativeSignals] = await Promise.all([learningPromise, narrativePromise]);

    // 2. Conflict Resolution / Voting
    const votes: AgentAction[] = [];

    // Learning Agent Vote
    if (insight.confidence > 0.8) {
      votes.push({
        agent: 'LearningAgent',
        type: 'fix',
        confidence: insight.confidence,
        payload: { fix: insight.suggestedFix }
      });
    }

    // Narrative Agent Vote
    if (narrativeSignals.length > 0) {
      const maxConf = Math.max(...narrativeSignals.map(s => s.confidence));
      if (maxConf > 0.7) {
        votes.push({
          agent: 'NarrativeAgent',
          type: 'alert',
          confidence: maxConf,
          payload: { signals: narrativeSignals }
        });
      }
    }

    // Decision Logic
    // If Narrative detection is high, it overrides simple drift fix (Security > Efficiency)
    const narrativeVote = votes.find(v => v.agent === 'NarrativeAgent');
    if (narrativeVote) {
      return narrativeVote;
    }

    const learningVote = votes.find(v => v.agent === 'LearningAgent');
    if (learningVote) {
      return learningVote;
    }

    return null;
  }
}
