/**
 * Metrics reporter - formats and displays analytics
 */

import chalk from 'chalk';
import { AnalyticsEngine } from './analytics.js';

export class MetricsReporter {
  private analytics: AnalyticsEngine;

  constructor() {
    this.analytics = new AnalyticsEngine();
  }

  async getMetrics(days: number = 30) {
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

  async displayMetrics(days: number = 30) {
    const metrics = await this.getMetrics(days);

    console.log(chalk.bold('\n📈 Prompt System Metrics\n'));
    console.log(chalk.gray(`Period: ${metrics.period}\n`));

    console.log(chalk.bold('Overall Statistics:'));
    console.log(`  Total usages: ${chalk.cyan(metrics.overall.totalUsage)}`);
    console.log(`  Unique templates: ${chalk.cyan(metrics.overall.uniqueTemplates)}`);
    console.log(`  Success rate: ${chalk.cyan(metrics.overall.overallSuccessRate.toFixed(1) + '%')}`);
    console.log(`  Avg quality: ${chalk.cyan(metrics.overall.avgQuality.toFixed(1))}/10`);
    console.log(`  Most used: ${chalk.cyan(metrics.overall.mostUsed)}`);

    if (metrics.topByUsage.length > 0) {
      console.log(chalk.bold('\nTop Templates by Usage:'));
      for (const [i, t] of metrics.topByUsage.entries()) {
        console.log(`  ${i + 1}. ${chalk.cyan(t.templateId)} - ${chalk.yellow(t.totalUsage)} uses`);
      }
    }

    if (metrics.topBySuccess.length > 0) {
      console.log(chalk.bold('\nTop Templates by Success Rate:'));
      for (const [i, t] of metrics.topBySuccess.entries()) {
        console.log(`  ${i + 1}. ${chalk.cyan(t.templateId)} - ${chalk.green(t.successRate.toFixed(1) + '%')}`);
      }
    }

    if (metrics.trending.length > 0) {
      console.log(chalk.bold('\nTrending Templates:'));
      for (const [i, t] of metrics.trending.entries()) {
        console.log(`  ${i + 1}. ${chalk.cyan(t.templateId)} 🔥`);
      }
    }
  }
}
