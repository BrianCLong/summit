"use strict";
/**
 * Metrics reporter - formats and displays analytics
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsReporter = void 0;
const chalk_1 = __importDefault(require("chalk"));
const analytics_js_1 = require("./analytics.js");
class MetricsReporter {
    analytics;
    constructor() {
        this.analytics = new analytics_js_1.AnalyticsEngine();
    }
    async getMetrics(days = 30) {
        const overallStats = this.analytics.getOverallStats();
        const topByUsage = this.analytics.getTopByUsage(5);
        const topBySuccess = this.analytics.getTopBySuccessRate(5);
        const trending = this.analytics.getTrending(5);
        return {
            period: `Last ${days} days`,
            overall: overallStats,
            topByUsage,
            topBySuccess,
            trending,
        };
    }
    async displayMetrics(days = 30) {
        const metrics = await this.getMetrics(days);
        console.log(chalk_1.default.bold('\n📈 Prompt System Metrics\n'));
        console.log(chalk_1.default.gray(`Period: ${metrics.period}\n`));
        console.log(chalk_1.default.bold('Overall Statistics:'));
        console.log(`  Total usages: ${chalk_1.default.cyan(metrics.overall.totalUsage)}`);
        console.log(`  Unique templates: ${chalk_1.default.cyan(metrics.overall.uniqueTemplates)}`);
        console.log(`  Success rate: ${chalk_1.default.cyan(metrics.overall.overallSuccessRate.toFixed(1) + '%')}`);
        console.log(`  Avg quality: ${chalk_1.default.cyan(metrics.overall.avgQuality.toFixed(1))}/10`);
        console.log(`  Most used: ${chalk_1.default.cyan(metrics.overall.mostUsed)}`);
        if (metrics.topByUsage.length > 0) {
            console.log(chalk_1.default.bold('\nTop Templates by Usage:'));
            for (const [i, t] of metrics.topByUsage.entries()) {
                console.log(`  ${i + 1}. ${chalk_1.default.cyan(t.templateId)} - ${chalk_1.default.yellow(t.totalUsage)} uses`);
            }
        }
        if (metrics.topBySuccess.length > 0) {
            console.log(chalk_1.default.bold('\nTop Templates by Success Rate:'));
            for (const [i, t] of metrics.topBySuccess.entries()) {
                console.log(`  ${i + 1}. ${chalk_1.default.cyan(t.templateId)} - ${chalk_1.default.green(t.successRate.toFixed(1) + '%')}`);
            }
        }
        if (metrics.trending.length > 0) {
            console.log(chalk_1.default.bold('\nTrending Templates:'));
            for (const [i, t] of metrics.trending.entries()) {
                console.log(`  ${i + 1}. ${chalk_1.default.cyan(t.templateId)} 🔥`);
            }
        }
    }
}
exports.MetricsReporter = MetricsReporter;
