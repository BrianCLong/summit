/**
 * Risk Assessment Plugin for Maestro
 * Mocks an LLM analysis of IOCs
 */

import { StepPlugin, RunContext, WorkflowStep, StepExecution } from '../engine.js';

export class RiskAssessmentPlugin implements StepPlugin {
  name = 'risk-assessment';

  validate(config: any): void {
    if (!config.model) {
      console.warn('RiskAssessmentPlugin: No model specified, using default');
    }
  }

  async execute(
    context: RunContext,
    step: WorkflowStep,
    execution: StepExecution,
  ): Promise<{
    output?: any;
    cost_usd?: number;
    metadata?: Record<string, any>;
  }> {
    const iocs = context.parameters.iocs || [];

    if (!Array.isArray(iocs)) {
      throw new Error('Input "iocs" must be an array');
    }

    console.log(`[RiskAssessmentPlugin] Analyzing ${iocs.length} IOCs...`);

    const assessments = [];
    const llmEndpoint = process.env.LLM_ENDPOINT;

    for (const ioc of iocs) {
      let assessment;

      // Try Real LLM Connection
      if (llmEndpoint) {
        try {
          const response = await fetch(llmEndpoint, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ prompt: `Assess risk for: ${ioc.value}` })
          });
          if (response.ok) {
            const data = await response.json();
            assessment = {
               ioc: ioc.value,
               risk_score: data.score ?? 0.5,
               risk_summary: data.text ?? 'AI Analysis',
               model_version: 'remote-llm'
            };
          }
        } catch (e) {
          // Log but continue to fallback
          console.warn('LLM unreachable:', e);
        }
      }

      // Fallback
      if (!assessment) {
         const isHighRisk = ioc.value.includes('192');
         assessment = {
            ioc: ioc.value,
            risk_score: isHighRisk ? 0.9 : 0.2,
            risk_summary: isHighRisk
              ? 'Critical threat detected (Mock). Known C2 infrastructure.'
              : 'Low risk (Mock). Common local address.',
            model_version: 'fallback-heuristic'
         };
      }
      assessments.push(assessment);
    }

    return {
      output: assessments,
      cost_usd: 0.001,
      metadata: {
        analyzed_count: iocs.length,
        model: llmEndpoint ? 'remote-llm' : 'fallback-heuristic'
      }
    };
  }
}
