/**
 * @fileoverview Analyst Agent for graph analysis and insight generation
 * @module @intelgraph/strands-agents/agents/analyst-agent
 */

import type { Driver } from 'neo4j-driver';
import { createGraphTools } from '../tools/graph-tools.js';
import { createEntityTools } from '../tools/entity-tools.js';
import { createAnalysisTools } from '../tools/analysis-tools.js';
import { createInvestigationTools } from '../tools/investigation-tools.js';
import { ANALYST_AGENT_PROMPT } from './prompts.js';

// ============================================================================
// Types
// ============================================================================

export interface AnalystAgentConfig {
  /** Neo4j driver instance */
  driver: Driver;
  /** Database name */
  database?: string;
  /** Model provider to use */
  modelProvider?: 'bedrock' | 'anthropic' | 'openai';
  /** Model ID override */
  modelId?: string;
  /** Maximum iterations for agent loop */
  maxIterations?: number;
  /** Temperature for LLM responses */
  temperature?: number;
  /** Audit logging function */
  auditLog?: (action: string, details: Record<string, unknown>) => void;
}

export interface AnalysisTask {
  /** Natural language question or analysis request */
  question: string;
  /** Investigation scope (optional) */
  investigationId?: string;
  /** Specific entity IDs to focus on */
  focusEntityIds?: string[];
  /** Analysis depth */
  depth?: 'quick' | 'standard' | 'deep';
  /** Output format */
  outputFormat?: 'summary' | 'detailed' | 'structured';
}

export interface AnalysisResult {
  /** Whether analysis completed successfully */
  success: boolean;
  /** Analysis response */
  answer: string;
  /** Key findings from the analysis */
  keyFindings: Array<{
    finding: string;
    confidence: number;
    supportingEvidence: string[];
  }>;
  /** Entities identified as important */
  keyEntities: Array<{
    id: string;
    type: string;
    label: string;
    importance: number;
    reason: string;
  }>;
  /** Patterns detected */
  patterns: Array<{
    type: string;
    description: string;
    entities: string[];
  }>;
  /** Suggested follow-up questions */
  followUpQuestions: string[];
  /** Execution metadata */
  metadata: {
    questionsAnswered: number;
    toolCalls: number;
    executionTimeMs: number;
  };
}

// ============================================================================
// Analyst Agent Factory
// ============================================================================

/**
 * Creates an Analyst Agent configured for IntelGraph
 *
 * The Analyst Agent specializes in:
 * - Answering analytical questions about the graph
 * - Detecting patterns and anomalies
 * - Identifying key entities and relationships
 * - Generating structured insights
 *
 * @example
 * ```typescript
 * import { createAnalystAgent } from '@intelgraph/strands-agents/agents';
 * import neo4j from 'neo4j-driver';
 *
 * const driver = neo4j.driver('bolt://localhost:7687');
 *
 * const agent = createAnalystAgent({ driver });
 *
 * const result = await agent.analyze({
 *   question: 'Who are the most influential entities in this network?',
 *   investigationId: 'inv-123',
 *   depth: 'standard',
 * });
 * ```
 */
