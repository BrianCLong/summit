"use strict";
// @ts-nocheck
/**
 * Critic Agent
 *
 * Reviews outputs from other agents for quality, correctness, and safety.
 * Acts as a quality gate in multi-agent workflows.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CriticAgent = void 0;
const Agent_js_1 = require("../Agent.js");
/**
 * CriticAgent evaluates outputs from other agents against quality and safety criteria.
 */
class CriticAgent extends Agent_js_1.BaseAgent {
    getDescriptor() {
        return {
            name: 'critic-agent',
            version: '1.0.0',
            role: 'critic',
            riskTier: 'low',
            capabilities: ['quality_assessment', 'safety_review', 'factuality_check', 'coherence_analysis'],
            requiredTools: [],
            modelPreference: {
                provider: 'anthropic',
                model: 'claude-sonnet-4-5-20250929',
                temperature: 0.1, // Low temperature for consistent evaluation
                maxTokens: 4096,
            },
            expectedLatencyMs: 3000,
        };
    }
    async onTaskReceived(input, services) {
        const { task, payload } = input;
        const startTime = Date.now();
        services.logger.info('Critic review started', { taskId: task.id, contentType: payload.contentType });
        try {
            const criteria = payload.criteria ?? {
                factuality: true,
                coherence: true,
                safety: true,
                policyCompliance: true,
            };
            const scores = [];
            const issues = [];
            // Evaluate each dimension
            if (criteria.factuality) {
                const result = await this.evaluateDimension('factuality', payload, services);
                scores.push(result.score);
                issues.push(...result.issues);
            }
            if (criteria.coherence) {
                const result = await this.evaluateDimension('coherence', payload, services);
                scores.push(result.score);
                issues.push(...result.issues);
            }
            if (criteria.safety) {
                const result = await this.evaluateDimension('safety', payload, services);
                scores.push(result.score);
                issues.push(...result.issues);
            }
            if (criteria.policyCompliance) {
                const result = await this.evaluateDimension('policy_compliance', payload, services);
                scores.push(result.score);
                issues.push(...result.issues);
            }
            // Custom dimensions
            for (const dim of criteria.customDimensions ?? []) {
                const result = await this.evaluateDimension(dim, payload, services);
                scores.push(result.score);
                issues.push(...result.issues);
            }
            // Calculate overall score and verdict
            const overallScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
            const criticalIssues = issues.filter((i) => i.severity === 'critical').length;
            const majorIssues = issues.filter((i) => i.severity === 'major').length;
            let verdict;
            if (criticalIssues > 0 || overallScore < 40) {
                verdict = 'rejected';
            }
            else if (majorIssues > 2 || overallScore < 70) {
                verdict = 'needs_revision';
            }
            else {
                verdict = 'approved';
            }
            const recommendations = await this.generateRecommendations(issues, services);
            return this.success(task.id, {
                verdict,
                overallScore,
                scores,
                issues,
                recommendations,
                confidence: 0.85,
            }, {
                latencyMs: Date.now() - startTime,
                modelCallCount: scores.length + 1,
            });
        }
        catch (error) {
            return this.failure(task.id, {
                code: 'CRITIC_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error',
                recoverable: true,
            });
        }
    }
    async evaluateDimension(dimension, payload, services) {
        const prompts = {
            factuality: `Evaluate the factual accuracy of this ${payload.contentType}. Check for:
- Verifiable claims
- Logical consistency
- Absence of hallucinations`,
            coherence: `Evaluate the coherence and clarity of this ${payload.contentType}. Check for:
- Logical flow
- Clear structure
- Consistency with the original request`,
            safety: `Evaluate the safety of this ${payload.contentType}. Check for:
- Security vulnerabilities (if code)
- Harmful content
- Privacy concerns
- Potential for misuse`,
            policy_compliance: `Evaluate policy compliance of this ${payload.contentType}. Check for:
- Adherence to coding standards
- Best practices
- Organizational guidelines`,
        };
        const prompt = `${prompts[dimension] ?? `Evaluate the ${dimension} of this content.`}

Content to evaluate:
${payload.content}

${payload.originalRequest ? `Original request: ${payload.originalRequest}` : ''}

Respond with JSON:
{
  "score": <0-100>,
  "rationale": "...",
  "issues": [
    { "severity": "critical|major|minor", "category": "${dimension}", "description": "...", "suggestedFix": "..." }
  ]
}`;
        const response = await services.model.complete(prompt, { temperature: 0.1 });
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            return {
                score: {
                    dimension,
                    score: result.score,
                    rationale: result.rationale,
                },
                issues: result.issues ?? [],
            };
        }
        return {
            score: { dimension, score: 50, rationale: 'Unable to parse evaluation' },
            issues: [],
        };
    }
    async generateRecommendations(issues, services) {
        if (issues.length === 0) {
            return ['No issues found. Output is ready for use.'];
        }
        const prompt = `Based on these issues, provide 3-5 actionable recommendations:

Issues:
${issues.map((i) => `- [${i.severity}] ${i.description}`).join('\n')}

Return as a JSON array of strings.`;
        const response = await services.model.complete(prompt, { maxTokens: 500 });
        const jsonMatch = response.content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return ['Review and address the identified issues before proceeding.'];
    }
}
exports.CriticAgent = CriticAgent;
