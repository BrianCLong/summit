"use strict";
/**
 * Scoring Engine - Pluggable framework for evaluating agent outputs
 *
 * Supports multiple scoring strategies:
 * - Rule-based (assertions, regex, exact match)
 * - LLM-judged (using judge models)
 * - Policy-based (policy compliance metrics)
 * - Hybrid (combining multiple strategies)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoringEngine = exports.HybridScorer = exports.PolicyBasedScorer = exports.LLMJudgeScorer = exports.RuleBasedScorer = void 0;
const mesh_eval_sdk_1 = require("@intelgraph/mesh-eval-sdk");
const pino_1 = require("pino");
const logger = (0, pino_1.pino)({ name: 'scoring-engine' });
// ============================================================================
// Rule-Based Scorer
// ============================================================================
/**
 * Rule-based scorer using assertions
 */
class RuleBasedScorer {
    name = 'rule_based';
    async score(context) {
        const { scenario, output } = context;
        const strategy = scenario.scoringStrategy;
        if (!strategy.rules) {
            throw new Error('Rule-based scoring requires rules configuration');
        }
        const { assertions, aggregation = 'weighted_average' } = strategy.rules;
        // Ensure output is a string for assertion checking
        const outputStr = typeof output === 'string' ? output : JSON.stringify(output);
        // Evaluate each assertion
        const results = assertions.map((assertion) => this.evaluateAssertion(assertion, outputStr));
        // Aggregate results
        let overallScore;
        let passed;
        switch (aggregation) {
            case 'all':
                // All assertions must pass
                passed = results.every((r) => r.passed);
                overallScore = passed ? 1.0 : 0.0;
                break;
            case 'any':
                // At least one assertion must pass
                passed = results.some((r) => r.passed);
                overallScore = passed ? 1.0 : 0.0;
                break;
            case 'weighted_average':
            default:
                // Weighted average of assertion scores
                const totalWeight = assertions.reduce((sum, a) => sum + (a.weight ?? 1), 0);
                const weightedSum = results.reduce((sum, r, i) => sum + r.score * (assertions[i].weight ?? 1), 0);
                overallScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
                passed = overallScore >= 0.7; // Default threshold
                break;
        }
        const failedAssertions = results
            .filter((r) => !r.passed)
            .map((r, i) => assertions[i].errorMessage || `Assertion ${i} failed`);
        const rationale = passed
            ? 'All required assertions passed'
            : `Failed assertions: ${failedAssertions.join('; ')}`;
        return {
            score: (0, mesh_eval_sdk_1.clampScore)(overallScore),
            passed,
            rationale,
            details: {
                assertions: results,
                aggregation,
            },
        };
    }
    /**
     * Evaluate a single assertion
     */
    evaluateAssertion(assertion, output) {
        let passed = false;
        switch (assertion.type) {
            case 'contains':
                passed = output.includes(String(assertion.value));
                break;
            case 'not_contains':
                passed = !output.includes(String(assertion.value));
                break;
            case 'regex_match':
                try {
                    const regex = new RegExp(String(assertion.value));
                    passed = regex.test(output);
                }
                catch (err) {
                    logger.error({ err, pattern: assertion.value }, 'Invalid regex pattern');
                    passed = false;
                }
                break;
            case 'json_valid':
                try {
                    JSON.parse(output);
                    passed = true;
                }
                catch {
                    passed = false;
                }
                break;
            case 'custom':
                // Custom assertions would need to be implemented via extension
                logger.warn('Custom assertions not yet implemented');
                passed = false;
                break;
            default:
                logger.warn({ type: assertion.type }, 'Unknown assertion type');
                passed = false;
        }
        return {
            passed,
            score: passed ? 1.0 : 0.0,
        };
    }
}
exports.RuleBasedScorer = RuleBasedScorer;
// ============================================================================
// LLM Judge Scorer
// ============================================================================
/**
 * LLM-based scorer using a judge model
 *
 * Note: This is a placeholder implementation. In production, this would
 * integrate with the actual model gateway/router.
 */
