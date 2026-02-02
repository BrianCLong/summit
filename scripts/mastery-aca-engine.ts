#!/usr/bin/env ts-node
import { Command } from 'commander';

/**
 * Mastery Automated Canary Analysis (ACA) Engine
 * Compares technical metrics between Baseline and Canary subsets to calculate a Risk Score.
 */

interface MetricPoint {
    timestamp: number;
    value: number;
}

interface MetricResult {
    name: string;
    baseline: number;
    canary: number;
    diff_pct: number;
    critical: boolean;
}

const program = new Command();

program
    .name('aca-engine')
    .description('Statistical Automated Canary Analysis for IntelGraph')
    .option('--canary-p95 <ms>', 'Canary P95 latency in ms', parseFloat)
    .option('--baseline-p95 <ms>', 'Baseline P95 latency in ms', parseFloat)
    .option('--canary-error <pct>', 'Canary error rate (0.0-1.0)', parseFloat)
    .option('--baseline-error <pct>', 'Baseline error rate (0.0-1.0)', parseFloat)
    .option('--sensitivity <n>', 'Sensitivity factor (1.0-5.0)', parseFloat, 1.0)
    .action((options) => {
        const results: MetricResult[] = [];
        let riskScore = 0;

        // 1. Latency Check
        if (options.canaryP95 !== undefined && options.baselineP95 !== undefined) {
            const diff = ((options.canaryP95 - options.baselineP95) / options.baselineP95) * 100;
            const isCritical = diff > (5 * options.sensitivity); // > 5% regression is critical

            results.push({
                name: 'p95_latency_ms',
                baseline: options.baselineP95,
                canary: options.canaryP95,
                diff_pct: diff,
                critical: isCritical
            });

            if (diff > 0) riskScore += Math.min(diff * 2, 50);
        }

        // 2. Error Rate Check
        if (options.canaryError !== undefined && options.baselineError !== undefined) {
            const diff = options.canaryError - options.baselineError;
            const isCritical = diff > (0.001 * options.sensitivity); // > 0.1% absolute increase is critical

            results.push({
                name: 'error_rate',
                baseline: options.baselineError,
                canary: options.canaryError,
                diff_pct: diff * 100, // Show as percentage points if relevant
                critical: isCritical
            });

            if (diff > 0) riskScore += Math.min(diff * 5000, 50);
        }

        const decision = riskScore >= 50 ? 'ROLLBACK' : (riskScore >= 20 ? 'WARNING' : 'PROMOTE');

        console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            risk_score: Math.min(riskScore, 100),
            decision,
            metrics: results,
            summary: `ACA analysis complete. Decision: ${decision} (Risk: ${riskScore.toFixed(1)})`
        }, null, 2));

        if (decision === 'ROLLBACK') process.exit(2);
        if (decision === 'WARNING') process.exit(0); // Warning still allows promotion in permissive modes
        process.exit(0);
    });

program.parse();
