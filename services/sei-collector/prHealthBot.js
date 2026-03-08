"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRHealthBot = void 0;
const logger_1 = require("../../server/utils/logger");
const llmBudget_1 = require("../../server/ai/llmBudget");
class PRHealthBot {
    octokit;
    constructor(octokit) {
        this.octokit = octokit;
    }
    async analyzePR(pr, repository) {
        const owner = repository.owner.login;
        const repo = repository.name;
        const prNumber = pr.number;
        try {
            const health = await this.calculatePRHealth(owner, repo, prNumber, pr);
            // Post comment with health analysis
            await this.postHealthComment(owner, repo, prNumber, health);
            logger_1.logger.info('PR health analysis completed', {
                owner,
                repo,
                prNumber,
                score: health.score,
                riskLevel: health.riskLevel,
            });
        }
        catch (error) {
            logger_1.logger.error('PR health analysis failed', {
                owner,
                repo,
                prNumber,
                error: error.message,
            });
        }
    }
    async getPRHealth(owner, repo, prNumber) {
        const { data: pr } = await this.octokit.pulls.get({
            owner,
            repo,
            pull_number: prNumber,
        });
        return this.calculatePRHealth(owner, repo, prNumber, pr);
    }
    async calculatePRHealth(owner, repo, prNumber, pr) {
        // Gather data for analysis
        const [files, commits, reviews, checks] = await Promise.all([
            this.getPRFiles(owner, repo, prNumber),
            this.getPRCommits(owner, repo, prNumber),
            this.getPRReviews(owner, repo, prNumber),
            this.getPRChecks(owner, repo, pr.head.sha),
        ]);
        // Calculate individual health checks
        const complexity = await this.checkComplexity(files, commits);
        const testCoverage = await this.checkTestCoverage(files, checks);
        const reviewVelocity = await this.checkReviewVelocity(pr, reviews);
        const flakeRisk = await this.checkFlakeRisk(files, checks);
        const securityRisk = await this.checkSecurityRisk(files);
        const llmBudget = await this.checkLLMBudget(prNumber);
        // Calculate overall score
        const checks = {
            complexity,
            testCoverage,
            reviewVelocity,
            flakeRisk,
            securityRisk,
            llmBudget,
        };
        const score = this.calculateOverallScore(checks);
        const riskLevel = this.determineRiskLevel(score);
        const recommendations = this.generateRecommendations(checks);
        const estimatedMergeTime = this.estimateMergeTime(checks, reviews.length);
        return {
            score,
            riskLevel,
            checks,
            recommendations,
            estimatedMergeTime,
        };
    }
    async checkComplexity(files, commits) {
        const filesChanged = files.length;
        const linesChanged = files.reduce((sum, f) => sum + f.additions + f.deletions, 0);
        const commitsCount = commits.length;
        let score = 100;
        let status = 'pass';
        let message = 'Complexity looks good';
        if (filesChanged > 20) {
            score -= 30;
            status = 'warn';
            message = `High file count: ${filesChanged} files`;
        }
        else if (filesChanged > 10) {
            score -= 15;
            status = 'warn';
            message = `Moderate file count: ${filesChanged} files`;
        }
        if (linesChanged > 1000) {
            score -= 25;
            status = status === 'pass' ? 'warn' : 'fail';
            message += `. Large changeset: ${linesChanged} lines`;
        }
        if (commitsCount > 15) {
            score -= 10;
            message += `. Many commits: ${commitsCount}`;
        }
        return {
            status,
            score: Math.max(0, score),
            message,
            details: { filesChanged, linesChanged, commitsCount },
        };
    }
    async checkTestCoverage(files, checks) {
        const testFiles = files.filter((f) => f.filename.includes('.test.') ||
            f.filename.includes('.spec.') ||
            f.filename.includes('__tests__'));
        const codeFiles = files.filter((f) => !f.filename.includes('.test.') &&
            !f.filename.includes('.spec.') &&
            (f.filename.endsWith('.ts') ||
                f.filename.endsWith('.js') ||
                f.filename.endsWith('.tsx') ||
                f.filename.endsWith('.jsx')));
        const testRatio = codeFiles.length > 0 ? testFiles.length / codeFiles.length : 1;
        let score = Math.min(100, testRatio * 100);
        let status = 'pass';
        let message = `Test coverage looks good (${testFiles.length} test files for ${codeFiles.length} code files)`;
        if (testRatio < 0.3 && codeFiles.length > 2) {
            score = 40;
            status = 'fail';
            message = `Low test coverage: ${testFiles.length} test files for ${codeFiles.length} code files`;
        }
        else if (testRatio < 0.5 && codeFiles.length > 1) {
            score = 65;
            status = 'warn';
            message = `Moderate test coverage: ${testFiles.length} test files for ${codeFiles.length} code files`;
        }
        return {
            status,
            score,
            message,
            details: {
                testFiles: testFiles.length,
                codeFiles: codeFiles.length,
                ratio: testRatio,
            },
        };
    }
    async checkReviewVelocity(pr, reviews) {
        const prAge = Date.now() - new Date(pr.created_at).getTime();
        const ageHours = prAge / (1000 * 60 * 60);
        const reviewCount = reviews.length;
        let score = 100;
        let status = 'pass';
        let message = 'Review velocity on track';
        if (ageHours > 48 && reviewCount === 0) {
            score = 30;
            status = 'fail';
            message = `PR ${ageHours.toFixed(1)}h old with no reviews`;
        }
        else if (ageHours > 24 && reviewCount === 0) {
            score = 60;
            status = 'warn';
            message = `PR ${ageHours.toFixed(1)}h old, awaiting first review`;
        }
        else if (reviewCount > 0) {
            message = `${reviewCount} review(s) received`;
        }
        return {
            status,
            score,
            message,
            details: { ageHours: Math.round(ageHours), reviewCount },
        };
    }
    async checkFlakeRisk(files, checks) {
        // Check for patterns that commonly cause flaky tests
        const flakePatterns = [
            /setTimeout|setInterval/,
            /Math\.random|Date\.now/,
            /async.*expect/,
            /\.eventually\./,
            /waitFor/,
        ];
        let flakeRisk = 0;
        const riskyFiles = [];
        for (const file of files) {
            if (file.filename.includes('.test.') ||
                file.filename.includes('.spec.')) {
                // In a real implementation, we'd fetch the file content
                // For now, simulate based on filename patterns
                if (file.filename.includes('integration') ||
                    file.filename.includes('e2e')) {
                    flakeRisk += 10;
                    riskyFiles.push(file.filename);
                }
            }
        }
        const score = Math.max(0, 100 - flakeRisk);
        let status = 'pass';
        let message = 'Low flake risk';
        if (flakeRisk > 30) {
            status = 'fail';
            message = 'High flake risk detected';
        }
        else if (flakeRisk > 15) {
            status = 'warn';
            message = 'Moderate flake risk';
        }
        return {
            status,
            score,
            message,
            details: { riskScore: flakeRisk, riskyFiles },
        };
    }
    async checkSecurityRisk(files) {
        const securityFiles = files.filter((f) => f.filename.includes('auth') ||
            f.filename.includes('security') ||
            f.filename.includes('password') ||
            f.filename.includes('token') ||
            f.filename.includes('.env'));
        let score = 100;
        let status = 'pass';
        let message = 'No security concerns detected';
        if (securityFiles.length > 0) {
            score = 70;
            status = 'warn';
            message = `${securityFiles.length} security-sensitive file(s) modified`;
        }
        return {
            status,
            score,
            message,
            details: { securityFiles: securityFiles.map((f) => f.filename) },
        };
    }
    async checkLLMBudget(prNumber) {
        const budget = llmBudget_1.prBudgetTracker.getBudgetSummary(prNumber);
        if (!budget) {
            return {
                status: 'pass',
                score: 100,
                message: 'No LLM budget usage yet',
                details: { budgetUsed: 0, budgetRemaining: 0 },
            };
        }
        const { utilization, usedUSD, remainingUSD } = budget;
        const score = Math.max(0, 100 - utilization);
        let status = 'pass';
        let message = `LLM budget: $${usedUSD.toFixed(2)} used (${utilization.toFixed(1)}%)`;
        if (utilization > 90) {
            status = 'fail';
            message += ' - Budget nearly exhausted';
        }
        else if (utilization > 75) {
            status = 'warn';
            message += ' - High budget usage';
        }
        return {
            status,
            score,
            message,
            details: { usedUSD, remainingUSD, utilization },
        };
    }
    calculateOverallScore(checks) {
        const weights = {
            complexity: 0.2,
            testCoverage: 0.25,
            reviewVelocity: 0.2,
            flakeRisk: 0.15,
            securityRisk: 0.1,
            llmBudget: 0.1,
        };
        return Math.round(Object.entries(checks).reduce((sum, [key, check]) => {
            const weight = weights[key] || 0;
            return sum + check.score * weight;
        }, 0));
    }
    determineRiskLevel(score) {
        if (score >= 80)
            return 'low';
        if (score >= 60)
            return 'medium';
        return 'high';
    }
    generateRecommendations(checks) {
        const recommendations = [];
        if (checks.complexity.status === 'fail') {
            recommendations.push('Consider breaking this PR into smaller chunks');
        }
        if (checks.testCoverage.status === 'fail') {
            recommendations.push('Add tests for the new functionality');
        }
        if (checks.reviewVelocity.status === 'fail') {
            recommendations.push('Ping reviewers or consider assigning different reviewers');
        }
        if (checks.flakeRisk.status === 'warn' ||
            checks.flakeRisk.status === 'fail') {
            recommendations.push('Review tests for potential flakiness patterns');
        }
        if (checks.securityRisk.status === 'warn') {
            recommendations.push('Request security team review for sensitive changes');
        }
        if (checks.llmBudget.status === 'warn') {
            recommendations.push('Consider optimizing AI agent usage to stay within budget');
        }
        return recommendations;
    }
    estimateMergeTime(checks, reviewCount) {
        let baseHours = 4;
        if (checks.complexity.score < 70)
            baseHours += 8;
        if (checks.testCoverage.score < 70)
            baseHours += 4;
        if (reviewCount === 0)
            baseHours += 12;
        if (checks.securityRisk.status === 'warn')
            baseHours += 24;
        if (baseHours <= 8)
            return '< 8 hours';
        if (baseHours <= 24)
            return '< 1 day';
        if (baseHours <= 48)
            return '1-2 days';
        return '2+ days';
    }
    async postHealthComment(owner, repo, prNumber, health) {
        const emoji = health.riskLevel === 'low'
            ? '✅'
            : health.riskLevel === 'medium'
                ? '⚠️'
                : '❌';
        const body = this.formatHealthComment(health, emoji);
        // Check if we already posted a health comment
        const { data: comments } = await this.octokit.issues.listComments({
            owner,
            repo,
            issue_number: prNumber,
        });
        const existingComment = comments.find((c) => c.body?.includes('🤖 **Maestro PR Health Check**'));
        if (existingComment) {
            // Update existing comment
            await this.octokit.issues.updateComment({
                owner,
                repo,
                comment_id: existingComment.id,
                body,
            });
        }
        else {
            // Create new comment
            await this.octokit.issues.createComment({
                owner,
                repo,
                issue_number: prNumber,
                body,
            });
        }
    }
    formatHealthComment(health, emoji) {
        const checkEmoji = (status) => status === 'pass' ? '✅' : status === 'warn' ? '⚠️' : '❌';
        return `🤖 **Maestro PR Health Check** ${emoji}

**Overall Score:** ${health.score}/100 (${health.riskLevel} risk)
**Estimated Merge Time:** ${health.estimatedMergeTime}

## Health Checks
${Object.entries(health.checks)
            .map(([key, check]) => `- ${checkEmoji(check.status)} **${key}**: ${check.message} (${check.score}/100)`)
            .join('\n')}

## Recommendations
${health.recommendations.length > 0
            ? health.recommendations.map((r) => `- ${r}`).join('\n')
            : 'No recommendations - looking good! 🎉'}

---
*This analysis was generated by Maestro Conductor v0.3*`;
    }
    // Helper methods to fetch GitHub data
    async getPRFiles(owner, repo, prNumber) {
        const { data } = await this.octokit.pulls.listFiles({
            owner,
            repo,
            pull_number: prNumber,
        });
        return data;
    }
    async getPRCommits(owner, repo, prNumber) {
        const { data } = await this.octokit.pulls.listCommits({
            owner,
            repo,
            pull_number: prNumber,
        });
        return data;
    }
    async getPRReviews(owner, repo, prNumber) {
        const { data } = await this.octokit.pulls.listReviews({
            owner,
            repo,
            pull_number: prNumber,
        });
        return data;
    }
    async getPRChecks(owner, repo, ref) {
        try {
            const { data } = await this.octokit.checks.listForRef({
                owner,
                repo,
                ref,
            });
            return data.check_runs;
        }
        catch {
            return [];
        }
    }
}
exports.PRHealthBot = PRHealthBot;
