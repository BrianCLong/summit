#!/usr/bin/env node

/**
 * Classification Accuracy Monitor
 *
 * Tracks RepoOS PR classification predictions vs actual outcomes.
 * Analyzes:
 * - Merge success prediction accuracy
 * - Risk level calibration
 * - Lane assignment correctness
 * - Concern classification precision
 *
 * Usage:
 *   node monitor-classification-accuracy.mjs analyze [days]
 *   node monitor-classification-accuracy.mjs report
 */

import fs from 'fs/promises';
import path from 'path';
import { exec as execSync } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execSync);

/**
 * Classification Accuracy Monitor
 */
export class ClassificationAccuracyMonitor {
  constructor(config = {}) {
    this.repoRoot = config.repoRoot || process.cwd();
    this.classificationsDir = path.join(this.repoRoot, '.repoos/pr-classifications');
    this.archiveDir = path.join(this.repoRoot, '.repoos/evidence-archive/classifications');
    this.metrics = {
      totalPRs: 0,
      mergeSuccessPredictions: { correct: 0, incorrect: 0, pending: 0 },
      riskLevelPredictions: { correct: 0, incorrect: 0, pending: 0 },
      laneAssignments: { correct: 0, incorrect: 0, pending: 0 },
      concernClassifications: { correct: 0, incorrect: 0, pending: 0 }
    };
  }

  /**
   * Analyze classification accuracy over time period
   * @param {number} days - Number of days to analyze
   */
  async analyze(days = 30) {
    console.log(`\n📊 Analyzing classification accuracy for last ${days} days...\n`);

    const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);
    const classifications = await this.loadClassifications(cutoffDate);

    console.log(`Found ${classifications.length} classifications to analyze\n`);

    for (const classification of classifications) {
      await this.analyzeClassification(classification);
    }

