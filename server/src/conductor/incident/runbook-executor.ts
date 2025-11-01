// Operational Runbook Execution Engine
// Executes predefined operational procedures and emergency responses

import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, readFileSync } from 'fs';
import { prometheusConductorMetrics } from '../observability/prometheus';

const execAsync = promisify(exec);

export interface RunbookStep {
  id: string;
  name: string;
  type: 'command' | 'script' | 'http' | 'database' | 'validation' | 'manual';
  instruction: string;
  command?: string;
  script?: string;
  url?: string;
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  timeout: number;
  retries: number;
  condition?: string; // JavaScript expression
  onFailure?: 'abort' | 'continue' | 'retry' | 'escalate';
  requires?: string[]; // Required previous steps
  evidence?: boolean; // Collect evidence from this step
}

export interface RunbookDefinition {
  id: string;
  name: string;
  description: string;
  category: 'incident' | 'maintenance' | 'recovery' | 'deployment' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: number; // minutes
  prerequisites: string[];
  steps: RunbookStep[];
  rollback?: RunbookStep[];
  notifications: {
    onStart: string[];
    onSuccess: string[];
    onFailure: string[];
    onEscalation: string[];
  };
  approvalRequired: boolean;
  emergencyBypass: boolean;
}

export interface RunbookExecution {
  id: string;
  runbookId: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'aborted';
  startTime: number;
  endTime?: number;
  executedBy: string;
  approvedBy?: string;
  context: Record<string, any>;
  steps: Array<{
    stepId: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    startTime?: number;
    endTime?: number;
    output?: string;
    error?: string;
    evidence?: any;
    retryCount: number;
  }>;
  evidence: Record<string, any>;
  logs: Array<{
    timestamp: number;
    level: 'info' | 'warn' | 'error';
    message: string;
    data?: any;
  }>;
}

export class RunbookExecutor extends EventEmitter {
  private runbooks = new Map<string, RunbookDefinition>();
  private executions = new Map<string, RunbookExecution>();

  constructor() {
    super();
    this.loadBuiltinRunbooks();
  }

  /**
   * Execute runbook with context
   */
  async executeRunbook(
    runbookId: string,
    context: Record<string, any>,
    executedBy: string,
    approvedBy?: string,
  ): Promise<string> {
    const runbook = this.runbooks.get(runbookId);
    if (!runbook) {
      throw new Error(`Runbook not found: ${runbookId}`);
    }

    // Check approval requirements
    if (runbook.approvalRequired && !approvedBy && !runbook.emergencyBypass) {
      throw new Error('Runbook requires approval to execute');
    }

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const execution: RunbookExecution = {
      id: executionId,
      runbookId,
      status: 'pending',
      startTime: Date.now(),
      executedBy,
      approvedBy,
      context,
      steps: runbook.steps.map((step) => ({
        stepId: step.id,
        status: 'pending',
        retryCount: 0,
      })),
      evidence: {},
      logs: [],
    };

    this.executions.set(executionId, execution);

    // Start execution
    this.startExecution(execution, runbook);

    return executionId;
  }

  /**
   * Start runbook execution
   */
  private async startExecution(
    execution: RunbookExecution,
    runbook: RunbookDefinition,
  ): Promise<void> {
    execution.status = 'running';
    this.addLog(execution, 'info', `Starting runbook: ${runbook.name}`);

    // Send start notifications
    await this.sendNotifications(
      runbook.notifications.onStart,
      execution,
      runbook,
    );

    try {
      // Execute steps sequentially
      for (const step of runbook.steps) {
        const stepExecution = execution.steps.find(
          (s) => s.stepId === step.id,
        )!;

        // Check dependencies
        if (step.requires) {
          const unmetDeps = step.requires.filter((reqId) => {
            const reqStep = execution.steps.find((s) => s.stepId === reqId);
            return !reqStep || reqStep.status !== 'completed';
          });

          if (unmetDeps.length > 0) {
            this.addLog(
              execution,
              'warn',
              `Skipping step ${step.name}: unmet dependencies ${unmetDeps.join(', ')}`,
            );
            stepExecution.status = 'skipped';
            continue;
          }
        }

        // Check conditions
        if (
          step.condition &&
          !this.evaluateCondition(step.condition, execution.context)
        ) {
          this.addLog(
            execution,
            'info',
            `Skipping step ${step.name}: condition not met`,
          );
          stepExecution.status = 'skipped';
          continue;
        }

        // Execute step with retries
        const success = await this.executeStepWithRetries(
          execution,
          runbook,
          step,
        );

        if (!success) {
          if (step.onFailure === 'abort') {
            execution.status = 'failed';
            this.addLog(
              execution,
              'error',
              'Runbook aborted due to step failure',
            );
            await this.sendNotifications(
              runbook.notifications.onFailure,
              execution,
              runbook,
            );
            return;
          }

          if (step.onFailure === 'escalate') {
            await this.escalateRunbook(execution, runbook, step);
            return;
          }
        }
      }

      // Runbook completed successfully
      execution.status = 'completed';
      execution.endTime = Date.now();
      this.addLog(execution, 'info', 'Runbook completed successfully');

      await this.sendNotifications(
        runbook.notifications.onSuccess,
        execution,
        runbook,
      );
      this.emit('runbook:completed', execution);
    } catch (error) {
      execution.status = 'failed';
      execution.endTime = Date.now();
      this.addLog(execution, 'error', `Runbook failed: ${error.message}`);

      await this.sendNotifications(
        runbook.notifications.onFailure,
        execution,
        runbook,
      );
      this.emit('runbook:failed', execution);
    }

    // Record metrics
    const duration = (execution.endTime || Date.now()) - execution.startTime;
    prometheusConductorMetrics.recordOperationalEvent(
      'runbook_executed',
      execution.status === 'completed',
    );
  }

