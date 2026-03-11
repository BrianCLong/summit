#!/usr/bin/env node

/**
 * Frontier Entropy Monitor - Evidence-Hardened Version
 *
 * Tracks Shannon entropy and entropy velocity (FEV) for frontier chaos detection.
 * Emits deterministic, schema-compliant evidence artifacts.
 *
 * Theory:
 * - Shannon Entropy: H(X) = -Σ p(x) log₂ p(x)
 * - Frontier Entropy Velocity (FEV): d(Entropy)/dt
 * - Acceleration: consecutive increases in entropy velocity
 *
 * Evidence Contract:
 * - Deterministic report: artifacts/repoos/frontier-entropy/report.json
 * - Timestamp stamp: artifacts/repoos/frontier-entropy/stamp.json
 * - Schema: schemas/evidence/entropy-report.schema.json v1.0.0
 */

import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';
import { execSync } from 'child_process';
import crypto from 'crypto';

const DEFAULT_HISTORY_SIZE = 20;

const VELOCITY_THRESHOLDS = {
  stable: 0.001,
  watch: 0.005,
  warning: 0.01
};

const ACCELERATION_THRESHOLD = 3; // consecutive increases

/**
 * Entropy Velocity Tracker
 */
export class EntropyVelocityTracker {
  constructor(config = {}) {
    this.historySize = config.historySize || DEFAULT_HISTORY_SIZE;
    this.history = [];
    this.velocityHistory = [];
  }

  addSample(entropy, timestamp = Date.now()) {
    this.history.push({ entropy, timestamp });

    if (this.history.length > this.historySize) {
      this.history.shift();
    }

    if (this.history.length >= 2) {
      this._calculateVelocity();
    }
  }

  _calculateVelocity() {
    const latest = this.history[this.history.length - 1];
    const previous = this.history[this.history.length - 2];

    const deltaEntropy = latest.entropy - previous.entropy;
    const deltaTime = (latest.timestamp - previous.timestamp) / 1000;

    const velocity = deltaTime > 0 ? deltaEntropy / deltaTime : 0;

    this.velocityHistory.push({
      velocity,
      timestamp: latest.timestamp,
      deltaEntropy,
      deltaTime
    });

    if (this.velocityHistory.length > this.historySize) {
      this.velocityHistory.shift();
    }
  }

  getCurrentVelocity() {
    if (this.velocityHistory.length === 0) return null;
    return this.velocityHistory[this.velocityHistory.length - 1].velocity;
  }

  getAverageVelocity() {
    if (this.velocityHistory.length === 0) return null;

    const sum = this.velocityHistory.reduce((acc, v) => acc + Math.abs(v.velocity), 0);
    return sum / this.velocityHistory.length;
  }

  detectAcceleration(threshold = ACCELERATION_THRESHOLD) {
    if (this.velocityHistory.length < threshold) return false;

    const recent = this.velocityHistory.slice(-threshold);

    for (let i = 1; i < recent.length; i++) {
      if (Math.abs(recent[i].velocity) <= Math.abs(recent[i - 1].velocity)) {
        return false;
      }
    }

    return true;
  }

  assessVelocity() {
    const velocity = this.getCurrentVelocity();
    if (velocity === null) return 'stable';

    const absVelocity = Math.abs(velocity);

    if (absVelocity < VELOCITY_THRESHOLDS.stable) {
      return 'stable';
    } else if (absVelocity < VELOCITY_THRESHOLDS.watch) {
      return 'watch';
    } else if (absVelocity < VELOCITY_THRESHOLDS.warning) {
      return 'warning';
    } else {
      return 'critical';
    }
  }

  predictInstability(currentEntropy, instabilityThreshold = 5.0) {
    const velocity = this.getCurrentVelocity();
    const avgVelocity = this.getAverageVelocity();

    if (!velocity || avgVelocity === null || avgVelocity <= 0) {
      return null;
    }

    const remainingEntropy = instabilityThreshold - currentEntropy;
    if (remainingEntropy <= 0) {
      return {
        status: 'unstable',
        timeBand: 'unstable',
        confidence: this._calculatePredictionConfidence()
      };
    }

    const secondsToInstability = remainingEntropy / avgVelocity;
    const confidence = this._calculatePredictionConfidence();

    return {
      status: 'approaching',
      secondsToInstability: Math.round(secondsToInstability),
      timeBand: this._formatTimeBand(secondsToInstability, confidence),
      confidence
    };
  }

  _formatTimeBand(secondsToInstability, confidence) {
    // Suppress aggressive ETAs for low confidence
    if (confidence === 'low' && secondsToInstability < 3600) {
      return 'stable'; // Insufficient data for prediction
    }

    const hours = secondsToInstability / 3600;

    if (hours < 1) return '<1h';
    if (hours < 24) return '<24h';
    if (hours < 72) return '1-3d';
    return '>3d';
  }