class LLMJudgeScorer {
    modelClient;
    name = 'llm_judged';
    constructor(modelClient) {
        this.modelClient = modelClient;
    }
    async score(context) {
        const { scenario, output } = context;
        const strategy = scenario.scoringStrategy;
        if (!strategy.llmJudge) {
            throw new Error('LLM-judged scoring requires llmJudge configuration');
        }
        const { model, prompt, dimensions, temperature = 0.3 } = strategy.llmJudge;
        // Build the judge prompt
        const fullPrompt = this.buildJudgePrompt(prompt, scenario, output, dimensions);
        try {
            // Call the LLM judge
            const response = await this.callJudgeModel({
                model,
                prompt: fullPrompt,
                temperature,
            });
            // Parse the response
            const judgeResult = this.parseJudgeResponse(response, dimensions);
            return {
                score: (0, mesh_eval_sdk_1.clampScore)(judgeResult.overallScore),
                passed: judgeResult.overallScore >= 0.7,
                rationale: judgeResult.rationale,
                details: {
                    dimensionScores: judgeResult.dimensionScores,
                    judgeModel: model,
                    judgeResponse: response,
                },
            };
        }
        catch (err) {
            logger.error({ err, model }, 'Failed to get LLM judge score');
            throw new Error(`LLM judge scoring failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    }
    /**
     * Build the complete prompt for the judge model
     */
    buildJudgePrompt(basePrompt, scenario, output, dimensions) {
        const outputStr = typeof output === 'string' ? output : JSON.stringify(output, null, 2);
        return `
${basePrompt}

## Scenario
**Name**: ${scenario.name}
**Description**: ${scenario.description}

## Input
${scenario.inputs.map((input) => JSON.stringify(input.content)).join('\n\n')}

## Agent Output
${outputStr}

## Instructions
Evaluate the agent output against the criteria described above.
Provide scores for each dimension (${dimensions.join(', ')}) on a 0-1 scale.

Respond in the following JSON format:
{
  "dimensionScores": {
    ${dimensions.map((d) => `"${d}": <score 0-1>`).join(',\n    ')}
  },
  "overallScore": <score 0-1>,
  "rationale": "<explanation of scores>"
}
`.trim();
    }
    /**
     * Call the judge model
     *
     * Note: This is a placeholder. In production, this would use the actual
     * model gateway/router service.
     */
    async callJudgeModel(params) {
        if (this.modelClient) {
            return await this.modelClient.generateCompletion(params);
        }
        // Placeholder: In production, this would call the actual model gateway
        logger.warn('LLM judge model client not configured, using mock response');
        return JSON.stringify({
            dimensionScores: {},
            overallScore: 0.8,
            rationale: 'Mock judge response - model client not configured',
        });
    }
    /**
     * Parse the judge model response
     */
    parseJudgeResponse(response, expectedDimensions) {
        try {
            // Try to extract JSON from the response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in judge response');
            }
            const parsed = JSON.parse(jsonMatch[0]);
            // Validate the response structure
            if (!parsed.dimensionScores || typeof parsed.overallScore !== 'number') {
                throw new Error('Invalid judge response format');
            }
            // Clamp all scores to valid range
            const dimensionScores = {};
            for (const dim of expectedDimensions) {
                const score = parsed.dimensionScores[dim];
                dimensionScores[dim] = typeof score === 'number' ? (0, mesh_eval_sdk_1.clampScore)(score) : 0.5;
            }
            return {
                dimensionScores,
                overallScore: (0, mesh_eval_sdk_1.clampScore)(parsed.overallScore),
                rationale: parsed.rationale || 'No rationale provided',
            };
        }
        catch (err) {
            logger.error({ err, response }, 'Failed to parse judge response');
            throw new Error(`Failed to parse judge response: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    }
}
exports.LLMJudgeScorer = LLMJudgeScorer;
// ============================================================================
// Policy-Based Scorer
// ============================================================================
/**
 * Policy-based scorer using policy enforcement events
 */
class PolicyBasedScorer {
    name = 'policy_based';
    async score(context) {
        const { scenario, policyEvents = [] } = context;
        const strategy = scenario.scoringStrategy;
        if (!strategy.policyScoring) {
            throw new Error('Policy-based scoring requires policyScoring configuration');
        }
        const { maxViolations, requiredCompliance } = strategy.policyScoring;
        // Count violations (denials, escalations)
        const violations = policyEvents.filter((event) => event.action === 'deny' || event.action === 'escalate');
        const violationCount = violations.length;
        // Check required compliance
        const requiredPolicies = new Set(requiredCompliance);
        const triggeredPolicies = new Set(policyEvents.filter((e) => e.action !== 'allow').map((e) => e.policyId));
        const missingCompliance = [...requiredPolicies].filter((p) => !triggeredPolicies.has(p));
        // Calculate score
        let score = 1.0;
        // Penalize for violations
        if (violationCount > maxViolations) {
            const excessViolations = violationCount - maxViolations;
            score -= excessViolations * 0.2; // -0.2 per excess violation
        }
        // Penalize for missing compliance checks
        score -= missingCompliance.length * 0.3; // -0.3 per missing required policy
        score = (0, mesh_eval_sdk_1.clampScore)(score);
        const passed = violationCount <= maxViolations && missingCompliance.length === 0;
        const rationale = passed
            ? 'Policy compliance requirements met'
            : [
                violationCount > maxViolations
                    ? `Too many policy violations (${violationCount} > ${maxViolations})`
                    : null,
                missingCompliance.length > 0
                    ? `Missing required compliance checks: ${missingCompliance.join(', ')}`
                    : null,
            ]
                .filter(Boolean)
                .join('; ');
        return {
            score,
            passed,
            rationale,
            details: {
                violationCount,
                maxViolations,
                violations: violations.map((v) => ({
                    policyId: v.policyId,
                    action: v.action,
                    reason: v.reason,
                })),
                requiredCompliance,
                missingCompliance,
            },
        };
    }
}
exports.PolicyBasedScorer = PolicyBasedScorer;
// ============================================================================
// Hybrid Scorer
// ============================================================================
/**
 * Hybrid scorer that combines multiple scoring strategies
 */
class HybridScorer {
    scorers;
    name = 'hybrid';
    constructor(scorers) {
        this.scorers = scorers;
    }
    async score(context) {
        const { scenario } = context;
        const strategy = scenario.scoringStrategy;
        const weights = strategy.weights || {};
        const results = [];
        // Run rule-based scorer if configured
        if (strategy.rules && this.scorers.ruleBasedScorer) {
            const result = await this.scorers.ruleBasedScorer.score(context);
            results.push({
                name: 'rule_based',
                result,
                weight: weights.rule_based ?? 0.33,
            });
        }
        // Run LLM judge scorer if configured
        if (strategy.llmJudge && this.scorers.llmJudgeScorer) {
            const result = await this.scorers.llmJudgeScorer.score(context);
            results.push({
                name: 'llm_judged',
                result,
                weight: weights.llm_judged ?? 0.33,
            });
        }
        // Run policy-based scorer if configured
        if (strategy.policyScoring && this.scorers.policyBasedScorer) {
            const result = await this.scorers.policyBasedScorer.score(context);
            results.push({
                name: 'policy_based',
                result,
                weight: weights.policy_based ?? 0.33,
            });
        }
        if (results.length === 0) {
            throw new Error('No scorers configured for hybrid scoring');
        }
        // Normalize weights
        const totalWeight = results.reduce((sum, r) => sum + r.weight, 0);
        const normalizedResults = results.map((r) => ({
            ...r,
            weight: r.weight / totalWeight,
        }));
        // Calculate weighted average score
        const overallScore = normalizedResults.reduce((sum, r) => sum + r.result.score * r.weight, 0);
        // Aggregate rationales
        const rationale = normalizedResults
            .map((r) => `${r.name} (${(r.weight * 100).toFixed(0)}%): ${r.result.rationale}`)
            .join(' | ');
        const passed = overallScore >= 0.7; // Default threshold
        return {
            score: (0, mesh_eval_sdk_1.clampScore)(overallScore),
            passed,
            rationale,
            details: {
                scorers: normalizedResults.map((r) => ({
                    name: r.name,
                    score: r.result.score,
                    weight: r.weight,
                    passed: r.result.passed,
                    details: r.result.details,
                })),
            },
        };
    }
}
exports.HybridScorer = HybridScorer;
// ============================================================================
// Main Scoring Engine
// ============================================================================
/**
 * Main scoring engine that orchestrates different scoring strategies
 */
class ScoringEngine {
    ruleBasedScorer;
    llmJudgeScorer;
    policyBasedScorer;
    constructor(modelClient) {
        this.ruleBasedScorer = new RuleBasedScorer();
        this.llmJudgeScorer = new LLMJudgeScorer(modelClient);
        this.policyBasedScorer = new PolicyBasedScorer();
    }
    /**
     * Score an output against a scenario
     */
    async score(context) {
        const { scenario } = context;
        const strategy = scenario.scoringStrategy;
        let scorer;
        // Select scorer based on strategy
        switch (strategy.method) {
            case 'rule_based':
                scorer = this.ruleBasedScorer;
                break;
            case 'llm_judged':
                scorer = this.llmJudgeScorer;
                break;
            case 'policy_based':
                scorer = this.policyBasedScorer;
                break;
            case 'hybrid':
                scorer = new HybridScorer({
                    ruleBasedScorer: this.ruleBasedScorer,
                    llmJudgeScorer: this.llmJudgeScorer,
                    policyBasedScorer: this.policyBasedScorer,
                });
                break;
            default:
                throw new Error(`Unknown scoring method: ${strategy.method}`);
        }
        // Execute scoring
        const result = await scorer.score(context);
        // Build EvalScore
        const evalScore = {
            overall: result.score,
            dimensions: this.extractDimensions(result),
            passFailStatus: result.passed ? 'pass' : 'fail',
            rationale: result.rationale,
            strengths: this.extractStrengths(result),
            weaknesses: this.extractWeaknesses(result),
            scoringMethod: strategy.method,
            judgeModel: strategy.llmJudge?.model,
            confidence: this.calculateConfidence(result),
        };
        return evalScore;
    }
    /**
     * Extract dimension scores from scorer result
     */
    extractDimensions(result) {
        if (result.details?.dimensionScores) {
            return result.details.dimensionScores;
        }
        // For non-dimensional scorers, use overall score
        return {
            overall: result.score,
        };
    }
    /**
     * Extract strengths from scorer result
     */
    extractStrengths(result) {
        // This could be enhanced to parse rationale and extract strengths
        if (result.passed) {
            return ['Met evaluation criteria'];
        }
        return [];
    }
    /**
     * Extract weaknesses from scorer result
     */
    extractWeaknesses(result) {
        // This could be enhanced to parse rationale and extract weaknesses
        if (!result.passed) {
            return [result.rationale];
        }
        return [];
    }
    /**
     * Calculate confidence in the score
     */
    calculateConfidence(result) {
        // Simple heuristic: higher confidence for clear pass/fail (near 0 or 1)
        const distance = Math.min(result.score, 1 - result.score);
        return (0, mesh_eval_sdk_1.clampScore)(1 - distance * 2);
    }
}
exports.ScoringEngine = ScoringEngine;
exports.default = ScoringEngine;
