/**
 * Funnel analysis for conversion tracking
 */
export class FunnelAnalyzer {
  private funnels: Map<string, FunnelState> = new Map();

  /**
   * Define funnel steps
   */
  defineFunnel(funnelId: string, steps: string[]): void {
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
  trackEvent(funnelId: string, userId: string, step: string): FunnelProgress | null {
    const funnel = this.funnels.get(funnelId);
    if (!funnel) return null;

    const stepIndex = funnel.steps.indexOf(step);
    if (stepIndex === -1) return null;

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
  getFunnelStats(funnelId: string): FunnelStats | null {
    const funnel = this.funnels.get(funnelId);
    if (!funnel) return null;

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

interface FunnelState {
  id: string;
  steps: string[];
  userProgress: Map<string, UserProgress>;
  stepCounts: Map<string, number>;
}

interface UserProgress {
  userId: string;
  currentStep: number;
  completedSteps: string[];
  startTime: number;
}

export interface FunnelProgress {
  userId: string;
  funnelId: string;
  currentStep: string;
  completedSteps: string[];
  isComplete: boolean;
  progress: number;
}

export interface FunnelStats {
  funnelId: string;
  totalUsers: number;
  stepStats: Array<{
    step: string;
    count: number;
    conversionRate: number;
    dropoffRate: number;
  }>;
  overallConversion: number;
}