  _calculatePredictionConfidence() {
    if (this.velocityHistory.length < 5) return 'low';

    const velocities = this.velocityHistory.map(v => Math.abs(v.velocity));
    const avg = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const variance = velocities.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / velocities.length;
    const stdDev = Math.sqrt(variance);

    const coefficientOfVariation = avg > 0 ? stdDev / avg : 1;

    if (coefficientOfVariation < 0.2) return 'high';
    if (coefficientOfVariation < 0.5) return 'medium';
    return 'low';
  }

  getMetrics() {
    return {
      current: this.getCurrentVelocity(),
      average: this.getAverageVelocity(),
      acceleration: this.detectAcceleration(),
      assessment: this.assessVelocity(),
      historySize: this.history.length,
      velocityHistorySize: this.velocityHistory.length
    };
  }

  toJSON() {
    return {
      historySize: this.historySize,
      history: this.history,
      velocityHistory: this.velocityHistory
    };
  }

  static fromJSON(data) {
    const tracker = new EntropyVelocityTracker({ historySize: data.historySize });
    tracker.history = data.history || [];
    tracker.velocityHistory = data.velocityHistory || [];
    return tracker;
  }
}

/**
 * Frontier Entropy Monitor
 */
export class FrontierEntropyMonitor extends EventEmitter {
  constructor(config = {}) {
    super();

    this.repoRoot = config.repoRoot || process.cwd();
    this.dataDir = path.join(this.repoRoot, 'artifacts/repoos/frontier-entropy');
    this.dataFile = path.join(this.dataDir, 'state.json');
    this.historySize = config.historySize || DEFAULT_HISTORY_SIZE;

    this.velocityTracker = new EntropyVelocityTracker({ historySize: this.historySize });
    this.initialized = false;
    this.lastSample = null;
    this.actuator = config.actuator || null; // Optional actuator integration
  }

  async initialize() {
    if (this.initialized) return;

    await fs.mkdir(this.dataDir, { recursive: true });
    await this.load();

    this.initialized = true;
    this.emit('initialized');
  }

  calculateEntropy(state) {
    const events = {
      patches: state.patches || 0,
      conflicts: state.conflicts || 0,
      merges: state.merges || 0,
      rollbacks: state.rollbacks || 0,
      locks: state.locks || 0,
      releases: state.releases || 0
    };

    const total = Object.values(events).reduce((sum, count) => sum + count, 0);

    if (total === 0) {
      return 0;
    }

    let entropy = 0;
    for (const count of Object.values(events)) {
      if (count > 0) {
        const probability = count / total;
        entropy -= probability * Math.log2(probability);
      }
    }

    return entropy;
  }

  async recordSample(state) {
    await this.initialize();

    const entropy = this.calculateEntropy(state);
    const timestamp = Date.now();

    this.velocityTracker.addSample(entropy, timestamp);

    const sample = {
      entropy,
      timestamp,
      state,
      velocity: this.velocityTracker.getCurrentVelocity(),
      assessment: this.velocityTracker.assessVelocity()
    };

    this.lastSample = sample;

    await this.persist();
    const artifacts = await this.generateEvidenceArtifacts();

    // Trigger actuator if configured
    if (this.actuator && artifacts?.report) {
      try {
        await this.actuator.processEntropyReport(artifacts.report);
      } catch (error) {
        console.error(`Actuator error: ${error.message}`);
      }
    }

    this.emit('sample', sample);

    return sample;
  }

  /**
   * Generate evidence artifacts (deterministic report + timestamp stamp)
   */
  async generateEvidenceArtifacts() {
    if (!this.lastSample) return null;

    const sourceCommit = this._getSourceCommit();
    const sourceBranch = this._getSourceBranch();
    const evidenceId = this._generateEvidenceId();

    const metrics = this.velocityTracker.getMetrics();
    const currentEntropy = this.lastSample.entropy;
    const prediction = this.velocityTracker.predictInstability(currentEntropy);

    // Deterministic report (no timestamps)
    const report = {
      schemaVersion: '1.0.0',
      evidenceId,
      sourceCommit,
      sourceBranch,
      entropy: {
        current: currentEntropy,
        velocity: metrics.current,
        acceleration: metrics.acceleration,
        assessment: metrics.assessment
      },
      velocity: {
        current: metrics.current,
        average: metrics.average,
        confidence: prediction?.confidence || 'low'
      },
      prediction: prediction ? {
        status: prediction.status,
        timeBand: prediction.timeBand,
        confidence: prediction.confidence
      } : null,
      assessment: {
        level: metrics.assessment,
        recommendation: this._generateRecommendation(metrics, prediction),
        controlActions: [] // Populated by actuator
      },
      thresholds: VELOCITY_THRESHOLDS,
      history: {
        samples: metrics.historySize,
        velocitySamples: metrics.velocityHistorySize,
        maxSize: this.historySize
      }
    };

    // Timestamp stamp (non-deterministic metadata)
    const stamp = {
      timestamp: new Date().toISOString(),
      generatedAt: Date.now(),
      reportId: evidenceId,
      schemaVersion: '1.0.0'
    };

    // Write artifacts
    await fs.writeFile(
      path.join(this.dataDir, 'report.json'),
      JSON.stringify(report, null, 2)
    );

    await fs.writeFile(
      path.join(this.dataDir, 'stamp.json'),
      JSON.stringify(stamp, null, 2)
    );

    return { report, stamp };
  }

