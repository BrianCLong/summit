
import { VelocityTracker } from './VelocityTracker.js';

export class ROICalculator {
    private tracker: VelocityTracker;
    private devHourlyRate: number;

    constructor(tracker: VelocityTracker, devHourlyRate: number = 100) {
        this.tracker = tracker;
        this.devHourlyRate = devHourlyRate;
    }

    /**
     * Calculates ROI based on efficiency gains.
     * Formula: (TimeSaved * Rate) - Cost
     * Simplified: We assume 15% efficiency gain per 10% AI saturation.
     */
    calculateROI(): { savings: number; efficiencyGainPercent: number } {
        const metrics = this.tracker.getMetrics();
        if (metrics.length === 0) return { savings: 0, efficiencyGainPercent: 0 };

        const avgAiRate = metrics.reduce((acc, m) => acc + m.aiAssistanceRate, 0) / metrics.length;

        // Model: 15% gain for every 10% AI use, capped at 50%
        const efficiencyGainPercent = Math.min((avgAiRate * 10) * 1.5, 50);

        // Assume baseline work week is 40 hours.
        const hoursSavedPerWeek = 40 * (efficiencyGainPercent / 100);
        const savings = hoursSavedPerWeek * this.devHourlyRate;

        return {
            savings: Math.round(savings),
            efficiencyGainPercent: parseFloat(efficiencyGainPercent.toFixed(2))
        };
    }
}
