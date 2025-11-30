import { AgentConfig, AgentIdentity } from './types.js';
import { PKIService } from './pki.js';
import { ROITelemetry } from './telemetry.js';

export class SummitQAF {
  private pki: PKIService;
  private telemetry: ROITelemetry;
  private agents: Map<string, AgentIdentity>;

  constructor() {
    this.pki = PKIService.getInstance();
    this.telemetry = ROITelemetry.getInstance();
    this.agents = new Map();
  }

  /**
   * Spawns a new secure agent with mTLS identity.
   */
  public async spawnAgent(config: AgentConfig): Promise<AgentIdentity> {
    console.log(`[QAF] Spawning agent: ${config.name} (${config.role})`);

    // 1. Issue mTLS Identity
    const identity = await this.pki.issueIdentity(config);
    this.agents.set(identity.id, identity);

    // 2. Register ROI Tracking
    this.telemetry.recordTaskCompletion(0, true); // Initial registration

    // 3. Enforce Governance (Placeholder)
    if (config.role === 'GovEnforcer') {
        this.telemetry.recordComplianceCheck(true);
    }

    this.updateAgentCounts();
    return identity;
  }

  private updateAgentCounts() {
    let secureCount = 0;
    for (const agent of this.agents.values()) {
        if (agent.quantumSafe) secureCount++;
    }
    this.telemetry.updateAgentCounts(this.agents.size, secureCount);
  }

  /**
   * Simulates a quantum security scan across all agents.
   */
  public async runQuantumScan(): Promise<{ secure: boolean; vulnerableAgents: string[] }> {
    const vulnerable: string[] = [];
    for (const [id, agent] of this.agents) {
      if (!agent.quantumSafe) {
        vulnerable.push(id);
      }
    }

    const secure = vulnerable.length === 0;
    if (!secure) {
        console.warn(`[QAF] Quantum vulnerability detected in ${vulnerable.length} agents.`);
        this.telemetry.recordComplianceCheck(false);
    } else {
        this.telemetry.recordComplianceCheck(true);
    }

    return { secure, vulnerableAgents: vulnerable };
  }

  public getTelemetry() {
    return this.telemetry.getMetrics();
  }
}
