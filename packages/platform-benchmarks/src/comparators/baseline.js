"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaselineComparator = void 0;
const fs = __importStar(require("node:fs/promises"));
/**
 * Baseline comparator for regression detection
 */
class BaselineComparator {
    baselineResults = new Map();
    regressionThreshold;
    constructor(regressionThreshold = 10) {
        this.regressionThreshold = regressionThreshold;
    }
    /**
     * Load baseline from file
     */
    async loadBaseline(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const data = JSON.parse(content);
            const results = data.results || data;
            for (const result of results) {
                this.baselineResults.set(result.config.name, result);
            }
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
            // No baseline file, that's okay
        }
    }
    /**
     * Save current results as new baseline
     */
    async saveBaseline(filePath, results) {
        const data = {
            timestamp: new Date().toISOString(),
            results,
        };
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    }
    /**
     * Compare current result against baseline
     */
    compare(current) {
        const baseline = this.baselineResults.get(current.config.name);
        if (!baseline) {
            return null;
        }
        const meanDelta = current.stats.mean - baseline.stats.mean;
        const meanDeltaPercent = (meanDelta / baseline.stats.mean) * 100;
        const p99Delta = current.stats.percentiles.p99 - baseline.stats.percentiles.p99;
        const opsPerSecondDelta = current.stats.opsPerSecond - baseline.stats.opsPerSecond;
        const isRegression = meanDeltaPercent > this.regressionThreshold;
        let severity;
        if (isRegression) {
            if (meanDeltaPercent > 50) {
                severity = 'severe';
            }
            else if (meanDeltaPercent > 25) {
                severity = 'moderate';
            }
            else {
                severity = 'minor';
            }
        }
        return {
            current,
            baseline,
            meanDelta,
            meanDeltaPercent,
            p99Delta,
            opsPerSecondDelta,
            isRegression,
            severity,
        };
    }
    /**
     * Compare all results and return regressions
     */
    compareAll(results) {
        const comparisons = [];
        for (const result of results) {
            const comparison = this.compare(result);
            if (comparison) {
                comparisons.push(comparison);
            }
        }
        return comparisons;
    }
    /**
     * Get regressions only
     */
    getRegressions(results) {
        return this.compareAll(results).filter((c) => c.isRegression);
    }
    /**
     * Check if any benchmark has regressed
     */
    hasRegressions(results) {
        return this.getRegressions(results).length > 0;
    }
    /**
     * Format comparison as markdown
     */
    formatComparison(comparison) {
        const { current, baseline, meanDeltaPercent, isRegression, severity } = comparison;
        const icon = isRegression ? '🔴' : meanDeltaPercent < -5 ? '🟢' : '⚪';
        const sign = meanDeltaPercent > 0 ? '+' : '';
        let lines = [
            `### ${icon} ${current.config.name}`,
            '',
            '| Metric | Baseline | Current | Delta |',
            '|--------|----------|---------|-------|',
            `| Mean | ${baseline.stats.mean.toFixed(2)} ns | ${current.stats.mean.toFixed(2)} ns | ${sign}${meanDeltaPercent.toFixed(2)}% |`,
            `| p99 | ${baseline.stats.percentiles.p99.toFixed(2)} ns | ${current.stats.percentiles.p99.toFixed(2)} ns | ${sign}${((comparison.p99Delta / baseline.stats.percentiles.p99) * 100).toFixed(2)}% |`,
            `| Ops/sec | ${baseline.stats.opsPerSecond.toFixed(2)} | ${current.stats.opsPerSecond.toFixed(2)} | ${((comparison.opsPerSecondDelta / baseline.stats.opsPerSecond) * 100).toFixed(2)}% |`,
        ];
        if (isRegression) {
            lines.push('');
            lines.push(`**⚠️ Regression detected (${severity})**`);
        }
        return lines.join('\n');
    }
}
exports.BaselineComparator = BaselineComparator;
