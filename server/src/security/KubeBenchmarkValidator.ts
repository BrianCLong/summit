import { spawn } from 'child_process';
import { Logger } from 'pino';
import logger from '../utils/logger.js';
import { z } from 'zod/v4';

export interface BenchmarkResult {
  tool: 'kube-bench' | 'kubescape';
  framework: string;
  timestamp: Date;
  status: 'pass' | 'fail' | 'partial';
  score: number;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  items: BenchmarkItem[];
  rawOutput?: any;
}

export interface BenchmarkItem {
  id: string;
  description: string;
  status: 'pass' | 'fail' | 'warn' | 'info';
  remediation?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export class KubeBenchmarkValidator {
  private logger: Logger;

  constructor() {
    this.logger = logger.child({ component: 'KubeBenchmarkValidator' });
  }

  /**
   * Run CIS Benchmark using kube-bench
   */
  async runCisBenchmark(): Promise<BenchmarkResult> {
    this.logger.info('Starting CIS Benchmark (kube-bench)...');
    try {
      // Try to run kube-bench
      // Note: In a real env, this might need to run as a Job or DaemonSet.
      // Here we assume the CLI is available or we simulate it.
      const output = await this.executeCommand('kube-bench', ['--json']);
      return this.parseKubeBenchOutput(output);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        this.logger.warn('kube-bench not found, using simulated results for development');
        return this.getSimulatedCisResult();
      }
      this.logger.error({ err: error }, 'Failed to run kube-bench');
      throw error;
    }
  }

  /**
   * Run NSA Benchmark using kubescape
   */
  async runNsaBenchmark(): Promise<BenchmarkResult> {
    this.logger.info('Starting NSA Benchmark (kubescape)...');
    try {
      const output = await this.executeCommand('kubescape', ['scan', 'framework', 'nsa', '--format', 'json']);
      return this.parseKubescapeOutput(output);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        this.logger.warn('kubescape not found, using simulated results for development');
        return this.getSimulatedNsaResult();
      }
      this.logger.error({ err: error }, 'Failed to run kubescape');
      throw error;
    }
  }

  private executeCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args);
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          // kubescape might return non-zero exit code on failures, which is valid for a scan
          // But usually we check if stdout has JSON
          if (stdout.length > 0) {
             resolve(stdout);
             return;
          }
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        } else {
          resolve(stdout);
        }
      });

      child.on('error', (err) => {
        reject(err);
      });
    });
  }

  private parseKubeBenchOutput(jsonOutput: string): BenchmarkResult {
    try {
      const data = JSON.parse(jsonOutput);
      // kube-bench JSON structure varies, but typically has "Controls" array

      let total = 0;
      let passed = 0;
      let failed = 0;
      const items: BenchmarkItem[] = [];

      // Simplified parsing logic for kube-bench structure
      const controls = data.Controls || [];
      for (const control of controls) {
        for (const test of (control.tests || [])) {
          for (const result of (test.results || [])) {
             total++;
             const status = result.status.toLowerCase() === 'pass' ? 'pass' : 'fail';
             if (status === 'pass') passed++; else failed++;

             items.push({
               id: result.test_number,
               description: result.test_desc,
               status: status,
               remediation: result.remediation,
               severity: result.scored ? 'high' : 'low' // Simplified mapping
             });
          }
        }
      }

      return {
        tool: 'kube-bench',
        framework: 'CIS Benchmark',
        timestamp: new Date(),
        status: failed === 0 ? 'pass' : 'fail',
        score: total > 0 ? (passed / total) * 100 : 0,
        totalChecks: total,
        passedChecks: passed,
        failedChecks: failed,
        items: items,
        rawOutput: data
      };

    } catch (e) {
      this.logger.error('Failed to parse kube-bench output', e);
      throw new Error('Invalid kube-bench output format');
    }
  }

  private parseKubescapeOutput(jsonOutput: string): BenchmarkResult {
    try {
      const data = JSON.parse(jsonOutput);
      // Kubescape JSON structure

      const items: BenchmarkItem[] = [];
      let total = 0;
      let passed = 0;
      let failed = 0;

      // Kubescape structure: results inside 'results' or 'controls'
      // This is a simplified parser based on typical output
      const results = data.results || [];

      for (const res of results) {
         // Assuming resource-based results
         for (const control of (res.controls || [])) {
             total++;
             const status = control.status.status.toLowerCase() === 'passed' ? 'pass' : 'fail';
             if (status === 'pass') passed++; else failed++;

             items.push({
               id: control.controlID,
               description: control.name,
               status: status,
               remediation: 'See Kubescape docs', // usually in control object
               severity: 'medium' // Simplified
             });
         }
      }

      // Check if top-level 'controls' exists (another format)
      if (total === 0 && data.controls) {
          for (const control of data.controls) {
              total++;
              // Logic depends on version
          }
      }

      return {
        tool: 'kubescape',
        framework: 'NSA/CISA',
        timestamp: new Date(),
        status: failed === 0 ? 'pass' : 'fail',
        score: total > 0 ? (passed / total) * 100 : 0,
        totalChecks: total,
        passedChecks: passed,
        failedChecks: failed,
        items: items,
        rawOutput: data
      };
    } catch (e) {
      this.logger.error('Failed to parse kubescape output', e);
      throw new Error('Invalid kubescape output format');
    }
  }

  // Simulation Data for Development/Mocking
  private getSimulatedCisResult(): BenchmarkResult {
    const items: BenchmarkItem[] = [
      { id: '1.1.1', description: 'Ensure that the API server pod specification file permissions are set to 644 or more restrictive', status: 'pass', severity: 'high' },
      { id: '1.1.2', description: 'Ensure that the API server pod specification file ownership is set to root:root', status: 'pass', severity: 'high' },
      { id: '1.2.1', description: 'Ensure that the --anonymous-auth argument is set to false', status: 'fail', remediation: 'Set --anonymous-auth=false in kube-apiserver yaml', severity: 'critical' },
      { id: '1.2.2', description: 'Ensure that the --basic-auth-file argument is not set', status: 'pass', severity: 'medium' }
    ];

    return {
      tool: 'kube-bench',
      framework: 'CIS Benchmark',
      timestamp: new Date(),
      status: 'fail',
      score: 75,
      totalChecks: 4,
      passedChecks: 3,
      failedChecks: 1,
      items: items
    };
  }

  private getSimulatedNsaResult(): BenchmarkResult {
    const items: BenchmarkItem[] = [
      { id: 'C-0001', description: 'Non-root containers', status: 'pass', severity: 'medium' },
      { id: 'C-0002', description: 'Immutable container file systems', status: 'fail', remediation: 'Set readOnlyRootFilesystem: true', severity: 'high' },
      { id: 'C-0004', description: 'Prevent privilege escalation', status: 'pass', severity: 'high' },
      { id: 'C-0009', description: 'Disable potentially dangerous capabilities', status: 'pass', severity: 'medium' }
    ];

    return {
      tool: 'kubescape',
      framework: 'NSA/CISA',
      timestamp: new Date(),
      status: 'fail',
      score: 75,
      totalChecks: 4,
      passedChecks: 3,
      failedChecks: 1,
      items: items
    };
  }
}

export const kubeBenchmarkValidator = new KubeBenchmarkValidator();
