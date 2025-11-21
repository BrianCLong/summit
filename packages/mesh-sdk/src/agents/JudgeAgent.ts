/**
 * Judge Agent
 *
 * Scores outputs on multiple quality dimensions and makes final approval decisions.
 * Used as the final arbiter in multi-agent workflows.
 */

import { BaseAgent, type AgentServices } from '../Agent.js';
import type { AgentDescriptor, TaskInput, TaskOutput } from '../types.js';

interface JudgeInput {
  content: string;
  contentType: 'code' | 'text' | 'plan' | 'analysis';
  originalRequest: string;
  agentOutputs?: AgentOutput[];
  scoringDimensions?: ScoringDimension[];
  threshold?: number;
}

interface AgentOutput {
  agentName: string;
  role: string;
  output: string;
  score?: number;
}

type ScoringDimension =
  | 'factuality'
  | 'coherence'
  | 'completeness'
  | 'safety'
  | 'policy_compliance'
  | 'code_quality'
  | 'user_intent_alignment';

interface JudgeOutput {
  verdict: 'approved' | 'rejected' | 'revision_required';
  overallScore: number;
  confidence: number;
  dimensionScores: DimensionScore[];
  reasoning: string;
  improvements?: string[];
  selectedOutput?: string;
}

interface DimensionScore {
  dimension: ScoringDimension;
  score: number;
  weight: number;
  reasoning: string;
}

/**
 * JudgeAgent makes final approval decisions by scoring outputs on multiple dimensions.
 */
export class JudgeAgent extends BaseAgent {
  private readonly defaultDimensions: ScoringDimension[] = [
    'factuality',
    'coherence',
    'completeness',
    'safety',
    'user_intent_alignment',
  ];

  private readonly dimensionWeights: Record<ScoringDimension, number> = {
    factuality: 0.2,
    coherence: 0.15,
    completeness: 0.2,
    safety: 0.25,
    policy_compliance: 0.1,
    code_quality: 0.15,
    user_intent_alignment: 0.2,
  };

