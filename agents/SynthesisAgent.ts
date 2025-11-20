/**
 * Synthesis Agent
 * Specialized agent for report generation, summarization, and data synthesis
 */

import { Logger } from 'pino';
import {
  BaseAgent,
  AgentConfig,
  Task,
  AgentMessage,
  AgentCapability,
  LLMAgentCapability,
  LLMProviderFactory,
} from '@intelgraph/agent-framework';

export class SynthesisAgent extends BaseAgent {
  private llm?: LLMAgentCapability;

  constructor(config: AgentConfig, logger: Logger) {
    super(config, logger);

    if (config.llmConfig) {
      const provider = LLMProviderFactory.create(config.llmConfig, logger);
      this.llm = new LLMAgentCapability(
        provider,
        config.llmConfig.systemPrompt ||
          'You are an expert intelligence analyst specializing in synthesizing complex information into clear, actionable reports.',
      );
    }
  }

  protected async onInitialize(): Promise<void> {
    this.logger.info('Initializing synthesis agent');
  }

  protected async onStart(): Promise<void> {
    this.logger.info('Synthesis agent started');
  }

  protected async onPause(): Promise<void> {
    this.logger.info('Synthesis agent paused');
  }

  protected async onResume(): Promise<void> {
    this.logger.info('Synthesis agent resumed');
  }

  protected async onStop(): Promise<void> {
    this.logger.info('Synthesis agent stopped');
  }

  protected async onTerminate(): Promise<void> {
    this.logger.info('Synthesis agent terminated');
  }

  protected async onExecuteTask(task: Task): Promise<any> {
    this.logger.info({ taskType: task.type }, 'Executing synthesis task');

    switch (task.type) {
      case 'report:generate':
        return this.generateReport(task);

      case 'summarize':
        return this.summarize(task);

      case 'synthesize':
        return this.synthesizeData(task);

      default:
        throw new Error(`Unsupported task type: ${task.type}`);
    }
  }

  protected onCanHandleTask(task: Task): boolean {
    const supportedCapabilities = [
      AgentCapability.REPORT_GENERATION,
      AgentCapability.SUMMARIZATION,
    ];

    return (
      this.config.capabilities.some((cap) => supportedCapabilities.includes(cap)) &&
      ['report:generate', 'summarize', 'synthesize'].includes(task.type)
    );
  }

  protected async onSendMessage(message: AgentMessage): Promise<void> {
    this.logger.debug({ message }, 'Sending message');
  }

  protected async onReceiveMessage(message: AgentMessage): Promise<void> {
    this.logger.debug({ message }, 'Processing received message');
  }

  protected async onHealthCheck(): Promise<boolean> {
    return true;
  }

  // ===== Synthesis Methods =====

  private async generateReport(task: Task): Promise<any> {
    const { title, data, format, sections, classification } = task.input;

    this.logger.info({ title, format }, 'Generating report');

    if (!this.llm) {
      throw new Error('LLM is required for report generation');
    }

    const prompt = `Generate a comprehensive intelligence report with the following:

Title: ${title}
Format: ${format || 'markdown'}
Classification: ${classification || 'UNCLASSIFIED'}

Include these sections:
${sections?.join('\n- ') || 'Executive Summary, Key Findings, Analysis, Recommendations'}

Source Data:
${JSON.stringify(data, null, 2)}

Please structure the report professionally with clear headings, bullet points where appropriate, and actionable insights.`;

    const response = await this.llm.ask(prompt);

    const report = {
      title,
      classification: classification || 'UNCLASSIFIED',
      generatedAt: new Date().toISOString(),
      generatedBy: this.id,
      format: format || 'markdown',
      content: response.content,
      metadata: {
        dataSourceCount: Array.isArray(data) ? data.length : 1,
        sections: sections || ['Executive Summary', 'Key Findings', 'Analysis', 'Recommendations'],
        aiModel: this.config.llmConfig?.model,
        tokensUsed: response.usage.totalTokens,
      },
    };

    this.updateApiMetrics(1, this.calculateCost(response.usage));

    return report;
  }

  private async summarize(task: Task): Promise<any> {
    const { content, length, style } = task.input;

    this.logger.info({ length, style }, 'Summarizing content');

    if (!this.llm) {
      throw new Error('LLM is required for summarization');
    }

    const lengthInstruction = length
      ? `The summary should be approximately ${length} words.`
      : 'Provide a concise summary.';

    const styleInstruction = style
      ? `Use a ${style} style.`
      : 'Use a professional, analytical style.';

    const prompt = `Summarize the following content. ${lengthInstruction} ${styleInstruction}

Content:
${content}

Focus on key insights, main findings, and actionable information.`;

    const response = await this.llm.ask(prompt);

    const summary = {
      original: content,
      summary: response.content,
      length: length || 'auto',
      style: style || 'professional',
      generatedAt: new Date().toISOString(),
      metadata: {
        originalLength: content.length,
        summaryLength: response.content.length,
        compressionRatio: (response.content.length / content.length).toFixed(2),
        tokensUsed: response.usage.totalTokens,
      },
    };

    this.updateApiMetrics(1, this.calculateCost(response.usage));

    return summary;
  }

  private async synthesizeData(task: Task): Promise<any> {
    const { sources, objective, format } = task.input;

    this.logger.info({ sourceCount: sources?.length, objective }, 'Synthesizing data');

    if (!this.llm) {
      throw new Error('LLM is required for data synthesis');
    }

    const prompt = `Synthesize information from multiple sources to ${objective || 'provide comprehensive insights'}.

Sources:
${sources.map((source: any, i: number) => `
Source ${i + 1}: ${source.name || source.type}
${JSON.stringify(source.data, null, 2)}
`).join('\n')}

Provide:
1. Cross-source correlations and patterns
2. Contradictions or inconsistencies
3. Confidence levels for key findings
4. Gaps in the data
5. Synthesized conclusions`;

    const response = await this.llm.ask(prompt);

    const synthesis = {
      objective: objective || 'Comprehensive insights',
      sourceCount: sources.length,
      synthesis: response.content,
      format: format || 'structured',
      generatedAt: new Date().toISOString(),
      metadata: {
        sources: sources.map((s: any) => s.name || s.type),
        tokensUsed: response.usage.totalTokens,
        confidence: 'medium', // Could be extracted from LLM response
      },
    };

    this.updateApiMetrics(1, this.calculateCost(response.usage));

    return synthesis;
  }

  private calculateCost(usage: { promptTokens: number; completionTokens: number }): number {
    const promptCostPer1M = 3.0;
    const completionCostPer1M = 15.0;

    const promptCost = (usage.promptTokens / 1_000_000) * promptCostPer1M;
    const completionCost = (usage.completionTokens / 1_000_000) * completionCostPer1M;

    return promptCost + completionCost;
  }
}
