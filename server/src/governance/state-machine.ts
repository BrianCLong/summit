
import fs from 'fs';
import path from 'path';

export type GovernanceState = 'draft' | 'reviewed' | 'approved' | 'blocked' | 'retired';

export interface GovernanceArtifact {
  id: string;
  type: string;
  state: GovernanceState;
  owner: string;
  history: {
    state: GovernanceState;
    timestamp: string;
    actor: string;
  }[];
}

export class GovernanceStateMachine {
  private validTransitions: Record<GovernanceState, GovernanceState[]>;

  constructor() {
    // Load transitions from config if available, otherwise default
    try {
        const configPath = path.join(process.cwd(), '../governance/state-transitions.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            this.validTransitions = config.transitions;
        } else {
             // Fallback default
            this.validTransitions = {
                'draft': ['reviewed', 'retired'],
                'reviewed': ['approved', 'draft', 'blocked'],
                'approved': ['retired', 'blocked'],
                'blocked': ['draft', 'retired'],
                'retired': []
            };
        }
    } catch (e) {
        this.validTransitions = {
            'draft': ['reviewed', 'retired'],
            'reviewed': ['approved', 'draft', 'blocked'],
            'approved': ['retired', 'blocked'],
            'blocked': ['draft', 'retired'],
            'retired': []
        };
    }
  }

  canTransition(from: GovernanceState, to: GovernanceState): boolean {
    return this.validTransitions[from]?.includes(to) || false;
  }

  transition(artifact: GovernanceArtifact, to: GovernanceState, actor: string): GovernanceArtifact {
    if (!this.canTransition(artifact.state, to)) {
      throw new Error(`Invalid transition from ${artifact.state} to ${to}`);
    }

    artifact.state = to;
    artifact.history.push({
      state: to,
      timestamp: new Date().toISOString(),
      actor
    });

    return artifact;
  }
}
