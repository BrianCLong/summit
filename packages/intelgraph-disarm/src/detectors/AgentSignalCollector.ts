export interface DisarmSignal {
  tacticId: string;
  confidence: number;
  evidenceId: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export class AgentSignalCollector {
  private agentId: string;

  constructor(agentId: string) {
    this.agentId = agentId;
  }

  public async collectSignals(context: unknown): Promise<DisarmSignal[]> {
    // Stub implementation for detecting agentic behaviors
    console.log(`Collecting signals for agent ${this.agentId}`);

    // In a real implementation, this would analyze behavior graphs
    return [
      {
        tacticId: "T0001",
        confidence: 0.85,
        evidenceId: `ev_${Date.now()}_${this.agentId}`,
        timestamp: new Date().toISOString(),
        metadata: {
          reason: "Batch creation detected",
          velocity: "high"
        }
      }
    ];
  }
}
