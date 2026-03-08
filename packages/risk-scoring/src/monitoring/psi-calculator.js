"use strict";
/**
 * Population Stability Index (PSI) Calculator
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PSICalculator = void 0;
class PSICalculator {
    /**
     * Calculate PSI between baseline and current distributions
     */
    calculatePSI(baseline, current, bins = 10) {
        const baselineDist = this.createDistribution(baseline, bins);
        const currentDist = this.createDistribution(current, bins);
        let psi = 0;
        for (let i = 0; i < bins; i++) {
            const baselinePct = baselineDist[i];
            const currentPct = currentDist[i];
            if (baselinePct > 0 && currentPct > 0) {
                psi += (currentPct - baselinePct) * Math.log(currentPct / baselinePct);
            }
        }
        return {
            variable: 'score',
            psi,
            status: this.getPSIStatus(psi),
        };
    }
    /**
     * Create distribution with equal-width bins
     */
    createDistribution(data, bins) {
        const min = Math.min(...data);
        const max = Math.max(...data);
        const binWidth = (max - min) / bins;
        const counts = new Array(bins).fill(0);
        for (const value of data) {
            const binIndex = Math.min(bins - 1, Math.floor((value - min) / binWidth));
            counts[binIndex]++;
        }
        // Convert to percentages
        return counts.map(c => (c / data.length) + 1e-10); // Add small value to avoid log(0)
    }
    /**
     * Get PSI status
     */
    getPSIStatus(psi) {
        if (psi < 0.1)
            return 'stable';
        if (psi < 0.25)
            return 'warning';
        return 'unstable';
    }
}
exports.PSICalculator = PSICalculator;
