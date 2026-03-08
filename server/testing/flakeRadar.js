"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flakeRadar = exports.FlakeRadar = void 0;
const logger_js_1 = require("../utils/logger.js");
const metrics_js_1 = require("../observability/metrics.js");
class FlakeRadar {
    options;
    testHistory = new Map();
    quarantine = new Set();
    flakeAnalyses = new Map();
    constructor(options = {
        minRuns: 10,
        flakeThreshold: 0.05, // 5% failure rate
        confidenceThreshold: 0.7,
        maxHistoryDays: 30,
    }) {
        this.options = options;
    }
    recordTestRun(run) {
        const testKey = `${run.suite}::${run.testName}`;
        if (!this.testHistory.has(testKey)) {
            this.testHistory.set(testKey, []);
        }
        const history = this.testHistory.get(testKey);
        history.push(run);
        // Keep only recent history
        const cutoff = new Date(Date.now() - this.options.maxHistoryDays * 24 * 60 * 60 * 1000);
        this.testHistory.set(testKey, history.filter((r) => r.timestamp >= cutoff));
        // Trigger flake analysis if we have enough runs
        if (history.length >= this.options.minRuns) {
            const analysis = this.analyzeFlake(testKey, history);
            if (analysis.flakeRate >= this.options.flakeThreshold) {
                this.flakeAnalyses.set(testKey, analysis);
                if (analysis.quarantineRecommended &&
                    analysis.confidence >= this.options.confidenceThreshold) {
                    this.recommendQuarantine(testKey, analysis);
                }
            }
        }
        logger_js_1.logger.debug('Test run recorded', {
            testKey,
            status: run.status,
            totalRuns: history.length,
        });
    }
    analyzeFlake(testKey, history) {
        const failures = history.filter((r) => r.status === 'fail');
        const passes = history.filter((r) => r.status === 'pass');
        const flakeRate = failures.length / history.length;
        // Detect flake patterns
        const evidence = [];
        const pattern = this.detectFlakePattern(history, evidence);
        // Calculate confidence based on evidence strength
        const confidence = evidence.reduce((sum, e) => sum + e.strength, 0) / evidence.length || 0;
        const analysis = {
            testName: history[0].testName,
            suite: history[0].suite,
            flakeRate,
            totalRuns: history.length,
            failures: failures.length,
            pattern,
            confidence,
            evidence,
            quarantineRecommended: flakeRate > 0.1 && confidence > 0.6,
            owner: this.findTestOwner(testKey),
        };
        logger_js_1.logger.info('Flake analysis completed', {
            testKey,
            flakeRate: (flakeRate * 100).toFixed(1) + '%',
            pattern,
            confidence: (confidence * 100).toFixed(1) + '%',
        });
        return analysis;
    }
    detectFlakePattern(history, evidence) {
        const failures = history.filter((r) => r.status === 'fail');
        const passes = history.filter((r) => r.status === 'pass');
        // Time-dependent pattern
        const timePattern = this.detectTimePattern(failures, passes);
        if (timePattern.strength > 0.6) {
            evidence.push(timePattern);
            return 'time-dependent';
        }
        // Resource-dependent pattern
        const resourcePattern = this.detectResourcePattern(failures, passes);
        if (resourcePattern.strength > 0.6) {
            evidence.push(resourcePattern);
            return 'resource-dependent';
        }
        // Intermittent pattern
        const intermittentPattern = this.detectIntermittentPattern(history);
        if (intermittentPattern.strength > 0.5) {
            evidence.push(intermittentPattern);
            return 'intermittent';
        }
        return 'unknown';
    }
    detectTimePattern(failures, passes) {
        // Check if failures cluster around specific times
        const failureHours = failures.map((f) => f.timestamp.getHours());
        const passHours = passes.map((p) => p.timestamp.getHours());
        // Simple time clustering - in reality would use more sophisticated analysis
        const failureModeHour = this.findMode(failureHours);
        const passesAtFailureHour = passHours.filter((h) => h === failureModeHour).length;
        const totalAtFailureHour = failureHours.filter((h) => h === failureModeHour).length +
            passesAtFailureHour;
        const strength = totalAtFailureHour > 3 ? 0.7 : 0.3;
        return {
            type: 'timing',
            description: `Failures tend to occur around ${failureModeHour}:00`,
            strength,
        };
    }
    detectResourcePattern(failures, passes) {
        // Analyze if failures correlate with resource usage patterns
        // Mock implementation - would integrate with system metrics
        const avgFailureDuration = failures.reduce((sum, f) => sum + f.duration, 0) / failures.length;
        const avgPassDuration = passes.reduce((sum, p) => sum + p.duration, 0) / passes.length;
        const durationRatio = avgFailureDuration / avgPassDuration;
        const strength = Math.abs(durationRatio - 1) > 0.5 ? 0.8 : 0.2;
        return {
            type: 'dependency',
            description: `Failed tests avg ${avgFailureDuration.toFixed(0)}ms vs passed ${avgPassDuration.toFixed(0)}ms`,
            strength,
        };
    }
    detectIntermittentPattern(history) {
        // Look for alternating pass/fail patterns
        let alternations = 0;
        for (let i = 1; i < history.length; i++) {
            if (history[i].status !== history[i - 1].status) {
                alternations++;
            }
        }
        const alternationRate = alternations / (history.length - 1);
        const strength = alternationRate > 0.4 ? 0.9 : alternationRate > 0.2 ? 0.6 : 0.1;
        return {
            type: 'concurrency',
            description: `Test alternates between pass/fail (${(alternationRate * 100).toFixed(1)}% alternation rate)`,
            strength,
        };
    }
    findMode(numbers) {
        const counts = numbers.reduce((acc, n) => {
            acc[n] = (acc[n] || 0) + 1;
            return acc;
        }, {});
        return parseInt(Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] || '0');
    }
    findTestOwner(testKey) {
        // Mock implementation - would integrate with CODEOWNERS or git blame
        if (testKey.includes('auth'))
            return 'auth-team';
        if (testKey.includes('api'))
            return 'backend-team';
        if (testKey.includes('ui') || testKey.includes('component'))
            return 'frontend-team';
        return 'platform-team';
    }
    recommendQuarantine(testKey, analysis) {
        if (this.quarantine.has(testKey)) {
            return; // Already quarantined
        }
        this.quarantine.add(testKey);
        logger_js_1.logger.warn('Test quarantine recommended', {
            testKey,
            flakeRate: (analysis.flakeRate * 100).toFixed(1) + '%',
            pattern: analysis.pattern,
            confidence: (analysis.confidence * 100).toFixed(1) + '%',
        });
        // Record metrics
        (0, metrics_js_1.recordTestMetrics)(0, 0, 0, 1, analysis.suite);
        // In a real system, would:
        // - Create GitHub issue for owner
        // - Add test to quarantine list in CI config
        // - Send notification to team
        this.createQuarantineIssue(testKey, analysis);
    }
    async createQuarantineIssue(testKey, analysis) {
        // Mock implementation - would create actual GitHub issue
        const issueBody = this.generateQuarantineIssueBody(testKey, analysis);
        logger_js_1.logger.info('Quarantine issue would be created', {
            testKey,
            owner: analysis.owner,
            title: `Flaky test detected: ${testKey}`,
            body: issueBody,
        });
    }
    generateQuarantineIssueBody(testKey, analysis) {
        return `# 🔥 Flaky Test Quarantine Alert

**Test:** \`${testKey}\`
**Flake Rate:** ${(analysis.flakeRate * 100).toFixed(1)}%
**Confidence:** ${(analysis.confidence * 100).toFixed(1)}%
**Pattern:** ${analysis.pattern}

## Analysis
Total runs: ${analysis.totalRuns}
Failures: ${analysis.failures}

## Evidence
${analysis.evidence.map((e) => `- **${e.type}**: ${e.description} (strength: ${(e.strength * 100).toFixed(0)}%)`).join('\n')}

## Recommended Actions
${this.generateRecommendations(analysis)}

## Quarantine Status
This test has been automatically added to the quarantine list and will be skipped in CI until fixed.

---
*Generated by Maestro Test Flake Radar v0.3*`;
    }
    generateRecommendations(analysis) {
        const recommendations = [];
        switch (analysis.pattern) {
            case 'time-dependent':
                recommendations.push('- Add explicit waits or timeouts');
                recommendations.push('- Mock time-dependent dependencies');
                recommendations.push('- Review async operations for race conditions');
                break;
            case 'resource-dependent':
                recommendations.push('- Check for shared resources between tests');
                recommendations.push('- Increase timeout values');
                recommendations.push('- Review memory or CPU constraints');
                break;
            case 'intermittent':
                recommendations.push('- Review test isolation and cleanup');
                recommendations.push('- Check for order-dependent tests');
                recommendations.push('- Investigate concurrency issues');
                break;
            default:
                recommendations.push('- Review test for non-deterministic behavior');
                recommendations.push('- Add more detailed logging');
                recommendations.push('- Consider test environment differences');
        }
        recommendations.push('- Run test 100+ times locally to reproduce');
        recommendations.push('- Add retry logic as temporary mitigation');
        return recommendations.join('\n');
    }
    // Public API methods
    getFlakeAnalysis(testKey) {
        return this.flakeAnalyses.get(testKey) || null;
    }
    getAllFlakeAnalyses() {
        return Array.from(this.flakeAnalyses.values());
    }
    getQuarantinedTests() {
        return Array.from(this.quarantine);
    }
    isQuarantined(testKey) {
        return this.quarantine.has(testKey);
    }
    removeFromQuarantine(testKey) {
        if (this.quarantine.delete(testKey)) {
            this.flakeAnalyses.delete(testKey);
            logger_js_1.logger.info('Test removed from quarantine', { testKey });
            return true;
        }
        return false;
    }
    getFlakeStats() {
        const allTests = this.testHistory.size;
        const flakyTests = this.flakeAnalyses.size;
        const quarantinedTests = this.quarantine.size;
        // Calculate overall flake rate
        const totalRuns = Array.from(this.testHistory.values()).reduce((sum, history) => sum + history.length, 0);
        const totalFailures = Array.from(this.testHistory.values()).reduce((sum, history) => sum + history.filter((r) => r.status === 'fail').length, 0);
        const overallFlakeRate = totalRuns > 0 ? totalFailures / totalRuns : 0;
        return {
            totalTests: allTests,
            flakyTests,
            quarantinedTests,
            overallFlakeRate,
        };
    }
    generateWeeklyReport() {
        const stats = this.getFlakeStats();
        const topFlakes = this.getAllFlakeAnalyses()
            .sort((a, b) => b.flakeRate - a.flakeRate)
            .slice(0, 10);
        return `# Weekly Flake Report

## Summary
- **Total Tests Monitored:** ${stats.totalTests}
- **Flaky Tests Detected:** ${stats.flakyTests}
- **Tests Quarantined:** ${stats.quarantinedTests}
- **Overall Flake Rate:** ${(stats.overallFlakeRate * 100).toFixed(2)}%

## Top Flaky Tests
${topFlakes
            .map((analysis, i) => `${i + 1}. \`${analysis.suite}::${analysis.testName}\` - ${(analysis.flakeRate * 100).toFixed(1)}% (${analysis.pattern})`)
            .join('\n')}

## Recommendations
${stats.overallFlakeRate > 0.05
            ? '🚨 Flake rate above 5% threshold. Focus on test stability improvements.'
            : '✅ Flake rate within acceptable range.'}

---
*Generated by Maestro Test Flake Radar*`;
    }
}
exports.FlakeRadar = FlakeRadar;
// Singleton instance
exports.flakeRadar = new FlakeRadar();
