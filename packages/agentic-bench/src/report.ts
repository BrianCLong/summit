// @ts-nocheck
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare function require(name: string): any;
const fs = require('fs');
const path = require('path');
import { AgentTrajectory } from '@intelgraph/agentic-trajectories';
import { AgenticTask } from './task.js';

export interface BenchResult {
    task: AgenticTask;
    pass: boolean;
    validation: { valid: boolean; errors: string[] };
    notes: string[];
    trajectory?: AgentTrajectory;
}

export interface BenchReport {
    generatedAt: string;
    results: BenchResult[];
    metrics: {
        total: number;
        passed: number;
        reflectionRate: number;
        averageToolCalls: number;
    };
}

function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function renderMarkdown(report: BenchReport): string {
    const lines = [
        '# Agentic Bench Report',
        `Generated: ${report.generatedAt}`,
        '',
        `Total: ${report.metrics.total}, Passed: ${report.metrics.passed}`,
        `Reflection rate: ${(report.metrics.reflectionRate * 100).toFixed(0)}%`,
        `Average tool calls: ${report.metrics.averageToolCalls.toFixed(2)}`,
        '',
        '| Task | Type | Pass | Notes |',
        '| --- | --- | --- | --- |'
    ];
    for (const result of report.results) {
        lines.push(
            `| ${result.task.name} | ${result.task.type} | ${result.pass ? '✅' : '❌'} | ${result.notes.join('; ')} |`
        );
    }
    return lines.join('\n');
}

export function writeReport(report: BenchReport, artifactRoot: string) {
    const timestamp = new Date(report.generatedAt).toISOString().replace(/[-:]/g, '').split('.')[0];
    const dir = path.join(artifactRoot, timestamp);
    ensureDir(dir);
    fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(dir, 'report.md'), renderMarkdown(report));
    return dir;
}
/// <reference types="node" />
// @ts-nocheck