export function createAnalystAgent(config: AnalystAgentConfig) {
  const {
    driver,
    database = 'neo4j',
    modelProvider = 'bedrock',
    modelId,
    maxIterations = 12,
    temperature = 0.5,
    auditLog,
  } = config;

  // Create tool instances
  const toolConfig = { driver, database, auditLog };
  const graphTools = createGraphTools(toolConfig);
  const entityTools = createEntityTools(toolConfig);
  const analysisTools = createAnalysisTools(toolConfig);
  const investigationTools = createInvestigationTools(toolConfig);

  // Tools for analysis
  const allTools = [
    graphTools.executeCypher,
    graphTools.findPath,
    graphTools.getNeighbors,
    graphTools.getSubgraph,
    graphTools.getGraphStats,
    entityTools.searchEntities,
    entityTools.getEntity,
    analysisTools.detectPatterns,
    analysisTools.analyzeCentrality,
    analysisTools.detectAnomalies,
    analysisTools.compareEntities,
    investigationTools.getInvestigation,
    investigationTools.getTimeline,
  ];

  /**
   * Analyze the graph to answer a question
   */
  async function analyze(task: AnalysisTask): Promise<AnalysisResult> {
    const startTime = Date.now();
    const keyFindings: AnalysisResult['keyFindings'] = [];
    const keyEntities: AnalysisResult['keyEntities'] = [];
    const patterns: AnalysisResult['patterns'] = [];
    const followUpQuestions: string[] = [];
    let toolCalls = 0;

    try {
      // Build the analysis prompt
      const prompt = buildAnalysisPrompt(task);

      if (auditLog) {
        auditLog('analysis_started', {
          question: task.question,
          investigationId: task.investigationId,
          depth: task.depth,
        });
      }

      // Get agent configuration
      const agentConfig = getAgentConfig();

      // Placeholder for actual agent execution
      // In a real implementation:
      // const agent = new Agent(agentConfig);
      // const result = await agent.invoke(prompt);

      // For now, demonstrate the structure
      const executionTimeMs = Date.now() - startTime;

      return {
        success: true,
        answer: `Analyst agent configured with ${allTools.length} tools. Ready for Strands SDK integration.`,
        keyFindings,
        keyEntities,
        patterns,
        followUpQuestions: [
          'What are the communication patterns between key entities?',
          'Are there any anomalous connections worth investigating?',
          'What temporal patterns exist in the data?',
        ],
        metadata: {
          questionsAnswered: 1,
          toolCalls,
          executionTimeMs,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (auditLog) {
        auditLog('analysis_error', {
          question: task.question,
          error: errorMessage,
        });
      }

      return {
        success: false,
        answer: `Analysis failed: ${errorMessage}`,
        keyFindings,
        keyEntities,
        patterns,
        followUpQuestions,
        metadata: {
          questionsAnswered: 0,
          toolCalls,
          executionTimeMs: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Quick analysis for simple questions
   */
  async function quickAnalyze(question: string, investigationId?: string): Promise<string> {
    const result = await analyze({
      question,
      investigationId,
      depth: 'quick',
      outputFormat: 'summary',
    });

    return result.answer;
  }

  /**
   * Stream analysis progress
   */
  async function* analyzeStream(task: AnalysisTask) {
    const prompt = buildAnalysisPrompt(task);
    const agentConfig = getAgentConfig();

    // Placeholder for streaming implementation
    yield {
      type: 'status',
      data: 'Analyst agent ready for Strands SDK streaming integration',
    };
  }

  /**
   * Get key influencers in the graph
   */
  async function findInfluencers(investigationId?: string, limit = 10) {
    const result = await analysisTools.analyzeCentrality.callback({
      scope: investigationId ? 'investigation' : 'global',
      scopeId: investigationId,
      algorithm: 'pagerank',
      limit,
    });

    return JSON.parse(result);
  }

  /**
   * Detect anomalies in the graph
   */
  async function findAnomalies(investigationId?: string) {
    const result = await analysisTools.detectAnomalies.callback({
      investigationId,
      anomalyTypes: ['degree_outlier', 'structural_hole', 'sudden_appearance'],
      sensitivityThreshold: 0.8,
    });

    return JSON.parse(result);
  }

  /**
   * Find patterns in the graph
   */
  async function findPatterns(investigationId?: string) {
    const result = await analysisTools.detectPatterns.callback({
      investigationId,
      patternTypes: ['star', 'chain', 'bridge'],
      minSize: 3,
      limit: 10,
    });

    return JSON.parse(result);
  }

  /**
   * Get the Strands Agent configuration
   */
  function getAgentConfig() {
    return {
      systemPrompt: ANALYST_AGENT_PROMPT,
      tools: allTools,
      maxIterations,
      temperature,
      modelProvider,
      modelId: modelId || getDefaultModelId(modelProvider),
    };
  }

  return {
    analyze,
    quickAnalyze,
    analyzeStream,
    findInfluencers,
    findAnomalies,
    findPatterns,
    getAgentConfig,
    tools: allTools,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildAnalysisPrompt(task: AnalysisTask): string {
  let prompt = `## Analysis Request

**Question**: ${task.question}`;

  if (task.investigationId) {
    prompt += `\n\n**Investigation Scope**: ${task.investigationId}`;
  }

  if (task.focusEntityIds?.length) {
    prompt += `\n\n**Focus Entities**: ${task.focusEntityIds.join(', ')}`;
  }

  const depthInstructions = {
    quick: 'Provide a brief, focused answer using minimal tool calls.',
    standard: 'Provide a thorough analysis with supporting evidence.',
    deep: 'Conduct comprehensive analysis, exploring multiple angles and validating findings.',
  };

  prompt += `\n\n**Analysis Depth**: ${task.depth || 'standard'}
${depthInstructions[task.depth || 'standard']}`;

  const formatInstructions = {
    summary: 'Provide a concise summary paragraph.',
    detailed: 'Structure your response with sections for findings, evidence, and recommendations.',
    structured: 'Return findings as a structured list with confidence scores.',
  };

  prompt += `\n\n**Output Format**: ${task.outputFormat || 'detailed'}
${formatInstructions[task.outputFormat || 'detailed']}`;

  return prompt;
}

function getDefaultModelId(provider: string): string {
  switch (provider) {
    case 'bedrock':
      return 'anthropic.claude-3-5-sonnet-20241022-v2:0';
    case 'anthropic':
      return 'claude-sonnet-4-5-20250929';
    case 'openai':
      return 'gpt-4o';
    default:
      return 'anthropic.claude-3-5-sonnet-20241022-v2:0';
  }
}

export type AnalystAgent = ReturnType<typeof createAnalystAgent>;
