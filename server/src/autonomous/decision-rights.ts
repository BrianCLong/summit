import { Logger } from 'pino';

export interface AgentPerformance {
  agentId: string;
  successfulDeploys: number;
  incidentsCaused: number;
  lastIncident: string | null;
}

export interface DecisionRight {
  role: string;
  assignee: string; // Agent or Team
  level: 'autonomous' | 'supervised' | 'manual';
  expires: string;
}

export class DecisionRightsEngine {
  private logger: Logger | Console;
  private state: Map<string, DecisionRight> = new Map();

  constructor(logger: Logger | Console = console) {
    this.logger = logger;
  }

  public evaluateRights(agent: AgentPerformance): DecisionRight {
    // Logic: If performance is high, grant autonomy.
    // Score = successfulDeploys - (incidents * 5)

    const score = agent.successfulDeploys - (agent.incidentsCaused * 5);

    let role = 'observer';
    let level: 'autonomous' | 'supervised' | 'manual' = 'manual';

    if (score > 50) {
        role = 'release_captain';
        level = 'autonomous';
    } else if (score > 10) {
        role = 'release_assistant';
        level = 'supervised';
    }

    const right: DecisionRight = {
        role,
        assignee: agent.agentId,
        level,
        expires: new Date(Date.now() + 86400000).toISOString() // 24h lease
    };

    this.state.set(agent.agentId, right);
    return right;
  }

  public exportState(): Record<string, DecisionRight> {
      return Object.fromEntries(this.state);
  }
}
