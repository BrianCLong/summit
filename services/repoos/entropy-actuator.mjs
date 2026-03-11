#!/usr/bin/env node

/**
 * Entropy Actuator - Control-Loop Enforcement
 *
 * Executes control actions based on entropy threshold policy.
 * Transforms entropy monitoring from observation to actuation.
 *
 * Evidence Contract:
 * - Action log: artifacts/repoos/entropy-actions/actions.log
 * - Audit trail: artifacts/repoos/entropy-actions/audit.json
 */

import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';

const DEFAULT_POLICY_PATH = path.join(process.cwd(), 'config/entropy-policy.json');
const ACTIONS_DIR = path.join(process.cwd(), 'artifacts/repoos/entropy-actions');

export class EntropyActuator extends EventEmitter {
  constructor(config = {}) {
    super();

    this.policyPath = config.policyPath || DEFAULT_POLICY_PATH;
    this.actionsDir = ACTIONS_DIR;
    this.policy = null;
    this.auditTrail = [];
    this.dryRun = config.dryRun ?? false;
  }

  async initialize() {
    await fs.mkdir(this.actionsDir, { recursive: true });
    await this.loadPolicy();
  }

  async loadPolicy() {
    try {
      const policyData = await fs.readFile(this.policyPath, 'utf-8');
      this.policy = JSON.parse(policyData);

      if (this.policy.actuation?.dryRun !== undefined) {
        this.dryRun = this.policy.actuation.dryRun;
      }

      console.log(`Loaded entropy policy: ${this.policy.policyId}`);
      console.log(`Dry run mode: ${this.dryRun ? 'ENABLED' : 'DISABLED'}\n`);
    } catch (error) {
      console.error(`Failed to load policy: ${error.message}`);
      throw error;
    }
  }

  async processEntropyReport(report) {
    if (!this.policy) {
      throw new Error('Policy not loaded. Call initialize() first.');
    }

    const actions = [];

    // 1. Process velocity threshold breach
    const assessment = report.entropy.assessment;
    const thresholdActions = this.policy.thresholds[assessment]?.actions || [];

    for (const action of thresholdActions) {
      actions.push({
        trigger: 'velocity_threshold_breach',
        assessment,
        action
      });
    }

    // 2. Process acceleration detection
    if (report.entropy.acceleration) {
      actions.push({
        trigger: 'acceleration_detected',
        action: {
          type: 'escalate_monitoring',
          message: 'Entropy acceleration detected - increasing monitoring frequency'
        }
      });
    }

    // 3. Process prediction-based actions
    if (report.prediction && report.prediction.status === 'approaching') {
      const timeBand = report.prediction.timeBand;
      const confidence = report.prediction.confidence;
      const trustFactor = this.policy.prediction.confidenceThresholds[confidence]?.trustFactor || 0;

      if (trustFactor >= 0.5) {
        const predictionActions = this.policy.prediction.timeBands[timeBand]?.actions || [];

        for (const action of predictionActions) {
          actions.push({
            trigger: 'prediction_instability',
            timeBand,
            confidence,
            trustFactor,
            action
          });
        }
      }
    }

    // Execute actions
    const executedActions = [];
    for (const actionSpec of actions) {
      const result = await this.executeAction(actionSpec, report);
      executedActions.push(result);
    }

    // Audit
    if (this.policy.governance?.auditLog) {
      await this.logAuditTrail({
        timestamp: new Date().toISOString(),
        evidenceId: report.evidenceId,
        assessment: report.entropy.assessment,
        velocity: report.velocity.current,
        acceleration: report.entropy.acceleration,
        prediction: report.prediction,
        actionsExecuted: executedActions.length,
        actions: executedActions
      });
    }

    return executedActions;
  }