    return this.generateReport();
  }

  /**
   * Load classifications from filesystem
   */
  async loadClassifications(cutoffDate) {
    const classifications = [];

    // Load from active directory
    try {
      const files = await fs.readdir(this.classificationsDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(this.classificationsDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtimeMs >= cutoffDate) {
          const data = await fs.readFile(filePath, 'utf8');
          const classification = JSON.parse(data);
          classification._filePath = filePath;
          classifications.push(classification);
        }
      }
    } catch (error) {
      // Directory might not exist yet
    }

    // Load from archive
    try {
      const archiveFiles = await fs.readdir(this.archiveDir);
      for (const file of archiveFiles) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(this.archiveDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtimeMs >= cutoffDate) {
          const data = await fs.readFile(filePath, 'utf8');
          const classification = JSON.parse(data);
          classification._filePath = filePath;
          classifications.push(classification);
        }
      }
    } catch (error) {
      // Archive might not exist yet
    }

    return classifications;
  }

  /**
   * Analyze single classification against actual outcome
   */
  async analyzeClassification(classification) {
    this.metrics.totalPRs++;

    const prNumber = classification.prNumber;
    const actual = await this.getActualOutcome(prNumber);

    if (!actual) {
      // PR still open, mark as pending
      this.metrics.mergeSuccessPredictions.pending++;
      this.metrics.riskLevelPredictions.pending++;
      this.metrics.laneAssignments.pending++;
      this.metrics.concernClassifications.pending++;
      return;
    }

    // Analyze merge success prediction
    const predicted = classification.prediction;
    if (predicted) {
      const predictedSuccess = predicted.decision === 'merge' || predicted.mergeProbability > 0.5;
      const actualSuccess = actual.merged;

      if (predictedSuccess === actualSuccess) {
        this.metrics.mergeSuccessPredictions.correct++;
      } else {
        this.metrics.mergeSuccessPredictions.incorrect++;
      }
    }

    // Analyze risk level prediction
    if (predicted && predicted.riskLevel && actual.merged !== undefined) {
      const predictedRisk = predicted.riskLevel;
      const actualRisk = this.calculateActualRisk(actual);

      if (predictedRisk === actualRisk) {
        this.metrics.riskLevelPredictions.correct++;
      } else {
        this.metrics.riskLevelPredictions.incorrect++;
      }
    }

    // Analyze lane assignment
    if (classification.recommendedLane && actual.merged !== undefined) {
      const predictedLane = classification.recommendedLane;
      const actualLane = this.calculateActualLane(actual);

      if (predictedLane === actualLane) {
        this.metrics.laneAssignments.correct++;
      } else {
        this.metrics.laneAssignments.incorrect++;
      }
    }

    // Analyze concern classification
    if (classification.concerns && classification.concerns.length > 0 && actual.changedFiles) {
      const predictedConcerns = classification.concerns;
      const actualConcerns = this.extractActualConcerns(actual.changedFiles);

      const overlap = predictedConcerns.filter(c => actualConcerns.includes(c)).length;
      const precision = overlap / predictedConcerns.length;

      if (precision >= 0.8) {
        this.metrics.concernClassifications.correct++;
      } else {
        this.metrics.concernClassifications.incorrect++;
      }
    }
  }

  /**
   * Get actual outcome for a PR
   */
  async getActualOutcome(prNumber) {
    try {
      const { stdout } = await exec(`gh pr view ${prNumber} --json state,merged,closedAt,mergedAt,changedFiles,reviews,commits`);
      const pr = JSON.parse(stdout);

      if (pr.state === 'OPEN') {
        return null; // Still pending
      }

      return {
        merged: pr.merged,
        closedAt: pr.closedAt,
        mergedAt: pr.mergedAt,
        changedFiles: pr.changedFiles || [],
        reviews: pr.reviews || [],
        commits: pr.commits || []
      };
    } catch (error) {
      console.warn(`Failed to get outcome for PR #${prNumber}: ${error.message}`);
      return null;
    }
  }

  /**
   * Calculate actual risk level based on outcome
   */
  calculateActualRisk(actual) {
    if (!actual.merged) {
      return 'high'; // Failed to merge = high risk materialized
    }

    // If merged successfully with no reverts within timeframe
    const reviews = actual.reviews || [];
    const changesRequested = reviews.filter(r => r.state === 'CHANGES_REQUESTED').length;

    if (changesRequested === 0) {
      return 'low';
    } else if (changesRequested <= 2) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  /**
   * Calculate actual lane based on merge characteristics
   */
  calculateActualLane(actual) {
    if (!actual.merged) {
      return 'staged-merge'; // Would have needed more care
    }

    const commits = (actual.commits || []).length;
    const reviews = (actual.reviews || []).length;

    if (commits <= 1 && reviews <= 1) {
      return 'fast-track';
    } else if (commits <= 3 && reviews <= 2) {
      return 'standard-review';
    } else {
      return 'staged-merge';
    }
  }

  /**
   * Extract actual concerns from changed files
   */
  extractActualConcerns(changedFiles) {
    const concerns = new Set();

    for (const file of changedFiles) {
      const path = file.path;

      if (path.includes('/auth/') || path.includes('authentication')) {
        concerns.add('authentication');
      }
      if (path.includes('/api/') || path.includes('.graphql')) {
        concerns.add('api');
      }
      if (path.includes('/db/') || path.includes('database')) {
        concerns.add('database');
      }
      if (path.includes('/frontend/') || path.includes('client/')) {
        concerns.add('frontend');
      }
      if (path.includes('test')) {
        concerns.add('testing');
      }
      if (path.includes('/docs/')) {
        concerns.add('documentation');
      }
    }

    return Array.from(concerns);
  }

  /**
   * Generate accuracy report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalPRs: this.metrics.totalPRs,
      accuracy: {
        mergeSuccess: this.calculateAccuracy(this.metrics.mergeSuccessPredictions),
        riskLevel: this.calculateAccuracy(this.metrics.riskLevelPredictions),
        laneAssignment: this.calculateAccuracy(this.metrics.laneAssignments),
        concernClassification: this.calculateAccuracy(this.metrics.concernClassifications)
      },
      metrics: this.metrics,
      overallAccuracy: this.calculateOverallAccuracy(),
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  /**
   * Calculate accuracy percentage
   */
  calculateAccuracy(metric) {
    const total = metric.correct + metric.incorrect;
    if (total === 0) return 0;

    return {
      percentage: (metric.correct / total * 100).toFixed(1),
      correct: metric.correct,
      incorrect: metric.incorrect,
      pending: metric.pending,
      total
    };
  }

  /**
   * Calculate overall accuracy
   */
  calculateOverallAccuracy() {
    const metrics = [
      this.metrics.mergeSuccessPredictions,
      this.metrics.riskLevelPredictions,
      this.metrics.laneAssignments,
      this.metrics.concernClassifications
    ];

    let totalCorrect = 0;
    let totalIncorrect = 0;

    for (const metric of metrics) {
      totalCorrect += metric.correct;
      totalIncorrect += metric.incorrect;
    }

    const total = totalCorrect + totalIncorrect;
    if (total === 0) return 0;

    return (totalCorrect / total * 100).toFixed(1);
  }

  /**
   * Generate recommendations for improvement
   */
  generateRecommendations() {
    const recommendations = [];

    // Check merge success accuracy
    const mergeAccuracy = this.calculateAccuracy(this.metrics.mergeSuccessPredictions);
    if (parseFloat(mergeAccuracy.percentage) < 70) {
      recommendations.push({
        priority: 'high',
        area: 'merge-prediction',
        suggestion: 'Merge success prediction accuracy below 70%. Consider retraining model with recent data.',
        currentAccuracy: mergeAccuracy.percentage
      });
    }

    // Check risk level accuracy
    const riskAccuracy = this.calculateAccuracy(this.metrics.riskLevelPredictions);
    if (parseFloat(riskAccuracy.percentage) < 60) {
      recommendations.push({
        priority: 'medium',
        area: 'risk-assessment',
        suggestion: 'Risk level predictions need calibration. Review risk scoring formula.',
        currentAccuracy: riskAccuracy.percentage
      });
    }

    // Check lane assignment
    const laneAccuracy = this.calculateAccuracy(this.metrics.laneAssignments);
    if (parseFloat(laneAccuracy.percentage) < 75) {
      recommendations.push({
        priority: 'medium',
        area: 'lane-routing',
        suggestion: 'Lane assignment could be improved. Analyze misrouted PRs for pattern.',
        currentAccuracy: laneAccuracy.percentage
      });
    }

    // Overall accuracy check
    const overall = parseFloat(this.calculateOverallAccuracy());
    if (overall < 70) {
      recommendations.push({
        priority: 'critical',
        area: 'overall-system',
        suggestion: 'Overall classification accuracy below 70%. System needs retraining.',
        currentAccuracy: overall.toFixed(1)
      });
    } else if (overall > 85) {
      recommendations.push({
        priority: 'info',
        area: 'overall-system',
        suggestion: 'Classification system performing well. Continue monitoring.',
        currentAccuracy: overall.toFixed(1)
      });
    }

    return recommendations;
  }

  /**
   * Render report to console
   */
  renderReport(report) {
    console.clear();

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║          Classification Accuracy Report                      ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log(`Generated: ${report.timestamp}`);
    console.log(`Total PRs Analyzed: ${report.totalPRs}\n`);

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                  Accuracy Metrics                            ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');

    const metrics = [
      ['Merge Success Prediction', report.accuracy.mergeSuccess],
      ['Risk Level Assessment', report.accuracy.riskLevel],
      ['Lane Assignment', report.accuracy.laneAssignment],
      ['Concern Classification', report.accuracy.concernClassification]
    ];

    for (const [name, accuracy] of metrics) {
      const icon = parseFloat(accuracy.percentage) >= 75 ? '✅' : parseFloat(accuracy.percentage) >= 60 ? '⚠️' : '❌';
      console.log(`║ ${icon} ${name.padEnd(28)} ${accuracy.percentage}% (${accuracy.correct}/${accuracy.total})`.padEnd(64) + '║');
    }

    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log(`Overall System Accuracy: ${report.overallAccuracy}%\n`);

    if (report.recommendations.length > 0) {
      console.log('╔═══════════════════════════════════════════════════════════════╗');
      console.log('║                  Recommendations                             ║');
      console.log('╠═══════════════════════════════════════════════════════════════╣');

      for (const rec of report.recommendations) {
        const priorityIcon = {
          'critical': '🔴',
          'high': '🟠',
          'medium': '🟡',
          'info': '🟢'
        }[rec.priority] || '⚪';

        console.log(`║ ${priorityIcon} [${rec.area}]`.padEnd(64) + '║');
        console.log(`║   ${rec.suggestion.substring(0, 59).padEnd(59)} ║`);
        if (rec.suggestion.length > 59) {
          console.log(`║   ${rec.suggestion.substring(59).padEnd(59)} ║`);
        }
        console.log(`║   Current: ${rec.currentAccuracy}%`.padEnd(64) + '║');
        console.log('║                                                               ║');
      }

      console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    }

    // Save report to file
    const reportPath = path.join(this.repoRoot, '.repoos/reports/classification-accuracy.json');
    return { report, reportPath };
  }

  /**
   * Save report to filesystem
   */
  async saveReport(report) {
    const reportPath = path.join(this.repoRoot, '.repoos/reports/classification-accuracy.json');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📝 Report saved to: ${reportPath}\n`);
  }
}

/**
 * CLI usage
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new ClassificationAccuracyMonitor();

  const command = process.argv[2];
  const arg = process.argv[3];

  switch (command) {
    case 'analyze':
      const days = parseInt(arg) || 30;
      const report = await monitor.analyze(days);
      const { reportPath } = monitor.renderReport(report);
      await monitor.saveReport(report);
      break;

    case 'report':
      // Load latest report
      try {
        const reportPath = path.join(process.cwd(), '.repoos/reports/classification-accuracy.json');
        const data = await fs.readFile(reportPath, 'utf8');
        const report = JSON.parse(data);
        monitor.renderReport(report);
      } catch (error) {
        console.error('No report found. Run "analyze" first.');
        process.exit(1);
      }
      break;

    default:
      console.log('Classification Accuracy Monitor\n');
      console.log('Tracks prediction accuracy vs actual PR outcomes.\n');
      console.log('Usage:');
      console.log('  node monitor-classification-accuracy.mjs analyze [days]  - Analyze last N days (default: 30)');
      console.log('  node monitor-classification-accuracy.mjs report         - Show latest report\n');
      console.log('Metrics Tracked:');
      console.log('  - Merge success prediction accuracy');
      console.log('  - Risk level calibration');
      console.log('  - Lane assignment correctness');
      console.log('  - Concern classification precision\n');
      console.log('Requires:');
      console.log('  - gh CLI authenticated');
      console.log('  - PR classifications in .repoos/pr-classifications/\n');
  }
}

export default ClassificationAccuracyMonitor;
