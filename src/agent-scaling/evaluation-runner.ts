import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { TopologyConfig, generateTopology } from './topology-generator';
import { AGENT_SCALING_CONFIG } from './config';
import { AgentScalingMetrics, coordinationEfficiency } from './metrics';

export interface EvaluationResult {
  topology: TopologyConfig;
  metrics: AgentScalingMetrics;
}

export class EvaluationRunner {
  private runId: string;
  private artifactsDir: string;

  constructor() {
    this.runId = crypto.randomUUID();
    this.artifactsDir = path.join(process.cwd(), `artifacts/xai/${this.runId}`);
    // Deterministic artifact path per memory instruction: artifacts/xai/<run_id>/
  }

  // Simulates running a task with a given topology
  private simulateTaskExecution(topology: TopologyConfig): AgentScalingMetrics {
    const isMulti = topology.roles.includes('critic');

    // Simulated metrics based on topology
    const latencyMs = isMulti ? 3000 : 1500;
    const memoryMb = isMulti ? 256 : 128;
    const tokens = isMulti ? 5000 : 2000;
    const successRate = isMulti ? 0.95 : 0.85; // Multi-agent slightly better but more costly
    const coordinationOverhead = isMulti ? 1500 : 0; // ms overhead

    // Enforce budgets
    if (latencyMs > AGENT_SCALING_CONFIG.budgets.latencyMs) throw new Error('Latency budget exceeded');
    if (memoryMb > AGENT_SCALING_CONFIG.budgets.memoryMb) throw new Error('Memory budget exceeded');
    if (tokens > AGENT_SCALING_CONFIG.budgets.tokens) throw new Error('Token budget exceeded');

    return {
      successRate,
      latencyMs,
      tokenCost: tokens,
      coordinationOverhead
    };
  }

  public async runEvaluation(): Promise<{ singleAgent: EvaluationResult, multiAgent: EvaluationResult }> {
    const singleAgentTopology = generateTopology('single-agent');
    const multiAgentTopology = generateTopology('multi-agent');

    const singleAgentMetrics = this.simulateTaskExecution(singleAgentTopology);
    const multiAgentMetrics = this.simulateTaskExecution(multiAgentTopology);

    const result = {
      singleAgent: { topology: singleAgentTopology, metrics: singleAgentMetrics },
      multiAgent: { topology: multiAgentTopology, metrics: multiAgentMetrics }
    };

    this.generateArtifacts(result);

    return result;
  }

  private generateArtifacts(results: any) {
     if (!fs.existsSync(this.artifactsDir)) {
         fs.mkdirSync(this.artifactsDir, { recursive: true });
     }

     // report.json
     fs.writeFileSync(path.join(this.artifactsDir, 'report.json'), JSON.stringify(results, null, 2));

     // metrics.json
     const metricsPayload = {
         singleAgent: results.singleAgent.metrics,
         multiAgent: results.multiAgent.metrics,
         coordinationEfficiency: coordinationEfficiency(results.singleAgent.metrics.successRate, results.multiAgent.metrics.successRate)
     };
     fs.writeFileSync(path.join(this.artifactsDir, 'metrics.json'), JSON.stringify(metricsPayload, null, 2));

     // stamp.json (deterministic hash)
     const contentHash = crypto.createHash('sha256').update(JSON.stringify(results)).digest('hex');
     const stampPayload = {
         runId: this.runId,
         hash: contentHash
     };
     fs.writeFileSync(path.join(this.artifactsDir, 'stamp.json'), JSON.stringify(stampPayload, null, 2));

     // Also output to reports/agent-scaling/ per the ITEM specs
     const reportsDir = path.join(process.cwd(), 'reports/agent-scaling');
     if (!fs.existsSync(reportsDir)) {
         fs.mkdirSync(reportsDir, { recursive: true });
     }
     fs.writeFileSync(path.join(reportsDir, 'report.json'), JSON.stringify(results, null, 2));
     fs.writeFileSync(path.join(reportsDir, 'metrics.json'), JSON.stringify(metricsPayload, null, 2));
     fs.writeFileSync(path.join(reportsDir, 'stamp.json'), JSON.stringify(stampPayload, null, 2));
  }
}
