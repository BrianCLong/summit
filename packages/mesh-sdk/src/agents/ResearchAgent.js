"use strict";
// @ts-nocheck
/**
 * Research Agent
 *
 * Gathers information from various sources, synthesizes findings,
 * and provides structured research outputs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResearchAgent = void 0;
const Agent_js_1 = require("../Agent.js");
/**
 * ResearchAgent conducts research tasks by gathering and synthesizing information.
 */
class ResearchAgent extends Agent_js_1.BaseAgent {
    getDescriptor() {
        return {
            name: 'research-agent',
            version: '1.0.0',
            role: 'researcher',
            riskTier: 'low',
            capabilities: ['web_research', 'document_analysis', 'code_search', 'synthesis'],
            requiredTools: ['web_search', 'document_search', 'code_search'],
            modelPreference: {
                provider: 'anthropic',
                model: 'claude-sonnet-4-5-20250929',
                temperature: 0.4,
                maxTokens: 8192,
            },
            expectedLatencyMs: 15000,
        };
    }
    async onTaskReceived(input, services) {
        const { task, payload } = input;
        const startTime = Date.now();
        services.logger.info('Research task started', { taskId: task.id, query: payload.query });
        try {
            const sources = payload.sources ?? ['internal'];
            const findings = [];
            const sourcesConsulted = [];
            // Gather information from each source
            for (const source of sources) {
                const result = await this.searchSource(source, payload.query, services);
                findings.push(...result.findings);
                sourcesConsulted.push(...result.sources);
            }
            // Synthesize findings
            const synthesis = await this.synthesize(payload.query, findings, payload.outputFormat, services);
            // Generate follow-up questions if deep research
            let followUpQuestions;
            if (payload.depth === 'deep') {
                followUpQuestions = await this.generateFollowUps(payload.query, findings, services);
            }
            const confidence = findings.length > 0
                ? findings.reduce((sum, f) => sum + f.confidence, 0) / findings.length
                : 0.5;
            return this.success(task.id, {
                findings,
                synthesis,
                confidence,
                sourcesConsulted,
                followUpQuestions,
            }, {
                latencyMs: Date.now() - startTime,
                modelCallCount: sources.length + 1,
                toolCallCount: sources.length,
            });
        }
        catch (error) {
            return this.failure(task.id, {
                code: 'RESEARCH_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error',
                recoverable: true,
            });
        }
    }
    async searchSource(source, query, services) {
        const toolName = `${source}_search`;
        try {
            const results = await services.tools.invoke(toolName, { query });
            const findings = results.map((r) => ({
                claim: r.title,
                evidence: r.snippet,
                source: r.url ?? r.path ?? source,
                confidence: r.score ?? 0.7,
            }));
            const sources = results.map((r) => ({
                type: source,
                identifier: r.url ?? r.path ?? '',
                relevance: r.score ?? 0.7,
            }));
            return { findings, sources };
        }
        catch (error) {
            services.logger.warn(`Failed to search ${source}`, { error });
            return { findings: [], sources: [] };
        }
    }
    async synthesize(query, findings, format = 'summary', services) {
        const formatInstructions = {
            summary: 'Provide a concise 2-3 paragraph summary.',
            detailed: 'Provide a comprehensive analysis with sections.',
            bullet_points: 'Provide key findings as bullet points.',
        };
        const prompt = `Synthesize research findings for this query: "${query}"

Findings:
${findings.map((f) => `- ${f.claim}: ${f.evidence} (source: ${f.source}, confidence: ${f.confidence})`).join('\n')}

${formatInstructions[format]}

Be objective and note any conflicting information.`;
        const response = await services.model.complete(prompt);
        return response.content;
    }
    async generateFollowUps(query, findings, services) {
        const prompt = `Based on research about "${query}", suggest 3-5 follow-up questions that would deepen understanding.

Current findings: ${findings.length} items covering: ${findings.map((f) => f.claim).slice(0, 5).join('; ')}

Return as JSON array of strings.`;
        const response = await services.model.complete(prompt, { maxTokens: 500 });
        const jsonMatch = response.content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return [];
    }
}
exports.ResearchAgent = ResearchAgent;
