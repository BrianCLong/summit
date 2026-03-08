"use strict";
/**
 * @fileoverview Investigation Agent for multi-step reasoning workflows
 * @module @intelgraph/strands-agents/agents/investigation-agent
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInvestigationAgent = createInvestigationAgent;
const graph_tools_js_1 = require("../tools/graph-tools.js");
const entity_tools_js_1 = require("../tools/entity-tools.js");
const investigation_tools_js_1 = require("../tools/investigation-tools.js");
const analysis_tools_js_1 = require("../tools/analysis-tools.js");
const prompts_js_1 = require("./prompts.js");
// ============================================================================
// Investigation Agent Factory
// ============================================================================
/**
 * Creates an Investigation Agent configured for IntelGraph
 *
 * The Investigation Agent is designed for multi-step reasoning workflows:
 * - Explores the knowledge graph systematically
 * - Formulates and tests hypotheses
 * - Documents findings with evidence
 * - Identifies patterns and anomalies
 *
 * @example
 * ```typescript
 * import { createInvestigationAgent } from '@intelgraph/strands-agents/agents';
 * import neo4j from 'neo4j-driver';
 *
 * const driver = neo4j.driver('bolt://localhost:7687');
 *
 * const agent = createInvestigationAgent({
 *   driver,
 *   modelProvider: 'bedrock',
 *   auditLog: (action, details) => console.log(action, details),
 * });
 *
 * const result = await agent.investigate({
 *   investigationId: 'inv-123',
 *   task: 'Identify key influencers in the communication network',
 * });
 * ```
 */
function createInvestigationAgent(config) {
    const { driver, database = 'neo4j', modelProvider = 'bedrock', modelId, maxIterations = 15, temperature = 0.7, auditLog, userId = 'investigation-agent', additionalInstructions, } = config;
    // Create tool instances
    const toolConfig = { driver, database, auditLog, userId };
    const graphTools = (0, graph_tools_js_1.createGraphTools)(toolConfig);
    const entityTools = (0, entity_tools_js_1.createEntityTools)(toolConfig);
    const investigationTools = (0, investigation_tools_js_1.createInvestigationTools)(toolConfig);
    const analysisTools = (0, analysis_tools_js_1.createAnalysisTools)(toolConfig);
    // Combine all tools
    const allTools = [
        ...graphTools.all,
        ...entityTools.all,
        ...investigationTools.all,
        ...analysisTools.all,
    ];
    // Build system prompt
    const systemPrompt = additionalInstructions
        ? `${prompts_js_1.INVESTIGATION_AGENT_PROMPT}\n\n## Additional Instructions\n${additionalInstructions}`
        : prompts_js_1.INVESTIGATION_AGENT_PROMPT;
    /**
     * Get the Strands Agent configuration
     */
    function getAgentConfig() {
        return {
            systemPrompt,
            tools: allTools,
            maxIterations,
            temperature,
            modelProvider,
            modelId: modelId || getDefaultModelId(modelProvider),
        };
    }
    /**
     * Execute an investigation task
     */
    async function investigate(task) {
        const startTime = Date.now();
        let iterations = 0;
        let toolCalls = 0;
        const findings = [];
        const hypotheses = [];
        const entities = [];
        try {
            // Build the task prompt
            const taskPrompt = buildTaskPrompt(task);
            // Log task start
            if (auditLog) {
                auditLog('investigation_started', {
                    investigationId: task.investigationId,
                    task: task.task,
                });
            }
            // In a real implementation, this would use the Strands Agent class
            // For now, we provide the structure for integration
            const agentConfig = getAgentConfig();
            // Placeholder for actual agent execution
            // const agent = new Agent(agentConfig);
            // const result = await agent.invoke(taskPrompt);
            // Return structure for integration
            const executionTimeMs = Date.now() - startTime;
            return {
                success: true,
                message: `Investigation agent configured with ${allTools.length} tools. Ready for Strands SDK integration.`,
                findings,
                hypotheses,
                entities,
                metadata: {
                    iterations,
                    toolCalls,
                    executionTimeMs,
                },
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            if (auditLog) {
                auditLog('investigation_error', {
                    investigationId: task.investigationId,
                    error: errorMessage,
                });
            }
            return {
                success: false,
                message: `Investigation failed: ${errorMessage}`,
                findings,
                hypotheses,
                entities,
                metadata: {
                    iterations,
                    toolCalls,
                    executionTimeMs: Date.now() - startTime,
                },
            };
        }
    }
    /**
     * Stream investigation progress
     */
    async function* investigateStream(task) {
        const startTime = Date.now();
        const taskPrompt = buildTaskPrompt(task);
        const agentConfig = getAgentConfig();
        // Placeholder for streaming implementation
        // const agent = new Agent(agentConfig);
        // for await (const event of agent.stream(taskPrompt)) {
        //   yield event;
        // }
        yield {
            type: 'status',
            data: 'Investigation agent ready for Strands SDK streaming integration',
        };
    }
    return {
        investigate,
        investigateStream,
        getAgentConfig,
        tools: allTools,
        systemPrompt,
    };
}
// ============================================================================
// Helper Functions
// ============================================================================
function buildTaskPrompt(task) {
    let prompt = `## Investigation Task

**Investigation ID**: ${task.investigationId}

**Task**: ${task.task}`;
    if (task.context) {
        prompt += `\n\n**Additional Context**: ${task.context}`;
    }
    if (task.focusEntityIds?.length) {
        prompt += `\n\n**Focus Entities**: ${task.focusEntityIds.join(', ')}`;
    }
    prompt += `

## Instructions
1. First, retrieve the current state of the investigation
2. Identify relevant entities and relationships
3. Analyze patterns and formulate hypotheses
4. Document your findings with supporting evidence
5. Provide a summary of your conclusions`;
    return prompt;
}
function getDefaultModelId(provider) {
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