  _getSourceCommit() {
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch {
      return '0000000000000000000000000000000000000000';
    }
  }

  _getSourceBranch() {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    } catch {
      return 'unknown';
    }
  }

  _generateEvidenceId() {
    const hash = crypto.createHash('sha256');
    hash.update(this._getSourceCommit());
    return `entropy-${hash.digest('hex').substring(0, 8)}`;
  }

  _generateRecommendation(metrics, prediction) {
    const assessment = metrics.assessment;

    switch (assessment) {
      case 'stable':
        return 'System stable. Continue normal operations.';

      case 'watch':
        return 'Minor fluctuations detected. Monitor for trends.';

      case 'warning':
        if (prediction && prediction.status === 'approaching' && prediction.timeBand !== 'stable') {
          return `Instability approaching (${prediction.timeBand}). Consider preemptive convergence.`;
        }
        return 'Entropy velocity elevated. Consider frontier consolidation.';

      case 'critical':
        return 'CRITICAL: Immediate intervention required. Initiate emergency convergence protocol.';

      default:
        return 'Unknown state. Manual review recommended.';
    }
  }

  async generateReport() {
    await this.initialize();

    const artifacts = await this.generateEvidenceArtifacts();
    return artifacts?.report || null;
  }

  async persist() {
    const data = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      lastSample: this.lastSample,
      velocityTracker: this.velocityTracker.toJSON()
    };

    await fs.writeFile(this.dataFile, JSON.stringify(data, null, 2));
  }

  async load() {
    try {
      const data = await fs.readFile(this.dataFile, 'utf-8');
      const parsed = JSON.parse(data);

      if (parsed.velocityTracker) {
        this.velocityTracker = EntropyVelocityTracker.fromJSON(parsed.velocityTracker);
      }

      this.lastSample = parsed.lastSample || null;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn(`Failed to load entropy data: ${error.message}`);
      }
    }
  }

  async printReport() {
    const report = await this.generateReport();
    if (!report) {
      console.log('No report available yet.\n');
      return;
    }

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║              Frontier Entropy Report                         ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log(`Evidence ID:        ${report.evidenceId}`);
    console.log(`Source Commit:      ${report.sourceCommit.substring(0, 8)}`);
    console.log(`Source Branch:      ${report.sourceBranch}`);
    console.log(`Current Entropy:    ${report.entropy.current.toFixed(4)}\n`);

    console.log('Velocity Metrics:');
    console.log(`  Current:          ${report.velocity.current !== null ? report.velocity.current.toFixed(6) : 'N/A'}`);
    console.log(`  Average:          ${report.velocity.average !== null ? report.velocity.average.toFixed(6) : 'N/A'}`);
    console.log(`  Assessment:       ${this._formatAssessment(report.entropy.assessment)}\n`);

    console.log('Acceleration:');
    console.log(`  Detected:         ${report.entropy.acceleration ? 'YES ⚠️' : 'NO'}\n`);

    if (report.prediction) {
      console.log('Prediction:');
      console.log(`  Status:           ${report.prediction.status}`);
      console.log(`  Time Band:        ${report.prediction.timeBand}`);
      console.log(`  Confidence:       ${report.prediction.confidence.toUpperCase()}\n`);
    }

    console.log('Recommendation:');
    console.log(`  ${report.assessment.recommendation}\n`);

    console.log('Artifacts:');
    console.log(`  Report:           ${path.join(this.dataDir, 'report.json')}`);
    console.log(`  Stamp:            ${path.join(this.dataDir, 'stamp.json')}`);
    console.log('');
  }

  _formatAssessment(assessment) {
    const indicators = {
      stable: '✓ STABLE',
      watch: '◉ WATCH',
      warning: '⚠ WARNING',
      critical: '⚠️ CRITICAL'
    };

    return indicators[assessment] || assessment.toUpperCase();
  }
}

/**
 * CLI usage
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] || 'report';
  const monitor = new FrontierEntropyMonitor();

  switch (command) {
    case 'report':
      await monitor.printReport();
      break;

    case 'test':
      console.log('Generating test samples...\n');

      for (let i = 0; i < 10; i++) {
        const state = {
          patches: Math.floor(Math.random() * 10) + i,
          conflicts: Math.floor(Math.random() * 5),
          merges: Math.floor(Math.random() * 8),
          rollbacks: Math.floor(Math.random() * 3),
          locks: Math.floor(Math.random() * 4),
          releases: Math.floor(Math.random() * 4)
        };

        await monitor.recordSample(state);
        console.log(`Sample ${i + 1}: Entropy = ${monitor.lastSample.entropy.toFixed(4)}`);

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('\nTest complete. Run "report" to see results.\n');
      break;

    default:
      console.log('Usage:');
      console.log('  node frontier-entropy.mjs report  - Generate comprehensive report');
      console.log('  node frontier-entropy.mjs test    - Generate test sample data');
      process.exit(1);
  }
}

export default FrontierEntropyMonitor;