  getDescriptor(): Omit<AgentDescriptor, 'id' | 'status' | 'registeredAt' | 'lastHeartbeat'> {
    return {
      name: 'judge-agent',
      version: '1.0.0',
      role: 'judge',
      riskTier: 'low',
      capabilities: [
        'quality_scoring',
        'output_selection',
        'final_approval',
        'multi_agent_arbitration',
      ],
      requiredTools: [],
      modelPreference: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-5-20250929',
        temperature: 0.1,
        maxTokens: 4096,
      },
      expectedLatencyMs: 4000,
    };
  }

  async onTaskReceived(
    input: TaskInput<JudgeInput>,
    services: AgentServices
  ): Promise<TaskOutput<JudgeOutput>> {
    const { task, payload } = input;
    const startTime = Date.now();

    services.logger.info('Judge evaluation started', {
      taskId: task.id,
      contentType: payload.contentType,
      hasMultipleOutputs: (payload.agentOutputs?.length ?? 0) > 1,
    });

    try {
      const dimensions = payload.scoringDimensions ?? this.defaultDimensions;
      const threshold = payload.threshold ?? 70;

      // If multiple outputs, select the best one first
      let contentToJudge = payload.content;
      let selectedOutput: string | undefined;

      if (payload.agentOutputs && payload.agentOutputs.length > 1) {
        const selection = await this.selectBestOutput(payload, services);
        contentToJudge = selection.output;
        selectedOutput = selection.agentName;
      }

      // Score each dimension
      const dimensionScores: DimensionScore[] = [];
      for (const dimension of dimensions) {
        const score = await this.scoreDimension(
          dimension,
          contentToJudge,
          payload.originalRequest,
          payload.contentType,
          services
        );
        dimensionScores.push({
          ...score,
          weight: this.dimensionWeights[dimension],
        });
      }

      // Calculate weighted overall score
      const totalWeight = dimensionScores.reduce((sum, s) => sum + s.weight, 0);
      const overallScore =
        dimensionScores.reduce((sum, s) => sum + s.score * s.weight, 0) / totalWeight;

      // Generate overall reasoning
      const reasoning = await this.generateReasoning(
        dimensionScores,
        overallScore,
        payload.originalRequest,
        services
      );

      // Determine verdict
      let verdict: JudgeOutput['verdict'];
      let improvements: string[] | undefined;

      if (overallScore >= threshold) {
        verdict = 'approved';
      } else if (overallScore >= threshold - 20) {
        verdict = 'revision_required';
        improvements = await this.suggestImprovements(dimensionScores, services);
      } else {
        verdict = 'rejected';
        improvements = await this.suggestImprovements(dimensionScores, services);
      }

      // Calculate confidence based on score consistency
      const scoreVariance = this.calculateVariance(dimensionScores.map((s) => s.score));
      const confidence = Math.max(0.5, 1 - scoreVariance / 1000);

      return this.success(
        task.id,
        {
          verdict,
          overallScore: Math.round(overallScore),
          confidence,
          dimensionScores,
          reasoning,
          improvements,
          selectedOutput,
        },
        {
          latencyMs: Date.now() - startTime,
          modelCallCount: dimensions.length + 2,
        }
      );
    } catch (error) {
      return this.failure(task.id, {
        code: 'JUDGE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        recoverable: true,
      });
    }
  }

  private async selectBestOutput(
    payload: JudgeInput,
    services: AgentServices
  ): Promise<{ output: string; agentName: string }> {
    const outputs = payload.agentOutputs!;

    const prompt = `You are selecting the best output from multiple agents.

Original request: ${payload.originalRequest}

Outputs to compare:
${outputs.map((o, i) => `--- Output ${i + 1} (${o.agentName}) ---\n${o.output}`).join('\n\n')}

Select the best output based on:
1. Accuracy and correctness
2. Completeness
3. Clarity
4. Alignment with the original request

Respond with JSON:
{
  "selectedIndex": <0-based index>,
  "reason": "..."
}`;

    const response = await services.model.complete(prompt, { temperature: 0 });
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      const selected = outputs[result.selectedIndex] ?? outputs[0];
      return { output: selected.output, agentName: selected.agentName };
    }

    return { output: outputs[0].output, agentName: outputs[0].agentName };
  }

  private async scoreDimension(
    dimension: ScoringDimension,
    content: string,
    originalRequest: string,
    contentType: string,
    services: AgentServices
  ): Promise<Omit<DimensionScore, 'weight'>> {
    const dimensionPrompts: Record<ScoringDimension, string> = {
      factuality:
        'Evaluate factual accuracy. Are all claims verifiable and correct? No hallucinations?',
      coherence:
        'Evaluate coherence and clarity. Is the output well-structured and easy to understand?',
      completeness:
        'Evaluate completeness. Does it fully address all aspects of the request?',
      safety:
        'Evaluate safety. Is the output free of harmful content, security issues, and risks?',
      policy_compliance:
        'Evaluate policy compliance. Does it follow organizational guidelines and best practices?',
      code_quality:
        'Evaluate code quality. Is the code clean, efficient, properly typed, and well-documented?',
      user_intent_alignment:
        'Evaluate alignment with user intent. Does this output actually solve what the user asked for?',
    };

    const prompt = `${dimensionPrompts[dimension]}

Original request: ${originalRequest}

Content to evaluate (${contentType}):
${content}

Score from 0-100 and provide reasoning.

Respond with JSON:
{
  "score": <0-100>,
  "reasoning": "..."
}`;

    const response = await services.model.complete(prompt, { temperature: 0 });
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        dimension,
        score: Math.min(100, Math.max(0, result.score)),
        reasoning: result.reasoning,
      };
    }

    return { dimension, score: 50, reasoning: 'Unable to evaluate' };
  }

  private async generateReasoning(
    scores: DimensionScore[],
    overallScore: number,
    originalRequest: string,
    services: AgentServices
  ): Promise<string> {
    const scoresSummary = scores
      .map((s) => `${s.dimension}: ${s.score}/100 - ${s.reasoning}`)
      .join('\n');

    const prompt = `Summarize this evaluation in 2-3 sentences:

Original request: ${originalRequest}
Overall score: ${Math.round(overallScore)}/100

Dimension scores:
${scoresSummary}

Provide a concise summary suitable for a decision log.`;

    const response = await services.model.complete(prompt, { maxTokens: 300 });
    return response.content;
  }

  private async suggestImprovements(
    scores: DimensionScore[],
    services: AgentServices
  ): Promise<string[]> {
    const weakDimensions = scores.filter((s) => s.score < 70).sort((a, b) => a.score - b.score);

    if (weakDimensions.length === 0) {
      return [];
    }

    const prompt = `Suggest specific improvements for these weak areas:

${weakDimensions.map((s) => `${s.dimension} (${s.score}/100): ${s.reasoning}`).join('\n')}

Return 3-5 actionable improvements as JSON array of strings.`;

    const response = await services.model.complete(prompt, { maxTokens: 500 });
    const jsonMatch = response.content.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return weakDimensions.map((s) => `Improve ${s.dimension}: ${s.reasoning}`);
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }
}
