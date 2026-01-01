import fs from 'fs';
import path from 'path';

interface PerformanceMetrics {
  initialLoadTime: number;
  renderingPerformance: {
    frameRate: number;
    smoothnessScore: number;
  };
  memoryUsage: {
    initial: number;
    peak: number;
    final: number;
    growth: number;
  };
  accessibility: {
    violations: number;
    passes: number;
    score: number;
  };
  responsiveness: {
    firstInputDelay: number;
    timeToInteractive: number;
    cumulativeLayoutShift: number;
  };
  bundleSize: number;
  networkPerformance: {
    requests: number;
    transferSize: number;
    loadTime: number;
  };
}

/**
 * Before/After Performance Comparison Framework
 * 
 * This module provides functionality to:
 * - Save baseline performance metrics
 * - Compare current metrics to baseline
 * - Generate comparison reports
 */

export class PerformanceComparator {
  private baselinePath: string;
  private currentPath: string;
  private comparisonPath: string;

  constructor() {
    this.baselinePath = path.join(process.cwd(), 'perf', 'comprehensive', 'results', 'baseline-metrics.json');
    this.currentPath = path.join(process.cwd(), 'perf', 'comprehensive', 'results', 'current-metrics.json');
    this.comparisonPath = path.join(process.cwd(), 'perf', 'comprehensive', 'results', 'comparison-report.md');
  }

  /**
   * Save current metrics as the new baseline
   */
  public saveBaseline(): void {
    if (!fs.existsSync(this.currentPath)) {
      throw new Error(`Current metrics file does not exist at ${this.currentPath}`);
    }

    const currentMetrics = JSON.parse(fs.readFileSync(this.currentPath, 'utf8'));
    fs.writeFileSync(this.baselinePath, JSON.stringify(currentMetrics, null, 2));
    console.log(`Baseline metrics saved to ${this.baselinePath}`);
  }

  /**
   * Compare current metrics to baseline and generate report
   */
  public compare(): void {
    if (!fs.existsSync(this.baselinePath)) {
      throw new Error(`Baseline metrics file does not exist at ${this.baselinePath}`);
    }

    if (!fs.existsSync(this.currentPath)) {
      throw new Error(`Current metrics file does not exist at ${this.currentPath}`);
    }

    const baseline: PerformanceMetrics = JSON.parse(fs.readFileSync(this.baselinePath, 'utf8'));
    const current: PerformanceMetrics = JSON.parse(fs.readFileSync(this.currentPath, 'utf8'));

    const comparison = this.generateComparison(baseline, current);
    this.saveComparisonReport(comparison);
  }