  /**
   * Execute step with retry logic
   */
  private async executeStepWithRetries(
    execution: RunbookExecution,
    runbook: RunbookDefinition,
    step: RunbookStep,
  ): Promise<boolean> {
    const stepExecution = execution.steps.find((s) => s.stepId === step.id)!;
    stepExecution.status = 'running';
    stepExecution.startTime = Date.now();

    this.addLog(execution, 'info', `Executing step: ${step.name}`);

    for (let attempt = 0; attempt <= step.retries; attempt++) {
      if (attempt > 0) {
        this.addLog(
          execution,
          'info',
          `Retrying step ${step.name} (attempt ${attempt + 1})`,
        );
        stepExecution.retryCount++;
      }

      try {
        const result = await this.executeStep(execution, step);

        stepExecution.status = 'completed';
        stepExecution.endTime = Date.now();
        stepExecution.output = result.output;

        if (step.evidence) {
          stepExecution.evidence = result.evidence;
          execution.evidence[step.id] = result.evidence;
        }

        this.addLog(execution, 'info', `Step completed: ${step.name}`);
        return true;
      } catch (error) {
        stepExecution.error = error.message;
        this.addLog(
          execution,
          'error',
          `Step failed: ${step.name} - ${error.message}`,
        );

        if (attempt === step.retries) {
          stepExecution.status = 'failed';
          stepExecution.endTime = Date.now();
          return false;
        }

        // Wait before retry
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1)),
        );
      }
    }

    return false;
  }

  /**
   * Execute individual step
   */
  private async executeStep(
    execution: RunbookExecution,
    step: RunbookStep,
  ): Promise<{ output: string; evidence?: any }> {
    const timeout = step.timeout;

    switch (step.type) {
      case 'command':
        return this.executeCommand(step, execution.context, timeout);

      case 'script':
        return this.executeScript(step, execution.context, timeout);

      case 'http':
        return this.executeHttpRequest(step, execution.context, timeout);

      case 'database':
        return this.executeDatabaseQuery(step, execution.context, timeout);

      case 'validation':
        return this.executeValidation(step, execution.context, timeout);

      case 'manual':
        return this.executeManualStep(step, execution.context);

      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  /**
   * Execute command step
   */
  private async executeCommand(
    step: RunbookStep,
    context: Record<string, any>,
    timeout: number,
  ): Promise<{ output: string; evidence?: any }> {
    if (!step.command) {
      throw new Error('Command step requires command property');
    }

    const command = this.interpolateTemplate(step.command, context);
    const { stdout, stderr } = await Promise.race([
      execAsync(command),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Command timeout')), timeout),
      ),
    ]);

    return {
      output: stdout || stderr,
      evidence: {
        command,
        stdout,
        stderr,
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Execute script step
   */
  private async executeScript(
    step: RunbookStep,
    context: Record<string, any>,
    timeout: number,
  ): Promise<{ output: string; evidence?: any }> {
    if (!step.script) {
      throw new Error('Script step requires script property');
    }

    const script = this.interpolateTemplate(step.script, context);
    const scriptFile = `/tmp/runbook_script_${Date.now()}.sh`;

    writeFileSync(scriptFile, script, { mode: 0o755 });

    try {
      const { stdout, stderr } = await Promise.race([
        execAsync(`bash ${scriptFile}`),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Script timeout')), timeout),
        ),
      ]);

      return {
        output: stdout || stderr,
        evidence: {
          script,
          stdout,
          stderr,
          timestamp: Date.now(),
        },
      };
    } finally {
      // Clean up script file
      try {
        execAsync(`rm -f ${scriptFile}`);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Execute HTTP request step
   */
  private async executeHttpRequest(
    step: RunbookStep,
    context: Record<string, any>,
    timeout: number,
  ): Promise<{ output: string; evidence?: any }> {
    if (!step.url) {
      throw new Error('HTTP step requires url property');
    }

    const url = this.interpolateTemplate(step.url, context);
    const method = step.method || 'GET';
    const headers = step.headers || {};
    const body = step.body ? JSON.stringify(step.body) : undefined;

    const response = await Promise.race([
      fetch(url, { method, headers, body }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('HTTP timeout')), timeout),
      ),
    ]);

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${responseText}`);
    }

    return {
      output: responseText,
      evidence: {
        url,
        method,
        status: response.status,
        response: responseText,
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Execute database query step
   */
  private async executeDatabaseQuery(
    step: RunbookStep,
    context: Record<string, any>,
    timeout: number,
  ): Promise<{ output: string; evidence?: any }> {
    // Placeholder for database query execution
    // Implementation would depend on database type and connection
    return {
      output: 'Database query executed',
      evidence: {
        query: step.instruction,
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Execute validation step
   */
  private async executeValidation(
    step: RunbookStep,
    context: Record<string, any>,
    timeout: number,
  ): Promise<{ output: string; evidence?: any }> {
    const validation = this.interpolateTemplate(step.instruction, context);

    // Safer validation using expression evaluator
    try {
      const result = this.evaluateCondition(validation, context);

      if (!result) {
        throw new Error('Validation failed');
      }

      return {
        output: 'Validation passed',
        evidence: {
          validation,
          result,
          timestamp: Date.now(),
        },
      };
    } catch (error) {
      throw new Error(`Validation error: ${error.message}`);
    }
  }

  /**
   * Evaluate a simple boolean expression against the provided context.
   * Supports JS boolean operators and dot-path lookups from context only.
   */
  private evaluateCondition(
    expr: string,
    context: Record<string, any>,
  ): boolean {
    // Basic guardrails against unsafe tokens
    const forbidden =
      /(process|require|global|window|this|constructor|Function|eval)/i;
    if (forbidden.test(expr)) throw new Error('Forbidden token in condition');
    // Expose context as a variable; no with(), no global access
    const fn = new Function(
      'context',
      `"use strict"; const get=(p)=>p.split('.').reduce((a,k)=>a?.[k], context);
      const ctx=context; const $=get; return !!(${expr});`,
    );
    try {
      return !!fn(context);
    } catch (e: any) {
      throw new Error(`Condition eval error: ${e.message}`);
    }
  }

  /**
   * Execute manual step (requires human intervention)
   */
  private async executeManualStep(
    step: RunbookStep,
    context: Record<string, any>,
  ): Promise<{ output: string; evidence?: any }> {
    // Manual steps are marked as completed immediately
    // In a real implementation, this would wait for human confirmation
    console.log(`MANUAL STEP: ${step.name} - ${step.instruction}`);

    return {
      output: 'Manual step acknowledged',
      evidence: {
        instruction: step.instruction,
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Load built-in runbooks
   */
  private loadBuiltinRunbooks(): void {
    // Emergency containment runbook
    this.registerRunbook({
      id: 'emergency_containment',
      name: 'Emergency System Containment',
      description:
        'Immediate containment procedures for critical security incidents',
      category: 'security',
      severity: 'critical',
      estimatedDuration: 10,
      prerequisites: ['Admin access', 'Incident confirmation'],
      approvalRequired: false,
      emergencyBypass: true,
      steps: [
        {
          id: 'enable_maintenance',
          name: 'Enable Maintenance Mode',
          type: 'command',
          instruction: 'Put system in maintenance mode',
          command:
            'redis-cli set system_maintenance "{\\"enabled\\": true, \\"timestamp\\": $(date +%s)}"',
          timeout: 10000,
          retries: 2,
          onFailure: 'continue',
          evidence: true,
        },
        {
          id: 'isolate_traffic',
          name: 'Isolate External Traffic',
          type: 'script',
          instruction: 'Block external traffic at load balancer',
          script: `#!/bin/bash
          # Update load balancer configuration
          curl -X POST "$LOAD_BALANCER_API/block-external" \\
               -H "Authorization: Bearer $LB_TOKEN" \\
               -d '{"action": "block_external", "reason": "security_incident"}'`,
          timeout: 30000,
          retries: 1,
          onFailure: 'continue',
          evidence: true,
        },
        {
          id: 'collect_logs',
          name: 'Collect Security Logs',
          type: 'command',
          instruction: 'Collect recent security logs',
          command:
            'find /var/log -name "*.log" -newer $(date -d "1 hour ago" "+%Y-%m-%d %H:%M:%S") -exec tail -100 {} \\;',
          timeout: 60000,
          retries: 1,
          onFailure: 'continue',
          evidence: true,
        },
        {
          id: 'notify_team',
          name: 'Notify Response Team',
          type: 'http',
          instruction: 'Send emergency notification',
          url: '${SLACK_WEBHOOK_URL}',
          method: 'POST',
          body: {
            text: 'EMERGENCY: System containment activated',
            channel: '#incident-response',
          },
          timeout: 10000,
          retries: 2,
          onFailure: 'continue',
        },
      ],
      notifications: {
        onStart: ['security-team@company.com'],
        onSuccess: ['security-team@company.com', 'leadership@company.com'],
        onFailure: ['security-team@company.com', 'ciso@company.com'],
        onEscalation: ['ciso@company.com', 'ceo@company.com'],
      },
    });

    // Service recovery runbook
    this.registerRunbook({
      id: 'service_recovery',
      name: 'Service Recovery and Validation',
      description: 'Standard procedure for recovering failed services',
      category: 'recovery',
      severity: 'high',
      estimatedDuration: 30,
      prerequisites: ['Service status assessment', 'Root cause analysis'],
      approvalRequired: true,
      emergencyBypass: false,
      steps: [
        {
          id: 'check_dependencies',
          name: 'Verify Dependencies',
          type: 'validation',
          instruction:
            'context.neo4j_healthy && context.redis_healthy && context.postgres_healthy',
          timeout: 30000,
          retries: 1,
          onFailure: 'abort',
        },
        {
          id: 'restart_service',
          name: 'Restart Service',
          type: 'command',
          instruction: 'Restart the failed service',
          command: 'docker compose restart ${SERVICE_NAME}',
          timeout: 120000,
          retries: 2,
          onFailure: 'escalate',
        },
        {
          id: 'validate_health',
          name: 'Validate Service Health',
          type: 'http',
          instruction: 'Check service health endpoint',
          url: 'http://${SERVICE_NAME}:${SERVICE_PORT}/health',
          method: 'GET',
          timeout: 30000,
          retries: 3,
          onFailure: 'escalate',
        },
        {
          id: 'run_smoke_tests',
          name: 'Execute Smoke Tests',
          type: 'script',
          instruction: 'Run basic functionality tests',
          script: 'npm run test:smoke',
          timeout: 300000,
          retries: 1,
          onFailure: 'escalate',
        },
      ],
      notifications: {
        onStart: ['devops-team@company.com'],
        onSuccess: ['devops-team@company.com'],
        onFailure: ['devops-team@company.com', 'engineering-leads@company.com'],
        onEscalation: ['engineering-director@company.com'],
      },
    });
  }

  /**
   * Register new runbook
   */
  registerRunbook(runbook: RunbookDefinition): void {
    this.runbooks.set(runbook.id, runbook);
  }

  /**
   * Get runbook execution status
   */
  getExecution(executionId: string): RunbookExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * List available runbooks
   */
  getRunbooks(): RunbookDefinition[] {
    return Array.from(this.runbooks.values());
  }

  /**
   * Pause running execution
   */
  pauseExecution(executionId: string): void {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === 'running') {
      execution.status = 'paused';
      this.addLog(execution, 'info', 'Execution paused');
    }
  }

  /**
   * Abort running execution
   */
  abortExecution(executionId: string): void {
    const execution = this.executions.get(executionId);
    if (
      execution &&
      (execution.status === 'running' || execution.status === 'paused')
    ) {
      execution.status = 'aborted';
      execution.endTime = Date.now();
      this.addLog(execution, 'warn', 'Execution aborted');
    }
  }

  private interpolateTemplate(
    template: string,
    context: Record<string, any>,
  ): string {
    return template.replace(/\$\{([^}]+)\}/g, (match, key) => {
      const value = context[key] || process.env[key];
      return value !== undefined ? value.toString() : match;
    });
  }

  private addLog(
    execution: RunbookExecution,
    level: 'info' | 'warn' | 'error',
    message: string,
    data?: any,
  ): void {
    execution.logs.push({
      timestamp: Date.now(),
      level,
      message,
      data,
    });
  }

  private async sendNotifications(
    recipients: string[],
    execution: RunbookExecution,
    runbook: RunbookDefinition,
  ): Promise<void> {
    // Implement notification sending logic
    console.log(`Sending notifications to: ${recipients.join(', ')}`);
  }

  private async escalateRunbook(
    execution: RunbookExecution,
    runbook: RunbookDefinition,
    failedStep: RunbookStep,
  ): Promise<void> {
    execution.status = 'failed';
    execution.endTime = Date.now();

    this.addLog(
      execution,
      'error',
      `Runbook escalated due to step failure: ${failedStep.name}`,
    );

    await this.sendNotifications(
      runbook.notifications.onEscalation,
      execution,
      runbook,
    );
    this.emit('runbook:escalated', execution);
  }
}

// Singleton instance
export const runbookExecutor = new RunbookExecutor();
