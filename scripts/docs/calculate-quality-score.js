#!/usr/bin/env node

/**
 * Documentation Quality Score Calculator
 * Calculates comprehensive quality score based on multiple metrics
 */

const fs = require('fs');
const path = require('path');

class QualityScoreCalculator {
  constructor() {
    this.weights = {
      styleErrors: 0.2, // 20% - Style and grammar compliance
      linkHealth: 0.15, // 15% - Link validation
      markdownSyntax: 0.1, // 10% - Markdown syntax compliance
      yamlValidation: 0.05, // 5%  - YAML configuration validity
      spellCheck: 0.1, // 10% - Spelling accuracy
      accessibility: 0.15, // 15% - Accessibility compliance
      performance: 0.1, // 10% - Page performance
      seo: 0.05, // 5%  - SEO optimization
      codeExamples: 0.05, // 5%  - Code example functionality
      apiAlignment: 0.05, // 5%  - API documentation alignment
    };

    this.maxErrors = {
      styleErrors: 50,
      linkErrors: 10,
      markdownErrors: 20,
      yamlErrors: 5,
      spellErrors: 30,
    };
  }

  /**
   * Calculate comprehensive quality score
   */
  calculate(metrics) {
    console.log('🧮 Calculating documentation quality score...');

    const scores = {
      styleScore: this.calculateErrorBasedScore(
        metrics.styleErrors || 0,
        this.maxErrors.styleErrors,
      ),
      linkScore: this.calculateErrorBasedScore(
        metrics.linkErrors || 0,
        this.maxErrors.linkErrors,
      ),
      markdownScore: this.calculateErrorBasedScore(
        metrics.markdownErrors || 0,
        this.maxErrors.markdownErrors,
      ),
      yamlScore: this.calculateErrorBasedScore(
        metrics.yamlErrors || 0,
        this.maxErrors.yamlErrors,
      ),
      spellScore: this.calculateErrorBasedScore(
        metrics.spellErrors || 0,
        this.maxErrors.spellErrors,
      ),
      accessibilityScore: metrics.accessibilityScore || 100,
      performanceScore: metrics.performanceScore || 100,
      seoScore: metrics.seoScore || 100,
      codeScore: metrics.codeScore || 100,
      apiScore: metrics.apiScore || 100,
    };

    // Calculate weighted average
    const weightedScore =
      scores.styleScore * this.weights.styleErrors +
      scores.linkScore * this.weights.linkHealth +
      scores.markdownScore * this.weights.markdownSyntax +
      scores.yamlScore * this.weights.yamlValidation +
      scores.spellScore * this.weights.spellCheck +
      scores.accessibilityScore * this.weights.accessibility +
      scores.performanceScore * this.weights.performance +
      scores.seoScore * this.weights.seo +
      scores.codeScore * this.weights.codeExamples +
      scores.apiScore * this.weights.apiAlignment;

    const finalScore = Math.round(weightedScore * 100) / 100;

    // Generate detailed breakdown
    const breakdown = {
      overall: finalScore,
      components: {
        'Style & Grammar': {
          score: scores.styleScore,
          weight: this.weights.styleErrors,
          contribution: scores.styleScore * this.weights.styleErrors,
          errors: metrics.styleErrors || 0,
        },
        'Link Health': {
          score: scores.linkScore,
          weight: this.weights.linkHealth,
          contribution: scores.linkScore * this.weights.linkHealth,
          errors: metrics.linkErrors || 0,
        },
        'Markdown Syntax': {
          score: scores.markdownScore,
          weight: this.weights.markdownSyntax,
          contribution: scores.markdownScore * this.weights.markdownSyntax,
          errors: metrics.markdownErrors || 0,
        },
        'YAML Validation': {
          score: scores.yamlScore,
          weight: this.weights.yamlValidation,
          contribution: scores.yamlScore * this.weights.yamlValidation,
          errors: metrics.yamlErrors || 0,
        },
        'Spell Check': {
          score: scores.spellScore,
          weight: this.weights.spellCheck,
          contribution: scores.spellScore * this.weights.spellCheck,
          errors: metrics.spellErrors || 0,
        },
        Accessibility: {
          score: scores.accessibilityScore,
          weight: this.weights.accessibility,
          contribution: scores.accessibilityScore * this.weights.accessibility,
          rawScore: metrics.accessibilityScore || 100,
        },
        Performance: {
          score: scores.performanceScore,
          weight: this.weights.performance,
          contribution: scores.performanceScore * this.weights.performance,
          rawScore: metrics.performanceScore || 100,
        },
        SEO: {
          score: scores.seoScore,
          weight: this.weights.seo,
          contribution: scores.seoScore * this.weights.seo,
          rawScore: metrics.seoScore || 100,
        },
        'Code Examples': {
          score: scores.codeScore,
          weight: this.weights.codeExamples,
          contribution: scores.codeScore * this.weights.codeExamples,
          rawScore: metrics.codeScore || 100,
        },
        'API Alignment': {
          score: scores.apiScore,
          weight: this.weights.apiAlignment,
          contribution: scores.apiScore * this.weights.apiAlignment,
          rawScore: metrics.apiScore || 100,
        },
      },
      timestamp: new Date().toISOString(),
      thresholds: {
        excellent: 95,
        good: 85,
        acceptable: 70,
        poor: 50,
      },
    };

    this.generateReport(breakdown);
    this.logResults(breakdown);

    return finalScore;
  }