  async executeAction(actionSpec, report) {
    const { trigger, action } = actionSpec;
    const actionId = `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const result = {
      actionId,
      timestamp: new Date().toISOString(),
      trigger,
      type: action.type,
      dryRun: this.dryRun,
      status: 'pending',
      details: null,
      error: null
    };

    try {
      if (this.dryRun) {
        result.status = 'dry-run';
        result.details = `[DRY RUN] Would execute: ${action.type}`;
        console.log(`[DRY RUN] ${action.type}: ${action.message || JSON.stringify(action)}`);
      } else {
        // Check if action requires approval
        const requiresApproval = this.policy.governance?.requireApproval?.[action.type] ?? false;

        if (requiresApproval) {
          result.status = 'pending-approval';
          result.details = 'Action requires manual approval';
          console.log(`[APPROVAL REQUIRED] ${action.type}: ${action.message || JSON.stringify(action)}`);
        } else {
          // Execute the action
          await this._executeActionImpl(action, report);
          result.status = 'executed';
          result.details = `Executed: ${action.type}`;
          console.log(`[EXECUTED] ${action.type}: ${action.message || JSON.stringify(action)}`);
        }
      }

      this.emit('action_executed', result);
    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      console.error(`[FAILED] ${action.type}: ${error.message}`);
      this.emit('action_failed', result);
    }

    return result;
  }

  async _executeActionImpl(action, report) {
    // Stub implementations - these would integrate with actual systems
    switch (action.type) {
      case 'notify':
        // Would integrate with Slack/PagerDuty/etc
        console.log(`  → Notify ${action.target}: ${action.message}`);
        break;

      case 'page_oncall':
        // Would integrate with PagerDuty
        console.log(`  → Page ${action.target}: ${action.message}`);
        break;

      case 'flag_for_review':
        // Would create issue/ticket
        console.log(`  → Flag ${action.target} for review (priority: ${action.priority})`);
        break;

      case 'throttle_frontier':
        // Would update rate limiter configuration
        console.log(`  → Throttle frontier: max ${action.maxConcurrentBranches} concurrent branches`);
        break;

      case 'freeze_frontier':
        // Would update policy engine to block new frontiers
        console.log(`  → Freeze frontier for ${action.duration}: ${action.reason}`);
        break;

      case 'initiate_convergence':
        // Would trigger convergence workflow
        console.log(`  → Initiate ${action.mode} convergence on ${action.target}: ${action.reason}`);
        break;

      case 'create_incident':
        // Would create incident via IMS
        console.log(`  → Create ${action.severity} incident: ${action.title} (assign: ${action.assignTo})`);
        break;

      case 'escalate_monitoring':
        // Would increase monitoring frequency
        console.log(`  → Escalate monitoring: ${action.message}`);
        break;

      default:
        console.warn(`  → Unknown action type: ${action.type}`);
    }
  }

  async logAuditTrail(entry) {
    this.auditTrail.push(entry);

    const auditFile = path.join(this.actionsDir, 'audit.json');
    await fs.writeFile(auditFile, JSON.stringify(this.auditTrail, null, 2));

    // Also append to action log
    const logEntry = `${entry.timestamp} | ${entry.evidenceId} | ${entry.assessment} | ${entry.actionsExecuted} actions\n`;
    const logFile = path.join(this.actionsDir, 'actions.log');
    await fs.appendFile(logFile, logEntry);
  }

  getAuditTrail() {
    return this.auditTrail;
  }

  async printActuationReport() {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║              Entropy Actuator Report                         ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log(`Policy ID:          ${this.policy?.policyId || 'N/A'}`);
    console.log(`Dry Run Mode:       ${this.dryRun ? 'ENABLED' : 'DISABLED'}`);
    console.log(`Total Actions:      ${this.auditTrail.length}\n`);

    if (this.auditTrail.length > 0) {
      console.log('Recent Actions:');
      const recent = this.auditTrail.slice(-5);
      recent.forEach((entry, i) => {
        console.log(`  ${i + 1}. ${entry.timestamp} | ${entry.assessment} | ${entry.actionsExecuted} actions`);
      });
    }

    console.log('');
  }
}

/**
 * CLI usage
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] || 'help';

  switch (command) {
    case 'test':
      console.log('Testing entropy actuator with mock report...\n');

      const actuator = new EntropyActuator({ dryRun: true });
      await actuator.initialize();

      const mockReport = {
        evidenceId: 'entropy-test-12345',
        sourceCommit: '0000000000000000000000000000000000000000',
        sourceBranch: 'test',
        entropy: {
          current: 3.5,
          velocity: 0.015,
          acceleration: true,
          assessment: 'critical'
        },
        velocity: {
          current: 0.015,
          average: 0.012,
          confidence: 'high'
        },
        prediction: {
          status: 'approaching',
          timeBand: '<1h',
          confidence: 'high'
        }
      };

      await actuator.processEntropyReport(mockReport);
      await actuator.printActuationReport();
      break;

    case 'report':
      const reportActuator = new EntropyActuator();
      await reportActuator.initialize();
      await reportActuator.printActuationReport();
      break;

    default:
      console.log('Usage:');
      console.log('  node entropy-actuator.mjs test    - Test with mock critical report');
      console.log('  node entropy-actuator.mjs report  - Show actuation history');
      process.exit(1);
  }
}

export default EntropyActuator;