  /**
   * Generate comparison between baseline and current metrics
   */
  private generateComparison(baseline: PerformanceMetrics, current: PerformanceMetrics): string {
    const changes = [];

    // Initial Load Time
    const loadTimeChange = current.initialLoadTime - baseline.initialLoadTime;
    const loadTimePercent = baseline.initialLoadTime ? ((loadTimeChange / baseline.initialLoadTime) * 100) : 0;
    changes.push(
      `## Initial Load Time\n` +
      `- Baseline: ${baseline.initialLoadTime}ms\n` +
      `- Current: ${current.initialLoadTime}ms\n` +
      `- Change: ${loadTimeChange > 0 ? '+' : ''}${loadTimeChange}ms (${loadTimePercent > 0 ? '+' : ''}${loadTimePercent.toFixed(2)}%) ${loadTimeChange > 0 ? '⚠️' : '✅'}\n`
    );

    // Rendering Performance
    const frameRateChange = current.renderingPerformance.frameRate - baseline.renderingPerformance.frameRate;
    const frameRatePercent = baseline.renderingPerformance.frameRate ? ((frameRateChange / baseline.renderingPerformance.frameRate) * 100) : 0;
    changes.push(
      `## Rendering Performance\n` +
      `- Baseline FPS: ${baseline.renderingPerformance.frameRate.toFixed(2)}\n` +
      `- Current FPS: ${current.renderingPerformance.frameRate.toFixed(2)}\n` +
      `- Change: ${frameRateChange > 0 ? '+' : ''}${frameRateChange.toFixed(2)} FPS (${frameRatePercent > 0 ? '+' : ''}${frameRatePercent.toFixed(2)}%) ${frameRateChange > 0 ? '✅' : '⚠️'}\n`
    );

    // Memory Usage
    const memoryGrowthChange = current.memoryUsage.growth - baseline.memoryUsage.growth;
    const memoryGrowthPercent = baseline.memoryUsage.growth ? ((memoryGrowthChange / baseline.memoryUsage.growth) * 100) : 0;
    changes.push(
      `## Memory Usage\n` +
      `- Baseline Growth: ${baseline.memoryUsage.growth} bytes\n` +
      `- Current Growth: ${current.memoryUsage.growth} bytes\n` +
      `- Change: ${memoryGrowthChange > 0 ? '+' : ''}${memoryGrowthChange} bytes (${memoryGrowthPercent > 0 ? '+' : ''}${memoryGrowthPercent.toFixed(2)}%) ${memoryGrowthChange > 0 ? '⚠️' : '✅'}\n`
    );

    // Accessibility
    const accessibilityChange = current.accessibility.violations - baseline.accessibility.violations;
    changes.push(
      `## Accessibility Compliance\n` +
      `- Baseline Violations: ${baseline.accessibility.violations}\n` +
      `- Current Violations: ${current.accessibility.violations}\n` +
      `- Change: ${accessibilityChange > 0 ? '+' : ''}${accessibilityChange} violations ${accessibilityChange > 0 ? '⚠️' : '✅'}\n`
    );

    // Responsiveness - First Input Delay
    const fidChange = current.responsiveness.firstInputDelay - baseline.responsiveness.firstInputDelay;
    const fidPercent = baseline.responsiveness.firstInputDelay ? ((fidChange / baseline.responsiveness.firstInputDelay) * 100) : 0;
    changes.push(
      `## Responsiveness - First Input Delay\n` +
      `- Baseline FID: ${baseline.responsiveness.firstInputDelay}ms\n` +
      `- Current FID: ${current.responsiveness.firstInputDelay}ms\n` +
      `- Change: ${fidChange > 0 ? '+' : ''}${fidChange}ms (${fidPercent > 0 ? '+' : ''}${fidPercent.toFixed(2)}%) ${fidChange > 0 ? '⚠️' : '✅'}\n`
    );

    // Bundle Size
    const bundleChange = current.bundleSize - baseline.bundleSize;
    const bundlePercent = baseline.bundleSize ? ((bundleChange / baseline.bundleSize) * 100) : 0;
    changes.push(
      `## Bundle Size\n` +
      `- Baseline: ${(baseline.bundleSize / (1024 * 1024)).toFixed(2)} MB\n` +
      `- Current: ${(current.bundleSize / (1024 * 1024)).toFixed(2)} MB\n` +
      `- Change: ${bundleChange > 0 ? '+' : ''}${(bundleChange / (1024 * 1024)).toFixed(2)} MB (${bundlePercent > 0 ? '+' : ''}${bundlePercent.toFixed(2)}%) ${bundleChange > 0 ? '⚠️' : '✅'}\n`
    );

    // Generate summary
    const improvements = changes.filter(change => change.includes('✅')).length;
    const regressions = changes.filter(change => change.includes('⚠️')).length;
    const summary = `# Performance Comparison Report\n\n` +
      `## Summary\n` +
      `- Improvements: ${improvements}\n` +
      `- Regressions: ${regressions}\n` +
      `- Overall: ${regressions > improvements ? '⚠️ Regressions detected' : improvements > regressions ? '✅ Performance improved' : '➡️ Mixed results'}\n\n` +
      changes.join('\n');

    return summary;
  }

  /**
   * Save comparison report to file
   */
  private saveComparisonReport(comparison: string): void {
    // Create results directory if it doesn't exist
    const resultsDir = path.dirname(this.comparisonPath);
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    fs.writeFileSync(this.comparisonPath, comparison);
    console.log(`Comparison report saved to ${this.comparisonPath}`);
  }

  /**
   * Check if baseline exists
   */
  public hasBaseline(): boolean {
    return fs.existsSync(this.baselinePath);
  }
}

// If running as a script, execute comparison
if (require.main === module) {
  const comparator = new PerformanceComparator();
  
  // Check if baseline exists, if not, save current as baseline
  if (!comparator.hasBaseline()) {
    console.log('No baseline found. Creating baseline from current metrics...');
    comparator.saveBaseline();
  } else {
    console.log('Comparing current metrics to baseline...');
    comparator.compare();
  }
}