  /**
   * Calculate score based on error count with exponential penalty
   */
  calculateErrorBasedScore(errorCount, maxErrors) {
    if (errorCount === 0) return 100;

    // Exponential penalty for errors
    const errorRatio = Math.min(errorCount / maxErrors, 1);
    const penalty = Math.pow(errorRatio, 0.5) * 100;

    return Math.max(0, 100 - penalty);
  }

  /**
   * Determine quality grade based on score
   */
  getQualityGrade(score) {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'B+';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Get badge color for score
   */
  getBadgeColor(score) {
    if (score >= 95) return 'brightgreen';
    if (score >= 85) return 'green';
    if (score >= 70) return 'yellow';
    if (score >= 50) return 'orange';
    return 'red';
  }

  /**
   * Generate quality improvement recommendations
   */
  generateRecommendations(breakdown) {
    const recommendations = [];
    const components = breakdown.components;

    // Identify lowest scoring components
    const sortedComponents = Object.entries(components)
      .sort((a, b) => a[1].score - b[1].score)
      .slice(0, 3);

    sortedComponents.forEach(([name, data]) => {
      if (data.score < 80) {
        switch (name) {
          case 'Style & Grammar':
            recommendations.push({
              priority: 'high',
              area: name,
              issue: `${data.errors} style/grammar violations detected`,
              action:
                'Run Vale with --fix flag and review style guide compliance',
              impact: `+${Math.round((100 - data.score) * data.weight)} points potential`,
            });
            break;

          case 'Link Health':
            recommendations.push({
              priority: 'high',
              area: name,
              issue: `${data.errors} broken links found`,
              action:
                'Update or remove broken links, verify external link status',
              impact: `+${Math.round((100 - data.score) * data.weight)} points potential`,
            });
            break;

          case 'Accessibility':
            recommendations.push({
              priority: 'critical',
              area: name,
              issue: `Accessibility score: ${data.rawScore}%`,
              action:
                'Add alt text to images, fix heading hierarchy, improve color contrast',
              impact: `+${Math.round((100 - data.score) * data.weight)} points potential`,
            });
            break;

          case 'Performance':
            recommendations.push({
              priority: 'medium',
              area: name,
              issue: `Performance score: ${data.rawScore}%`,
              action: 'Optimize images, reduce bundle size, enable caching',
              impact: `+${Math.round((100 - data.score) * data.weight)} points potential`,
            });
            break;

          default:
            recommendations.push({
              priority: 'medium',
              area: name,
              issue: `Score below threshold: ${data.score}%`,
              action: 'Review and improve content quality in this area',
              impact: `+${Math.round((100 - data.score) * data.weight)} points potential`,
            });
        }
      }
    });

    return recommendations;
  }

  /**
   * Generate comprehensive quality report
   */
  generateReport(breakdown) {
    const grade = this.getQualityGrade(breakdown.overall);
    const recommendations = this.generateRecommendations(breakdown);

    const report = {
      ...breakdown,
      grade,
      badgeColor: this.getBadgeColor(breakdown.overall),
      recommendations,
      summary: {
        status: breakdown.overall >= 85 ? 'PASS' : 'FAIL',
        message:
          breakdown.overall >= 95
            ? 'Excellent quality!'
            : breakdown.overall >= 85
              ? 'Good quality, minor improvements suggested'
              : breakdown.overall >= 70
                ? 'Acceptable quality, improvements needed'
                : 'Poor quality, significant improvements required',
      },
    };

    // Save detailed report
    fs.writeFileSync(
      'quality-score-report.json',
      JSON.stringify(report, null, 2),
    );

    // Generate markdown summary
    this.generateMarkdownSummary(report);

    return report;
  }

  /**
   * Generate markdown summary for PR comments
   */
  generateMarkdownSummary(report) {
    const { overall, grade, components, recommendations, summary } = report;

    let markdown = `## 📊 Quality Score: ${overall}% (${grade})\n\n`;

    markdown += `**Status**: ${summary.status === 'PASS' ? '✅' : '❌'} ${summary.message}\n\n`;

    markdown += `### Component Breakdown\n\n`;
    markdown += `| Component | Score | Weight | Contribution | Status |\n`;
    markdown += `|-----------|-------|--------|--------------|--------|\n`;

    Object.entries(components).forEach(([name, data]) => {
      const status = data.score >= 90 ? '🟢' : data.score >= 70 ? '🟡' : '🔴';
      markdown += `| ${name} | ${data.score.toFixed(1)}% | ${(data.weight * 100).toFixed(0)}% | ${data.contribution.toFixed(1)} | ${status} |\n`;
    });

    if (recommendations.length > 0) {
      markdown += `\n### 🎯 Top Recommendations\n\n`;

      recommendations.slice(0, 5).forEach((rec, index) => {
        const priority =
          rec.priority === 'critical'
            ? '🚨'
            : rec.priority === 'high'
              ? '⚠️'
              : '💡';
        markdown += `${index + 1}. ${priority} **${rec.area}**: ${rec.issue}\n`;
        markdown += `   - Action: ${rec.action}\n`;
        markdown += `   - Impact: ${rec.impact}\n\n`;
      });
    }

    markdown += `\n### Quality Thresholds\n`;
    markdown += `- 🟢 Excellent (95%+) - Ready for release\n`;
    markdown += `- 🟡 Good (85%+) - Minor improvements suggested\n`;
    markdown += `- 🟡 Acceptable (70%+) - Improvements needed\n`;
    markdown += `- 🔴 Poor (50%+) - Significant improvements required\n`;
    markdown += `- 🔴 Critical (<50%) - Major rework needed\n`;

    fs.writeFileSync('quality-score-summary.md', markdown);
  }

  /**
   * Log results to console
   */
  logResults(breakdown) {
    const { overall, grade, summary } = breakdown;

    console.log('\n📊 Quality Score Calculation Complete');
    console.log('=====================================');
    console.log(`Overall Score: ${overall}% (${grade})`);
    console.log(`Status: ${summary.status} - ${summary.message}`);

    console.log('\nComponent Scores:');
    Object.entries(breakdown.components).forEach(([name, data]) => {
      const status = data.score >= 90 ? '🟢' : data.score >= 70 ? '🟡' : '🔴';
      console.log(
        `  ${status} ${name}: ${data.score.toFixed(1)}% (weight: ${(data.weight * 100).toFixed(0)}%)`,
      );
    });

    if (breakdown.recommendations.length > 0) {
      console.log('\nTop Recommendations:');
      breakdown.recommendations.slice(0, 3).forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec.area}: ${rec.action}`);
      });
    }
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const metrics = {};

  // Parse command line arguments
  args.forEach((arg) => {
    const [key, value] = arg.split('=');
    const cleanKey = key.replace('--', '');
    metrics[cleanKey] = parseFloat(value) || 0;
  });

  if (Object.keys(metrics).length === 0) {
    console.error('❌ No metrics provided');
    console.error(
      'Usage: node calculate-quality-score.js --style-errors=5 --link-errors=2 ...',
    );
    process.exit(1);
  }

  const calculator = new QualityScoreCalculator();
  const score = calculator.calculate(metrics);

  // Output for GitHub Actions
  console.log(`\n::set-output name=score::${score}`);
  console.log(`::set-output name=grade::${calculator.getQualityGrade(score)}`);
  console.log(
    `::set-output name=badge-color::${calculator.getBadgeColor(score)}`,
  );

  // Exit with appropriate code
  process.exit(score >= 85 ? 0 : 1);
}

module.exports = QualityScoreCalculator;
