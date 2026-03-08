"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunnelAnalyzer = void 0;
/**
 * Funnel analysis for conversion tracking
 */
class FunnelAnalyzer {
    funnels = new Map();
    /**
     * Define funnel steps
     */
    defineFunnel(funnelId, steps) {
        this.funnels.set(funnelId, {
            id: funnelId,
            steps,
            userProgress: new Map(),
            stepCounts: new Map(steps.map((step) => [step, 0])),
        });
    }
    /**
     * Track user event in funnel
     */
    trackEvent(funnelId, userId, step) {
        const funnel = this.funnels.get(funnelId);
        if (!funnel) {
            return null;
        }
        const stepIndex = funnel.steps.indexOf(step);
        if (stepIndex === -1) {
            return null;
        }
        // Get or create user progress
        let progress = funnel.userProgress.get(userId);
        if (!progress) {
            progress = {
                userId,
                currentStep: 0,
                completedSteps: [],
                startTime: Date.now(),
            };
            funnel.userProgress.set(userId, progress);
        }
        // Update progress if moving forward
        if (stepIndex >= progress.currentStep) {
            progress.currentStep = stepIndex;
            if (!progress.completedSteps.includes(step)) {
                progress.completedSteps.push(step);
                // Increment step count
                const currentCount = funnel.stepCounts.get(step) || 0;
                funnel.stepCounts.set(step, currentCount + 1);
            }
        }
        return {
            userId,
            funnelId,
            currentStep: funnel.steps[progress.currentStep],
            completedSteps: progress.completedSteps,
            isComplete: progress.currentStep === funnel.steps.length - 1,
            progress: (progress.currentStep + 1) / funnel.steps.length,
        };
    }
    /**
     * Get funnel statistics
     */
    getFunnelStats(funnelId) {
        const funnel = this.funnels.get(funnelId);
        if (!funnel) {
            return null;
        }
        const stepStats = funnel.steps.map((step, index) => {
            const count = funnel.stepCounts.get(step) || 0;
            const previousCount = index > 0 ? funnel.stepCounts.get(funnel.steps[index - 1]) || 0 : count;
            const conversionRate = previousCount > 0 ? count / previousCount : 0;
            return {
                step,
                count,
                conversionRate,
                dropoffRate: 1 - conversionRate,
            };
        });
        return {
            funnelId,
            totalUsers: funnel.userProgress.size,
            stepStats,
            overallConversion: stepStats[stepStats.length - 1]?.conversionRate || 0,
        };
    }
}
exports.FunnelAnalyzer = FunnelAnalyzer;
