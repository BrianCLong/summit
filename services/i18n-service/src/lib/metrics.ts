import type { TranslationMetrics, LanguageCode } from '../types/index.js';

/**
 * Metrics collector for translation service
 */
export class MetricsCollector {
  private metrics: TranslationMetrics;

  constructor() {
    this.metrics = {
      totalRequests: 0,
      successfulTranslations: 0,
      failedTranslations: 0,
      policyViolations: 0,
      languagePairs: new Map(),
      providerUsage: new Map(),
      averageConfidence: 0,
    };
  }

  /**
   * Increment total requests
   */
  incrementRequests(): void {
    this.metrics.totalRequests++;
  }

  /**
   * Increment successful translations
   */
  incrementSuccess(): void {
    this.metrics.successfulTranslations++;
  }

  /**
   * Increment failed translations
   */
  incrementFailures(): void {
    this.metrics.failedTranslations++;
  }

  /**
   * Increment policy violations
   */
  incrementPolicyViolations(): void {
    this.metrics.policyViolations++;
  }

  /**
   * Record language pair usage
   */
  recordLanguagePair(
    sourceLanguage: LanguageCode,
    targetLanguage: LanguageCode
  ): void {
    const pair = `${sourceLanguage}-${targetLanguage}`;
    const current = this.metrics.languagePairs.get(pair) || 0;
    this.metrics.languagePairs.set(pair, current + 1);
  }

  /**
   * Record provider usage
   */
  recordProvider(provider: string): void {
    const current = this.metrics.providerUsage.get(provider) || 0;
    this.metrics.providerUsage.set(provider, current + 1);
  }

  /**
   * Update confidence tracking
   */
  updateConfidence(confidence: number): void {
    const currentAvg = this.metrics.averageConfidence;
    const count = this.metrics.successfulTranslations;

    // Running average
    this.metrics.averageConfidence =
      (currentAvg * (count - 1) + confidence) / count;
  }

  /**
   * Get current metrics
   */
  getMetrics(): TranslationMetrics {
    return {
      ...this.metrics,
      languagePairs: new Map(this.metrics.languagePairs),
      providerUsage: new Map(this.metrics.providerUsage),
    };
  }

  /**
   * Get metrics as JSON-serializable object
   */
  getMetricsJSON(): any {
    return {
      totalRequests: this.metrics.totalRequests,
      successfulTranslations: this.metrics.successfulTranslations,
      failedTranslations: this.metrics.failedTranslations,
      policyViolations: this.metrics.policyViolations,
      languagePairs: Object.fromEntries(this.metrics.languagePairs),
      providerUsage: Object.fromEntries(this.metrics.providerUsage),
      averageConfidence: this.metrics.averageConfidence,
      successRate:
        this.metrics.totalRequests > 0
          ? (this.metrics.successfulTranslations / this.metrics.totalRequests) *
            100
          : 0,
      policyViolationRate:
        this.metrics.totalRequests > 0
          ? (this.metrics.policyViolations / this.metrics.totalRequests) * 100
          : 0,
    };
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics = {
      totalRequests: 0,
      successfulTranslations: 0,
      failedTranslations: 0,
      policyViolations: 0,
      languagePairs: new Map(),
      providerUsage: new Map(),
      averageConfidence: 0,
    };
  }

  /**
   * Get top language pairs
   */
  getTopLanguagePairs(limit: number = 10): Array<{ pair: string; count: number }> {
    return Array.from(this.metrics.languagePairs.entries())
      .map(([pair, count]) => ({ pair, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Export metrics for Prometheus
   */
  exportPrometheusMetrics(): string {
    const metrics = this.getMetricsJSON();

    const lines: string[] = [
      '# HELP translation_requests_total Total number of translation requests',
      '# TYPE translation_requests_total counter',
      `translation_requests_total ${metrics.totalRequests}`,
      '',
      '# HELP translation_success_total Total number of successful translations',
      '# TYPE translation_success_total counter',
      `translation_success_total ${metrics.successfulTranslations}`,
      '',
      '# HELP translation_failures_total Total number of failed translations',
      '# TYPE translation_failures_total counter',
      `translation_failures_total ${metrics.failedTranslations}`,
      '',
      '# HELP translation_policy_violations_total Total number of policy violations',
      '# TYPE translation_policy_violations_total counter',
      `translation_policy_violations_total ${metrics.policyViolations}`,
      '',
      '# HELP translation_success_rate Success rate of translations',
      '# TYPE translation_success_rate gauge',
      `translation_success_rate ${metrics.successRate}`,
      '',
      '# HELP translation_average_confidence Average confidence score',
      '# TYPE translation_average_confidence gauge',
      `translation_average_confidence ${metrics.averageConfidence}`,
      '',
    ];

    // Language pairs
    lines.push('# HELP translation_language_pairs Language pair usage');
    lines.push('# TYPE translation_language_pairs counter');
    for (const [pair, count] of this.metrics.languagePairs) {
      const [source, target] = pair.split('-');
      lines.push(
        `translation_language_pairs{source="${source}",target="${target}"} ${count}`
      );
    }
    lines.push('');

    // Provider usage
    lines.push('# HELP translation_provider_usage Provider usage');
    lines.push('# TYPE translation_provider_usage counter');
    for (const [provider, count] of this.metrics.providerUsage) {
      lines.push(`translation_provider_usage{provider="${provider}"} ${count}`);
    }

    return lines.join('\n');
  }
}
