"use strict";
/**
 * Policy Simulator
 *
 * What-if analysis for policy changes. Simulates impact of proposed
 * policy modifications before deployment.
 *
 * SOC 2 Controls: CC5.2 (Policy Management), CC8.1 (Change Control)
 *
 * @module analytics/policy/PolicySimulator
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicySimulator = void 0;
exports.getPolicySimulator = getPolicySimulator;
const uuid_1 = require("uuid");
const data_envelope_js_1 = require("../../types/data-envelope.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const emitter_js_1 = require("../../metering/emitter.js");
// ============================================================================
// Helper Functions
// ============================================================================
function createVerdict(result, reason) {
    return {
        verdictId: `verdict-${(0, uuid_1.v4)()}`,
        policyId: 'policy-simulator-policy',
        result,
        decidedAt: new Date(),
        reason,
        evaluator: 'PolicySimulator',
    };
}
function calculateRiskScore(factors) {
    const severityScores = { critical: 40, high: 30, medium: 20, low: 10 };
    const likelihoodMultipliers = { high: 1.0, medium: 0.6, low: 0.3 };
    let totalScore = 0;
    for (const factor of factors) {
        totalScore += severityScores[factor.severity] * likelihoodMultipliers[factor.likelihood];
    }
    return Math.min(100, totalScore);
}
function determineOverallRisk(score) {
    if (score >= 80)
        return 'critical';
    if (score >= 60)
        return 'high';
    if (score >= 30)
        return 'medium';
    return 'low';
}
// ============================================================================
// Default Options
// ============================================================================
const DEFAULT_OPTIONS = {
    analyzeHistorical: true,
    historicalSampleSize: 1000,
    analyzeAccessPatterns: true,
    assessCompliance: true,
};
// ============================================================================
// Policy Evaluator (Simplified)
// ============================================================================
class PolicyEvaluator {
    rules = [];
    setRules(rules) {
        this.rules = rules.sort((a, b) => a.priority - b.priority);
    }
    evaluate(subject, action, resource, context) {
        for (const rule of this.rules) {
            if (this.matchesRule(rule, subject, action, resource, context)) {
                return { result: rule.action, matchedRule: rule };
            }
        }
        // Default deny if no rule matches
        return { result: 'deny' };
    }
    matchesRule(rule, subject, action, resource, context) {
        // Check subject match
        if (!this.matchesSubject(rule.subjects, subject)) {
            return false;
        }
        // Check resource match
        if (!this.matchesResource(rule.resource, resource)) {
            return false;
        }
        // Check condition if present
        if (rule.condition && !this.evaluateCondition(rule.condition, { subject, action, resource, ...context })) {
            return false;
        }
        return true;
    }
    matchesSubject(ruleSubjects, subject) {
        if (ruleSubjects.includes('*'))
            return true;
        return ruleSubjects.some(s => {
            if (s.endsWith('*')) {
                return subject.startsWith(s.slice(0, -1));
            }
            return s === subject;
        });
    }
    matchesResource(ruleResource, resource) {
        if (ruleResource === '*')
            return true;
        if (ruleResource.endsWith('*')) {
            return resource.startsWith(ruleResource.slice(0, -1));
        }
        return ruleResource === resource;
    }
    evaluateCondition(condition, context) {
        // Simplified condition evaluation
        // In production, use a proper expression evaluator
        try {
            // Simple key=value checks
            const checks = condition.split('&&').map(c => c.trim());
            for (const check of checks) {
                const [key, value] = check.split('=').map(s => s.trim());
                if (context[key] !== value && context[key] !== JSON.parse(value)) {
                    return false;
                }
            }
            return true;
        }
        catch {
            return true; // Default to true if condition can't be parsed
        }
    }
}
// ============================================================================
// Policy Simulator
// ============================================================================
class PolicySimulator {
    evaluator;
    historicalData = new Map();
    constructor() {
        this.evaluator = new PolicyEvaluator();
        logger_js_1.default.info('PolicySimulator initialized');
    }
    /**
     * Run a simulation of policy changes
     */
    async simulate(request) {
        const simulationId = (0, uuid_1.v4)();
        const options = { ...DEFAULT_OPTIONS, ...request.options };
        logger_js_1.default.info({
            simulationId,
            tenantId: request.tenantId,
            changeCount: request.changes.length,
            testCaseCount: request.testCases?.length || 0,
        }, 'Starting policy simulation');
        try {
            // Build before and after rule sets
            const { beforeRules, afterRules } = this.buildRuleSets(request.changes);
            // Run test cases
            const testResults = this.runTestCases(beforeRules, afterRules, request.testCases || []);
            // Analyze historical impact
            let historicalImpact;
            if (options.analyzeHistorical) {
                historicalImpact = this.analyzeHistoricalImpact(request.tenantId, beforeRules, afterRules, options.historicalSampleSize);
            }
            // Analyze access patterns
            let accessPatternChanges;
            if (options.analyzeAccessPatterns) {
                accessPatternChanges = this.analyzeAccessPatterns(request.tenantId, beforeRules, afterRules);
            }
            // Assess compliance impact
            let complianceImpact;
            if (options.assessCompliance) {
                complianceImpact = this.assessComplianceImpact(request.changes);
            }
            // Perform risk assessment
            const riskAssessment = this.performRiskAssessment(request.changes, testResults, historicalImpact, accessPatternChanges);
            // Generate recommendations
            const recommendations = this.generateRecommendations(request.changes, testResults, riskAssessment);
            // Build summary
            const summary = this.buildSummary(request.changes, testResults, historicalImpact, riskAssessment);
            const result = {
                id: simulationId,
                tenantId: request.tenantId,
                changes: request.changes,
                timestamp: new Date().toISOString(),
                status: 'completed',
                summary,
                testResults,
                historicalImpact,
                accessPatternChanges,
                complianceImpact,
                riskAssessment,
                recommendations,
                governanceVerdict: createVerdict(riskAssessment.overallRisk === 'critical' ? data_envelope_js_1.GovernanceResult.DENY :
                    riskAssessment.overallRisk === 'high' ? data_envelope_js_1.GovernanceResult.FLAG :
                        data_envelope_js_1.GovernanceResult.ALLOW, `Simulation complete: ${riskAssessment.overallRisk} risk`),
            };
            logger_js_1.default.info({
                simulationId,
                tenantId: request.tenantId,
                overallRisk: riskAssessment.overallRisk,
                testsPassed: summary.testCasesPassed,
                testsFailed: summary.testCasesFailed,
            }, 'Policy simulation completed');
            // Metering: Record policy simulation
            try {
                await emitter_js_1.meteringEmitter.emitPolicySimulation({
                    tenantId: request.tenantId,
                    rulesCount: request.changes.length,
                    source: 'PolicySimulator',
                    correlationId: simulationId,
                    metadata: {
                        overallRisk: riskAssessment.overallRisk,
                    },
                });
            }
            catch (err) {
                logger_js_1.default.warn({ err }, 'Failed to emit policy simulation meter event');
            }
            return (0, data_envelope_js_1.createDataEnvelope)(result, {
                source: 'PolicySimulator',
                governanceVerdict: result.governanceVerdict,
                classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
            });
        }
        catch (error) {
            logger_js_1.default.error({ error, simulationId, tenantId: request.tenantId }, 'Policy simulation failed');
            const failedResult = {
                id: simulationId,
                tenantId: request.tenantId,
                changes: request.changes,
                timestamp: new Date().toISOString(),
                status: 'failed',
                summary: {
                    totalChanges: request.changes.length,
                    rulesAdded: 0,
                    rulesModified: 0,
                    rulesRemoved: 0,
                    testCasesPassed: 0,
                    testCasesFailed: 0,
                    estimatedAffectedRequests: 0,
                    overallRiskScore: 100,
                },
                testResults: [],
                riskAssessment: {
                    overallRisk: 'critical',
                    riskFactors: [{
                            category: 'Simulation Error',
                            description: `Simulation failed: ${error}`,
                            severity: 'critical',
                            likelihood: 'high',
                        }],
                    mitigations: ['Review and fix simulation configuration'],
                },
                recommendations: ['Unable to complete simulation - review changes manually'],
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, 'Simulation failed'),
            };
            return (0, data_envelope_js_1.createDataEnvelope)(failedResult, {
                source: 'PolicySimulator',
                governanceVerdict: failedResult.governanceVerdict,
                classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
            });
        }
    }
    /**
     * Add historical data for analysis
     */
    addHistoricalData(tenantId, data) {
        const existing = this.historicalData.get(tenantId) || [];
        this.historicalData.set(tenantId, [...existing, ...data].slice(-10000));
    }
    /**
     * Compare two policy versions
     */
    async comparePolicies(tenantId, beforeRules, afterRules, testCases) {
        const changes = this.detectChanges(beforeRules, afterRules);
        return this.simulate({
            tenantId,
            changes,
            testCases,
        });
    }
    // --------------------------------------------------------------------------
    // Private Methods
    // --------------------------------------------------------------------------
    buildRuleSets(changes) {
        const beforeRules = [];
        const afterRules = [];
        for (const change of changes) {
            if (change.before) {
                beforeRules.push(change.before);
            }
            if (change.after) {
                afterRules.push(change.after);
            }
        }
        return { beforeRules, afterRules };
    }
    runTestCases(beforeRules, afterRules, testCases) {
        const results = [];
        for (const testCase of testCases) {
            // Evaluate with before rules
            this.evaluator.setRules(beforeRules);
            const beforeEval = this.evaluator.evaluate(testCase.request.subject, testCase.request.action, testCase.request.resource, testCase.request.context);
            // Evaluate with after rules
            this.evaluator.setRules(afterRules);
            const afterEval = this.evaluator.evaluate(testCase.request.subject, testCase.request.action, testCase.request.resource, testCase.request.context);
            const changed = beforeEval.result !== afterEval.result;
            const matchedExpected = testCase.expectedResult
                ? afterEval.result === testCase.expectedResult
                : true;
            results.push({
                testCaseId: testCase.id,
                testCaseName: testCase.name,
                beforeResult: beforeEval.result,
                afterResult: afterEval.result,
                changed,
                matchedExpected,
                explanation: changed
                    ? `Decision changed from ${beforeEval.result} to ${afterEval.result}`
                    : `Decision unchanged: ${afterEval.result}`,
            });
        }
        return results;
    }
    analyzeHistoricalImpact(tenantId, beforeRules, afterRules, sampleSize) {
        const historical = this.historicalData.get(tenantId) || [];
        const sample = historical.slice(-sampleSize);
        if (sample.length === 0) {
            return {
                sampleSize: 0,
                periodDays: 0,
                requestsAffected: 0,
                percentageAffected: 0,
                breakdown: {
                    wouldBeAllowed: 0,
                    wouldBeDenied: 0,
                    wouldBeFlagged: 0,
                    wouldRequireReview: 0,
                },
            };
        }
        let affected = 0;
        const breakdown = {
            wouldBeAllowed: 0,
            wouldBeDenied: 0,
            wouldBeFlagged: 0,
            wouldRequireReview: 0,
        };
        for (const request of sample) {
            // Evaluate with before rules
            this.evaluator.setRules(beforeRules);
            const beforeResult = this.evaluator.evaluate(request.subject, request.action, request.resource);
            // Evaluate with after rules
            this.evaluator.setRules(afterRules);
            const afterResult = this.evaluator.evaluate(request.subject, request.action, request.resource);
            if (beforeResult.result !== afterResult.result) {
                affected++;
                switch (afterResult.result) {
                    case 'allow':
                        breakdown.wouldBeAllowed++;
                        break;
                    case 'deny':
                        breakdown.wouldBeDenied++;
                        break;
                    case 'flag':
                        breakdown.wouldBeFlagged++;
                        break;
                    case 'review':
                        breakdown.wouldRequireReview++;
                        break;
                }
            }
        }
        const periodDays = sample.length > 0
            ? Math.ceil((Date.now() - sample[0].timestamp.getTime()) / (1000 * 60 * 60 * 24))
            : 0;
        return {
            sampleSize: sample.length,
            periodDays,
            requestsAffected: affected,
            percentageAffected: (affected / sample.length) * 100,
            breakdown,
        };
    }
    analyzeAccessPatterns(tenantId, beforeRules, afterRules) {
        const changes = [];
        const historical = this.historicalData.get(tenantId) || [];
        // Group by subject and resource
        const accessPatterns = new Map();
        for (const request of historical) {
            const key = `${request.subject}:${request.resource}`;
            const existing = accessPatterns.get(key) || { count: 0, lastAccess: new Date(0) };
            existing.count++;
            if (request.timestamp > existing.lastAccess) {
                existing.lastAccess = request.timestamp;
            }
            accessPatterns.set(key, existing);
        }
        // Check each pattern for changes
        for (const [key, pattern] of accessPatterns) {
            const [subject, resource] = key.split(':');
            this.evaluator.setRules(beforeRules);
            const beforeResult = this.evaluator.evaluate(subject, 'access', resource);
            this.evaluator.setRules(afterRules);
            const afterResult = this.evaluator.evaluate(subject, 'access', resource);
            if (beforeResult.result !== afterResult.result) {
                const frequency = pattern.count > 100 ? 'high' :
                    pattern.count > 10 ? 'medium' : 'low';
                const riskLevel = (beforeResult.result === 'allow' && afterResult.result === 'deny')
                    ? 'high'
                    : frequency === 'high' ? 'medium' : 'low';
                changes.push({
                    subject,
                    resource,
                    previousAccess: beforeResult.result,
                    newAccess: afterResult.result,
                    frequency,
                    riskLevel,
                });
            }
        }
        return changes.slice(0, 100); // Limit to top 100 changes
    }
    assessComplianceImpact(changes) {
        // Simplified compliance impact assessment
        // In production, this would integrate with the compliance engine
        const controlsImpacted = [];
        for (const change of changes) {
            // Check for security-related changes
            if (change.after?.action === 'deny' && change.before?.action === 'allow') {
                controlsImpacted.push({
                    controlId: 'CC6.1',
                    controlName: 'Logical Access Security',
                    impact: 'positive',
                    description: 'Access restriction strengthens logical access controls',
                });
            }
            if (change.type === 'remove' && change.before?.action === 'deny') {
                controlsImpacted.push({
                    controlId: 'CC6.1',
                    controlName: 'Logical Access Security',
                    impact: 'negative',
                    description: 'Removing deny rules may weaken access controls',
                });
            }
            // Check for audit-related resources
            if (change.after?.resource.includes('audit') || change.before?.resource.includes('audit')) {
                controlsImpacted.push({
                    controlId: 'CC7.2',
                    controlName: 'System Monitoring',
                    impact: change.after?.action === 'deny' ? 'positive' : 'negative',
                    description: 'Changes to audit-related resources affect monitoring controls',
                });
            }
        }
        // Calculate overall score (simplified)
        const positiveImpacts = controlsImpacted.filter(c => c.impact === 'positive').length;
        const negativeImpacts = controlsImpacted.filter(c => c.impact === 'negative').length;
        const previousScore = 85; // Baseline
        const scoreChange = (positiveImpacts * 2) - (negativeImpacts * 5);
        return {
            frameworksAffected: ['SOC2', 'ISO27001'],
            controlsImpacted,
            overallComplianceScore: Math.max(0, Math.min(100, previousScore + scoreChange)),
            previousScore,
        };
    }
    performRiskAssessment(changes, testResults, historicalImpact, accessPatternChanges) {
        const riskFactors = [];
        // Check for failed test cases
        const failedTests = testResults.filter(t => !t.matchedExpected);
        if (failedTests.length > 0) {
            riskFactors.push({
                category: 'Test Failures',
                description: `${failedTests.length} test case(s) did not match expected results`,
                severity: failedTests.length > 3 ? 'high' : 'medium',
                likelihood: 'high',
            });
        }
        // Check for high historical impact
        if (historicalImpact && historicalImpact.percentageAffected > 10) {
            riskFactors.push({
                category: 'Historical Impact',
                description: `${historicalImpact.percentageAffected.toFixed(1)}% of historical requests would be affected`,
                severity: historicalImpact.percentageAffected > 25 ? 'high' : 'medium',
                likelihood: 'high',
            });
        }
        // Check for removed deny rules
        const removedDenyRules = changes.filter(c => c.type === 'remove' && c.before?.action === 'deny');
        if (removedDenyRules.length > 0) {
            riskFactors.push({
                category: 'Security Relaxation',
                description: `${removedDenyRules.length} deny rule(s) being removed`,
                severity: 'high',
                likelihood: 'high',
            });
        }
        // Check for wildcard additions
        const wildcardRules = changes.filter(c => c.after?.subjects.includes('*') || c.after?.resource === '*');
        if (wildcardRules.length > 0) {
            riskFactors.push({
                category: 'Broad Access',
                description: `${wildcardRules.length} rule(s) with wildcard access`,
                severity: 'medium',
                likelihood: 'medium',
            });
        }
        // Check for high-frequency access pattern changes
        const highFreqChanges = accessPatternChanges?.filter(c => c.frequency === 'high') || [];
        if (highFreqChanges.length > 0) {
            riskFactors.push({
                category: 'High-Frequency Impact',
                description: `${highFreqChanges.length} high-frequency access patterns affected`,
                severity: 'medium',
                likelihood: 'high',
            });
        }
        const riskScore = calculateRiskScore(riskFactors);
        const overallRisk = determineOverallRisk(riskScore);
        // Generate mitigations
        const mitigations = [];
        if (failedTests.length > 0) {
            mitigations.push('Review and update test cases to reflect intended behavior');
        }
        if (removedDenyRules.length > 0) {
            mitigations.push('Document justification for removing deny rules');
            mitigations.push('Consider implementing compensating controls');
        }
        if (wildcardRules.length > 0) {
            mitigations.push('Consider more specific access patterns instead of wildcards');
        }
        if (historicalImpact && historicalImpact.breakdown.wouldBeDenied > 0) {
            mitigations.push('Communicate access changes to affected users');
        }
        return {
            overallRisk,
            riskFactors,
            mitigations,
        };
    }
    generateRecommendations(changes, testResults, riskAssessment) {
        const recommendations = [];
        // Based on risk level
        if (riskAssessment.overallRisk === 'critical') {
            recommendations.push('Do not deploy these changes without thorough review');
            recommendations.push('Schedule a security review before proceeding');
        }
        else if (riskAssessment.overallRisk === 'high') {
            recommendations.push('Consider a phased rollout with monitoring');
            recommendations.push('Prepare rollback plan before deployment');
        }
        // Based on test results
        const failedTests = testResults.filter(t => !t.matchedExpected);
        if (failedTests.length > 0) {
            recommendations.push(`Review ${failedTests.length} failed test case(s) before deployment`);
        }
        // Based on change types
        const hasRemovals = changes.some(c => c.type === 'remove');
        if (hasRemovals) {
            recommendations.push('Verify removed rules are no longer needed');
        }
        // Based on changes that alter access
        const accessChanges = testResults.filter(t => t.changed);
        if (accessChanges.length > 0) {
            recommendations.push(`Document access changes for ${accessChanges.length} scenario(s)`);
        }
        // Add mitigations as recommendations
        recommendations.push(...riskAssessment.mitigations);
        return [...new Set(recommendations)]; // Remove duplicates
    }
    buildSummary(changes, testResults, historicalImpact, riskAssessment) {
        return {
            totalChanges: changes.length,
            rulesAdded: changes.filter(c => c.type === 'add').length,
            rulesModified: changes.filter(c => c.type === 'modify').length,
            rulesRemoved: changes.filter(c => c.type === 'remove').length,
            testCasesPassed: testResults.filter(t => t.matchedExpected).length,
            testCasesFailed: testResults.filter(t => !t.matchedExpected).length,
            estimatedAffectedRequests: historicalImpact?.requestsAffected || 0,
            overallRiskScore: calculateRiskScore(riskAssessment.riskFactors),
        };
    }
    detectChanges(beforeRules, afterRules) {
        const changes = [];
        const beforeMap = new Map(beforeRules.map(r => [r.id, r]));
        const afterMap = new Map(afterRules.map(r => [r.id, r]));
        // Detect additions and modifications
        for (const [id, afterRule] of afterMap) {
            const beforeRule = beforeMap.get(id);
            if (!beforeRule) {
                changes.push({
                    id: (0, uuid_1.v4)(),
                    type: 'add',
                    ruleId: id,
                    after: afterRule,
                    description: `Added rule: ${afterRule.name}`,
                });
            }
            else if (JSON.stringify(beforeRule) !== JSON.stringify(afterRule)) {
                changes.push({
                    id: (0, uuid_1.v4)(),
                    type: 'modify',
                    ruleId: id,
                    before: beforeRule,
                    after: afterRule,
                    description: `Modified rule: ${afterRule.name}`,
                });
            }
        }
        // Detect removals
        for (const [id, beforeRule] of beforeMap) {
            if (!afterMap.has(id)) {
                changes.push({
                    id: (0, uuid_1.v4)(),
                    type: 'remove',
                    ruleId: id,
                    before: beforeRule,
                    description: `Removed rule: ${beforeRule.name}`,
                });
            }
        }
        return changes;
    }
}
exports.PolicySimulator = PolicySimulator;
// ============================================================================
// Singleton Factory
// ============================================================================
let instance = null;
function getPolicySimulator() {
    if (!instance) {
        instance = new PolicySimulator();
    }
    return instance;
}
exports.default = PolicySimulator;
