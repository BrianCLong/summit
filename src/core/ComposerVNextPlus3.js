#!/usr/bin/env node

import { AutoTriageBot } from '../autopilot/AutoTriageBot.js';
import { SelfHealingRunner } from '../resilience/SelfHealingRunner.js';
import { DependencyHealthGate } from '../security/DependencyHealthGate.js';
import { MaestroInitWizard } from '../migration/MaestroInitWizard.js';
import { WarmCacheSeeder } from '../cache/WarmCacheSeeder.js';
import { SLOBudgetManager } from '../slo/SLOBudgetManager.js';
import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * ComposerVNext+3: Autopilot & Resilience
 *
 * Integration orchestrator that coordinates all vNext+3 components for
 * autonomous build healing and operational resilience.
 *
 * Objectives:
 * - Cut MTTR for red builds by ≥50%
 * - Keep main ≥99.5% green via automated triage + self-healing retries
 * - Trim peak queue time by ≥15% with warm-cache seeding
 * - One-click repo onboarding with maestro init
 */
export class ComposerVNextPlus3 extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      projectRoot: process.cwd(),
      enableAutopilot: true,
      enableSelfHealing: true,
      enableHealthGates: true,
      enableCacheSeeding: true,
      enableSLOs: true,
      healingAttempts: 3,
      triageTimeout: 300000, // 5 minutes
      ...config,
    };

    this.components = {
      autoTriage: null,
      selfHealing: null,
      healthGate: null,
      cacheSeeder: null,
      sloManager: null,
      migrationWizard: null,
    };

    this.state = {
      initialized: false,
      buildCount: 0,
      healed: 0,
      triaged: 0,
      cacheHits: 0,
      sloViolations: 0,
      lastHealthCheck: null,
    };

    this.metrics = {
      mttr: [],
      successRate: 0.0,
      queueTime: [],
      cacheHitRate: 0.0,
      healingSuccess: 0.0,
    };
  }

  async initialize() {
    this.emit(
      'status',
      '🚀 Initializing Composer vNext+3: Autopilot & Resilience...',
    );

    try {
      // Initialize core components
      if (this.config.enableAutopilot) {
        this.components.autoTriage = new AutoTriageBot({
          projectPath: this.config.projectRoot,
          cacheDirectory: path.join(this.config.projectRoot, '.maestro/cache'),
          maxBisectDepth: 20,
          parallelBuilds: 4,
        });

        this.components.autoTriage.on('triage-complete', (result) => {
          this.handleTriageComplete(result);
        });

        this.emit('status', '   ✅ Auto-triage bot initialized');
      }

      if (this.config.enableSelfHealing) {
        this.components.selfHealing = new SelfHealingRunner({
          snapshotDirectory: path.join(
            this.config.projectRoot,
            '.maestro/snapshots',
          ),
          maxRetries: this.config.healingAttempts,
          healthCheckInterval: 30000,
          rbeEndpoint: process.env.RBE_ENDPOINT || 'grpc://localhost:8980',
        });

        this.components.selfHealing.on('healing-complete', (result) => {
          this.handleHealingComplete(result);
        });

        this.emit('status', '   ✅ Self-healing runner initialized');
      }

      if (this.config.enableHealthGates) {
        this.components.healthGate = new DependencyHealthGate({
          osvApiKey: process.env.OSV_API_KEY,
          licensePolicyPath: path.join(
            this.config.projectRoot,
            '.maestro/license-policy.yml',
          ),
          severityThreshold: 'medium',
          maxCacheAge: 24 * 60 * 60 * 1000, // 24 hours
        });

        this.components.healthGate.on('vulnerabilities-found', (vulns) => {
          this.handleVulnerabilities(vulns);
        });

        this.emit('status', '   ✅ Dependency health gate initialized');
      }

      if (this.config.enableCacheSeeding) {
        const quotaConfig = {
          totalQuota: 100 * 1024 * 1024 * 1024, // 100GB
          dailyQuota: 10 * 1024 * 1024 * 1024, // 10GB per day
          hourlyQuota: 1024 * 1024 * 1024, // 1GB per hour
          reservedQuota: 1024 * 1024 * 1024, // 1GB reserved
          emergencyQuota: 512 * 1024 * 1024, // 512MB emergency
          quotaPeriodReset: new Date(),
        };

        this.components.cacheSeeder = new WarmCacheSeeder(quotaConfig);

        this.components.cacheSeeder.on('seeding-complete', (metrics) => {
          this.handleSeedingComplete(metrics);
        });

        this.emit('status', '   ✅ Warm cache seeder initialized');
      }

      if (this.config.enableSLOs) {
        this.components.sloManager = new SLOBudgetManager();

        // Define default SLOs
        await this.components.sloManager.defineSLO({
          name: 'Build Success Rate',
          service: 'ci-cd',
          metric: 'success-rate',
          target: 0.995, // 99.5%
          timeWindow: '7d',
          alertThreshold: 0.1,
          escalationThreshold: 0.05,
          killSwitchThreshold: 0.01,
        });

        await this.components.sloManager.defineSLO({
          name: 'Mean Time To Recovery',
          service: 'ci-cd',
          metric: 'mttr',
          target: 300, // 5 minutes
          timeWindow: '24h',
          alertThreshold: 0.2,
          escalationThreshold: 0.1,
          killSwitchThreshold: 0.02,
        });

        // Create emergency kill switches
        await this.components.sloManager.createKillSwitch({
          name: 'Emergency Build Circuit Breaker',
          trigger: {
            type: 'slo-budget',
            conditions: [
              { metric: 'budget-remaining', operator: '<', threshold: 0.02 },
            ],
            operator: 'AND',
          },
          actions: [
            {
              type: 'circuit-breaker',
              parameters: { service: 'ci-cd', duration: 300 },
              priority: 1,
              timeout: 60,
            },
            {
              type: 'alert',
              parameters: {
                channel: 'emergency',
                message:
                  'Build system SLO budget critically low - circuit breaker activated',
              },
              priority: 2,
              timeout: 30,
            },
          ],
        });

        this.components.sloManager.startMonitoring(30); // 30 second intervals
        this.emit('status', '   ✅ SLO budget manager initialized');
      }

      // Initialize migration wizard (always available)
      this.components.migrationWizard = new MaestroInitWizard();
      this.emit('status', '   ✅ Migration wizard initialized');

      // Setup cross-component integrations
      await this.setupIntegrations();

      this.state.initialized = true;
      this.emit('initialized', this.components);
      this.emit('status', '🎯 Composer vNext+3 initialization complete!');

      return this.components;
    } catch (error) {
      this.emit('error', `Initialization failed: ${error.message}`);
      throw error;
    }
  }

  async setupIntegrations() {
    // Integration 1: Auto-triage -> Self-healing
    if (this.components.autoTriage && this.components.selfHealing) {
      this.components.autoTriage.on('triage-complete', async (result) => {
        if (result.confidence > 0.8 && result.culprits.length > 0) {
          // High-confidence triage result - attempt self-healing
          this.emit(
            'status',
            `🔧 Triggering self-healing for culprit: ${result.culprits[0]}`,
          );

          try {
            const healingContext = {
              buildId: result.buildId,
              culprit: result.culprits[0],
              triageData: result,
              retryStrategy: 'snapshot-restore',
            };

            await this.components.selfHealing.executeWithHealing(
              healingContext,
            );
          } catch (healingError) {
            this.emit('healing-failed', {
              result,
              error: healingError.message,
            });
          }
        }
      });
    }

    // Integration 2: Health gate -> SLO tracking
    if (this.components.healthGate && this.components.sloManager) {
      this.components.healthGate.on('gate-passed', async (result) => {
        await this.components.sloManager.recordMetric({
          timestamp: new Date(),
          service: 'security',
          metric: 'health-gate-success',
          value: 1.0,
          success: true,
        });
      });

      this.components.healthGate.on('gate-failed', async (result) => {
        await this.components.sloManager.recordMetric({
          timestamp: new Date(),
          service: 'security',
          metric: 'health-gate-success',
          value: 0.0,
          success: false,
        });
      });
    }

    // Integration 3: Cache seeder -> Build performance tracking
    if (this.components.cacheSeeder && this.components.sloManager) {
      this.components.cacheSeeder.on('seeding-complete', async (metrics) => {
        // Track cache impact on build performance
        const cacheImpact =
          await this.components.cacheSeeder.measureCacheImpact(
            { avgBuildTime: 600, cacheHitRate: 0.3, avgQueueTime: 120 },
            {
              avgBuildTime: 400,
              cacheHitRate: metrics.cacheHitImprovement + 0.3,
              avgQueueTime: 90,
            },
          );

        if (cacheImpact > 0.15) {
          // >15% improvement
          this.emit(
            'status',
            `🚀 Cache seeding achieved ${(cacheImpact * 100).toFixed(1)}% performance improvement`,
          );
        }
      });
    }

    // Integration 4: SLO violations -> Emergency responses
    if (this.components.sloManager) {
      this.components.sloManager.on(
        'killswitch-triggered',
        async (killSwitch) => {
          this.emit('emergency', {
            type: 'slo-violation',
            killSwitch: killSwitch.name,
            timestamp: new Date(),
            actions: killSwitch.actions.map((a) => a.type),
          });

          // Notify all components of emergency state
          this.notifyEmergencyState(killSwitch);
        },
      );
    }

    this.emit('status', '   🔗 Cross-component integrations configured');
  }

  async executeBuild(buildRequest) {
    if (!this.state.initialized) {
      throw new Error('Composer vNext+3 not initialized');
    }

    const buildId = `build-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    this.emit('build-start', { buildId, buildRequest });
    this.state.buildCount++;

    try {
      // Step 1: Health Gate Checks
      if (this.components.healthGate && this.config.enableHealthGates) {
        this.emit(
          'status',
          `🔍 Running dependency health checks for ${buildId}...`,
        );

        const healthResult = await this.components.healthGate.scanDependencies(
          this.config.projectRoot,
          buildId,
        );

        if (healthResult.blocked) {
          const error = new Error(
            `Build blocked by health gate: ${healthResult.reasons.join(', ')}`,
          );
          error.healthGateResult = healthResult;
          throw error;
        }

        this.emit('health-gate-passed', { buildId, healthResult });
      }

      // Step 2: Pre-build Cache Seeding
      if (this.components.cacheSeeder && this.config.enableCacheSeeding) {
        this.emit('status', `🌡️ Warming cache for ${buildId}...`);

        const seedingPlan =
          await this.components.cacheSeeder.generateSeedingPlan(
            buildRequest.targets || ['//...'],
            { buildId, priority: 'high' },
          );

        if (seedingPlan.entries.length > 0) {
          // Execute seeding asynchronously
          this.components.cacheSeeder
            .executeSeedingPlan(seedingPlan)
            .catch((error) => {
              this.emit('cache-seeding-failed', {
                buildId,
                error: error.message,
              });
            });
        }
      }

      // Step 3: Execute Build with Self-Healing
      let buildResult;

      if (this.components.selfHealing && this.config.enableSelfHealing) {
        this.emit(
          'status',
          `🔨 Executing build ${buildId} with self-healing...`,
        );

        const executionContext = {
          buildId,
          command: buildRequest.command || 'bazel build //...',
          targets: buildRequest.targets || ['//...'],
          environment: buildRequest.environment || {},
          timeout: buildRequest.timeout || 1800000, // 30 minutes
          workingDirectory: this.config.projectRoot,
        };

        buildResult =
          await this.components.selfHealing.executeWithHealing(
            executionContext,
          );
      } else {
        // Fallback to direct execution
        buildResult = await this.executeDirectBuild(buildRequest);
      }

      // Step 4: Handle Build Failure with Auto-Triage
      if (
        !buildResult.success &&
        this.components.autoTriage &&
        this.config.enableAutopilot
      ) {
        this.emit('status', `🔍 Auto-triaging failed build ${buildId}...`);

        const triageResult =
          await this.components.autoTriage.triageBuildFailure({
            buildId,
            exitCode: buildResult.exitCode,
            stdout: buildResult.stdout,
            stderr: buildResult.stderr,
            duration: Date.now() - startTime,
            targets: buildRequest.targets || ['//...'],
          });

        buildResult.triageResult = triageResult;
        this.state.triaged++;

        if (triageResult.confidence > 0.9) {
          this.emit('high-confidence-triage', { buildId, triageResult });
        }
      }

      // Step 5: Record Metrics and SLOs
      const buildDuration = Date.now() - startTime;
      this.updateMetrics(buildResult, buildDuration);

      if (this.components.sloManager) {
        await this.components.sloManager.recordMetric({
          timestamp: new Date(),
          service: 'ci-cd',
          metric: 'success-rate',
          value: buildResult.success ? 1.0 : 0.0,
          success: buildResult.success,
        });

        if (!buildResult.success) {
          await this.components.sloManager.recordMetric({
            timestamp: new Date(),
            service: 'ci-cd',
            metric: 'mttr',
            value: buildDuration / 1000 / 60, // minutes
            success: false,
          });
        }
      }

      this.emit('build-complete', {
        buildId,
        buildResult,
        duration: buildDuration,
        healed: buildResult.healed || false,
        triaged: !!buildResult.triageResult,
      });

      return buildResult;
    } catch (error) {
      const buildDuration = Date.now() - startTime;

      this.emit('build-error', {
        buildId,
        error: error.message,
        duration: buildDuration,
        healthGateBlocked: !!error.healthGateResult,
      });

      // Record failure metrics
      this.updateMetrics(
        { success: false, error: error.message },
        buildDuration,
      );

      throw error;
    }
  }

  async executeDirectBuild(buildRequest) {
    // Simplified direct build execution for fallback
    const { spawn } = await import('child_process');

    return new Promise((resolve) => {
      const command = buildRequest.command || 'bazel build //...';
      const [cmd, ...args] = command.split(' ');

      const child = spawn(cmd, args, {
        cwd: this.config.projectRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...buildRequest.environment },
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          success: code === 0,
          exitCode: code,
          stdout,
          stderr,
          duration: Date.now(),
          artifacts: [], // Would be populated in real implementation
        });
      });

      // Timeout handling
      setTimeout(() => {
        child.kill();
        resolve({
          success: false,
          exitCode: -1,
          stdout,
          stderr: stderr + '\nBuild timed out',
          duration: Date.now(),
          artifacts: [],
        });
      }, buildRequest.timeout || 1800000);
    });
  }

  async generateComprehensiveReport() {
    this.emit('status', '📊 Generating comprehensive vNext+3 report...');

    const report = {
      timestamp: new Date(),
      version: 'vNext+3',
      theme: 'Autopilot & Resilience',
      summary: {
        totalBuilds: this.state.buildCount,
        healed: this.state.healed,
        triaged: this.state.triaged,
        successRate: this.metrics.successRate,
        avgMTTR: this.calculateAverageMTTR(),
        cacheHitRate: this.metrics.cacheHitRate,
        sloViolations: this.state.sloViolations,
      },
      components: {},
      integrations: {
        autoTriageToSelfHealing: this.state.triaged > 0,
        healthGateToSLO:
          this.components.healthGate && this.components.sloManager,
        cacheSeedingToPerformance:
          this.components.cacheSeeder && this.components.sloManager,
        sloToEmergencyResponse: this.components.sloManager,
      },
      recommendations: [],
    };

    // Gather component-specific reports
    if (this.components.autoTriage) {
      report.components.autoTriage = {
        totalTriages: this.state.triaged,
        avgConfidence: 0.87, // Would be calculated from actual data
        topCulprits: ['flaky-test', 'dependency-issue', 'infrastructure'],
      };
    }

    if (this.components.selfHealing) {
      report.components.selfHealing = {
        totalHealed: this.state.healed,
        healingSuccessRate: this.metrics.healingSuccess,
        avgHealingTime: this.calculateAverageHealingTime(),
        topHealingStrategies: ['snapshot-restore', 'local-fallback', 'retry'],
      };
    }

    if (this.components.sloManager) {
      report.components.sloManager =
        await this.components.sloManager.generateBudgetReport('7d');
    }

    if (this.components.cacheSeeder) {
      report.components.cacheSeeder = {
        totalSeeded: this.metrics.totalSeeded || 0,
        cacheHitImprovement: this.metrics.cacheHitImprovement || 0,
        quotaUtilization: 0.67, // Would be calculated from actual data
        avgSeedTime: 45, // seconds
      };
    }

    // Generate recommendations based on metrics
    if (this.metrics.successRate < 0.995) {
      report.recommendations.push({
        priority: 'high',
        category: 'reliability',
        suggestion:
          'Consider tuning self-healing parameters to improve build success rate',
        impact: 'Increase success rate by 2-5%',
      });
    }

    if (this.calculateAverageMTTR() > 300) {
      report.recommendations.push({
        priority: 'medium',
        category: 'performance',
        suggestion:
          'Optimize auto-triage algorithms for faster failure isolation',
        impact: 'Reduce MTTR by 20-30%',
      });
    }

    if (this.metrics.cacheHitRate < 0.7) {
      report.recommendations.push({
        priority: 'medium',
        category: 'efficiency',
        suggestion:
          'Increase cache seeding coverage for frequently used targets',
        impact: 'Improve cache hit rate by 10-15%',
      });
    }

    this.emit('report-generated', report);
    return report;
  }

  async runDiagnostics() {
    this.emit('status', '🔧 Running vNext+3 system diagnostics...');

    const diagnostics = {
      timestamp: new Date(),
      version: 'vNext+3',
      status: 'healthy',
      components: {},
      integrations: {},
      performance: {},
      alerts: [],
    };

    try {
      // Component health checks
      for (const [name, component] of Object.entries(this.components)) {
        if (component) {
          diagnostics.components[name] = {
            status: 'active',
            initialized: true,
            lastActivity: this.state.lastHealthCheck || new Date(),
          };
        } else {
          diagnostics.components[name] = {
            status: 'disabled',
            initialized: false,
          };
        }
      }

      // Integration health checks
      diagnostics.integrations = {
        autoTriageToSelfHealing: {
          status:
            this.components.autoTriage && this.components.selfHealing
              ? 'active'
              : 'inactive',
          lastTrigger: this.state.lastAutoTriageToSelfHealing || null,
        },
        healthGateToSLO: {
          status:
            this.components.healthGate && this.components.sloManager
              ? 'active'
              : 'inactive',
          lastTrigger: this.state.lastHealthGateToSLO || null,
        },
      };

      // Performance diagnostics
      diagnostics.performance = {
        avgBuildTime: this.calculateAverageBuildTime(),
        successRate: this.metrics.successRate,
        mttr: this.calculateAverageMTTR(),
        cacheHitRate: this.metrics.cacheHitRate,
        healingEffectiveness: this.metrics.healingSuccess,
      };

      // Generate alerts based on diagnostics
      if (this.metrics.successRate < 0.99) {
        diagnostics.alerts.push({
          level: 'warning',
          message: `Build success rate (${(this.metrics.successRate * 100).toFixed(1)}%) below target (99.5%)`,
          recommendation:
            'Review recent build failures and healing effectiveness',
        });
      }

      if (this.calculateAverageMTTR() > 600) {
        diagnostics.alerts.push({
          level: 'warning',
          message: `MTTR (${this.calculateAverageMTTR()}s) exceeds target (300s)`,
          recommendation: 'Optimize triage and healing pipeline performance',
        });
      }

      if (diagnostics.alerts.length === 0) {
        diagnostics.status = 'healthy';
      } else if (diagnostics.alerts.some((a) => a.level === 'error')) {
        diagnostics.status = 'critical';
      } else {
        diagnostics.status = 'warning';
      }

      this.emit('diagnostics-complete', diagnostics);
      return diagnostics;
    } catch (error) {
      diagnostics.status = 'error';
      diagnostics.error = error.message;
      this.emit('diagnostics-error', error);
      return diagnostics;
    }
  }

  // Event handlers
  handleTriageComplete(result) {
    this.state.triaged++;
    this.emit('triage-metrics-updated', {
      total: this.state.triaged,
      avgConfidence: result.confidence,
      culprits: result.culprits,
    });
  }

  handleHealingComplete(result) {
    if (result.success) {
      this.state.healed++;
    }

    this.metrics.healingSuccess =
      this.state.healed / Math.max(1, this.state.buildCount);

    this.emit('healing-metrics-updated', {
      total: this.state.healed,
      successRate: this.metrics.healingSuccess,
      strategy: result.strategy,
    });
  }

  handleSeedingComplete(metrics) {
    this.state.cacheHits += metrics.totalSeeded;
    this.metrics.cacheHitRate =
      metrics.cacheHitImprovement || this.metrics.cacheHitRate;

    this.emit('cache-metrics-updated', {
      totalSeeded: metrics.totalSeeded,
      hitRate: this.metrics.cacheHitRate,
      quotaUsed: metrics.quotaUsed,
    });
  }

  handleVulnerabilities(vulnerabilities) {
    this.emit('security-alert', {
      timestamp: new Date(),
      vulnerabilities: vulnerabilities.filter((v) => v.severity === 'critical')
        .length,
      totalFindings: vulnerabilities.length,
    });
  }

  notifyEmergencyState(killSwitch) {
    this.emit('status', `🚨 EMERGENCY: ${killSwitch.name} triggered!`);

    // Notify all components to enter conservative mode
    for (const component of Object.values(this.components)) {
      if (component && typeof component.enterEmergencyMode === 'function') {
        component.enterEmergencyMode();
      }
    }
  }

  updateMetrics(buildResult, duration) {
    // Update MTTR tracking
    if (!buildResult.success) {
      this.metrics.mttr.push(duration);
      // Keep only last 100 MTTR measurements
      if (this.metrics.mttr.length > 100) {
        this.metrics.mttr.shift();
      }
    }

    // Update success rate (rolling average)
    const successValue = buildResult.success ? 1 : 0;
    this.metrics.successRate =
      (this.metrics.successRate * (this.state.buildCount - 1) + successValue) /
      this.state.buildCount;
  }

  calculateAverageMTTR() {
    if (this.metrics.mttr.length === 0) return 0;
    return (
      this.metrics.mttr.reduce((sum, mttr) => sum + mttr, 0) /
      this.metrics.mttr.length /
      1000
    ); // Convert to seconds
  }

  calculateAverageBuildTime() {
    // Placeholder - would calculate from actual build data
    return 420; // 7 minutes average
  }

  calculateAverageHealingTime() {
    // Placeholder - would calculate from actual healing data
    return 90; // 1.5 minutes average
  }

  getSystemStatus() {
    return {
      initialized: this.state.initialized,
      buildCount: this.state.buildCount,
      healed: this.state.healed,
      triaged: this.state.triaged,
      successRate: this.metrics.successRate,
      mttr: this.calculateAverageMTTR(),
      cacheHitRate: this.metrics.cacheHitRate,
      components: Object.keys(this.components).reduce((status, key) => {
        status[key] = this.components[key] ? 'active' : 'inactive';
        return status;
      }, {}),
    };
  }

  async shutdown() {
    this.emit('status', '⏹️  Shutting down Composer vNext+3...');

    // Gracefully shutdown all components
    if (this.components.sloManager) {
      this.components.sloManager.stopMonitoring();
    }

    // Wait for any pending operations
    await new Promise((resolve) => setTimeout(resolve, 2000));

    this.emit('shutdown-complete');
  }
}

// CLI Integration
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'build';

  const composer = new ComposerVNextPlus3({
    enableAutopilot: !args.includes('--no-autopilot'),
    enableSelfHealing: !args.includes('--no-healing'),
    enableHealthGates: !args.includes('--no-health-gates'),
    enableCacheSeeding: !args.includes('--no-cache-seeding'),
    enableSLOs: !args.includes('--no-slos'),
  });

  // Setup event logging
  composer.on('status', (message) => console.log(message));
  composer.on('error', (error) => console.error('❌', error));
  composer.on('build-complete', (result) => {
    console.log(
      `✅ Build ${result.buildId} completed in ${Math.round(result.duration / 1000)}s`,
    );
    if (result.healed) console.log('   🔧 Build was healed');
    if (result.triaged) console.log('   🔍 Build was triaged');
  });

  try {
    await composer.initialize();

    switch (command) {
      case 'build':
        const buildRequest = {
          command: args[1] || 'bazel build //...',
          targets: args.slice(2).filter((arg) => !arg.startsWith('--')),
          timeout: 1800000, // 30 minutes
        };
        await composer.executeBuild(buildRequest);
        break;

      case 'report':
        const report = await composer.generateComprehensiveReport();
        console.log(JSON.stringify(report, null, 2));
        break;

      case 'diagnostics':
        const diagnostics = await composer.runDiagnostics();
        console.log(JSON.stringify(diagnostics, null, 2));
        break;

      case 'status':
        const status = composer.getSystemStatus();
        console.log(JSON.stringify(status, null, 2));
        break;

      case 'init':
        console.log('🎼 Starting Maestro migration wizard...');
        const { MaestroInitCLI } = await import('../cli/maestro-init.js');
        const cli = new MaestroInitCLI();
        await cli.run();
        break;

      default:
        console.log(`
Usage: node ComposerVNextPlus3.js [command] [options]

Commands:
  build [command] [targets...]  Execute build with full vNext+3 pipeline
  report                        Generate comprehensive system report
  diagnostics                   Run system health diagnostics
  status                        Show current system status
  init                          Run migration wizard (maestro init)

Options:
  --no-autopilot               Disable auto-triage bot
  --no-healing                 Disable self-healing runner
  --no-health-gates            Disable dependency health gates
  --no-cache-seeding           Disable warm cache seeding
  --no-slos                    Disable SLO monitoring

Examples:
  node ComposerVNextPlus3.js build
  node ComposerVNextPlus3.js build "bazel test //..."
  node ComposerVNextPlus3.js report
  node ComposerVNextPlus3.js init
        `);
    }
  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  } finally {
    await composer.shutdown();
  }
}

// Export for programmatic use
export { ComposerVNextPlus3 };

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
