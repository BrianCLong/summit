/**
 * Ghost Analyst - Automated workflow driver for IntelGraph API testing
 */

import axios, { AxiosInstance } from 'axios';
import { WebSocket } from 'ws';
import { SafetyGuard } from '../utils/safety.js';
import type {
  AnalystOptions,
  AnalystSession,
  AssertionResult,
  RunOptions,
  SessionMetrics,
  StepResult,
  WorkflowScript,
  WorkflowStep,
} from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

export class GhostAnalyst {
  private apiUrl: string;
  private wsUrl?: string;
  private token?: string;
  private tenantId: string;
  private script: WorkflowScript;
  private timeout: number;
  private verbose: boolean;
  private safetyGuard: SafetyGuard;
  private httpClient: AxiosInstance;
  private context: Map<string, any>;

  constructor(options: AnalystOptions) {
    this.apiUrl = options.apiUrl;
    this.wsUrl = options.wsUrl;
    this.token = options.token;
    this.tenantId = options.tenantId;
    this.timeout = options.timeout || 300000; // 5 minutes default
    this.verbose = options.verbose || false;

    this.script =
      typeof options.script === 'string'
        ? this.loadScript(options.script)
        : options.script;

    this.context = new Map();

    // Safety checks
    this.safetyGuard = new SafetyGuard({
      requireTestPrefix: true,
      blockProductionUrls: true,
      maxDataSize: 10000,
    });

    this.safetyGuard.validateApiUrl(this.apiUrl);
    this.safetyGuard.validateTenantId(this.tenantId);

    // Setup HTTP client
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        'X-Tenant-ID': this.tenantId,
        'X-Sim-Harness': 'true',
      },
    });
  }

  /**
   * Run the analyst workflow
   */
  async run(options: RunOptions = {}): Promise<AnalystSession> {
    const sessionId = `session-${uuidv4()}`;
    const startTime = new Date().toISOString();

    this.log(`Starting session ${sessionId} with workflow: ${this.script.name}`);

    // Initialize context
    if (options.scenario) {
      this.context.set('scenario', options.scenario);
    }
    if (options.context) {
      for (const [key, value] of Object.entries(options.context)) {
        this.context.set(key, value);
      }
    }

    const session: AnalystSession = {
      id: sessionId,
      scenarioId: options.scenarioId || 'unknown',
      workflowName: this.script.name,
      startTime,
      status: 'running',
      steps: [],
      metrics: this.initializeMetrics(),
      errors: [],
    };

    try {
      // Execute each step
      for (const step of this.script.steps) {
        const stepResult = await this.executeStep(step, session);
        session.steps.push(stepResult);

        if (stepResult.status === 'failed') {
          session.status = 'failed';
          session.errors.push(`Step '${step.name}' failed: ${stepResult.error}`);

          if (!this.shouldContinueOnError(step)) {
            break;
          }
        }
      }

      // Mark as completed if no failures
      if (session.status === 'running') {
        session.status = 'completed';
      }
    } catch (error) {
      session.status = 'failed';
      session.errors.push((error as Error).message);
      this.log(`Session failed: ${(error as Error).message}`, 'error');
    }

    session.endTime = new Date().toISOString();
    session.metrics.totalDuration =
      new Date(session.endTime).getTime() - new Date(startTime).getTime();

    this.log(`Session ${sessionId} ${session.status}`, session.status === 'completed' ? 'success' : 'error');

    return session;
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(
    step: WorkflowStep,
    session: AnalystSession,
  ): Promise<StepResult> {
    const startTime = new Date().toISOString();
    this.log(`Executing step: ${step.name}`, 'info');

    const result: StepResult = {
      name: step.name,
      status: 'running',
      startTime,
    };

    try {
      switch (step.action) {
        case 'graphql-query':
        case 'graphql-mutation':
          result.result = await this.executeGraphQL(step);
          break;

        case 'rest-get':
        case 'rest-post':
          result.result = await this.executeREST(step);
          break;

        case 'poll':
          result.result = await this.executePoll(step);
          break;

        case 'wait':
          await this.executeWait(step);
          result.result = { waited: step.delay };
          break;

        case 'assert':
          result.result = await this.executeAssert(step);
          break;

        default:
          throw new Error(`Unknown action: ${step.action}`);
      }

      // Run assertions if defined
      if (step.assertions && step.assertions.length > 0) {
        result.assertions = await this.runAssertions(
          step.assertions,
          result.result,
        );

        const failedAssertions = result.assertions.filter((a) => !a.passed);
        if (failedAssertions.length > 0) {
          throw new Error(
            `Assertions failed: ${failedAssertions.map((a) => a.expression).join(', ')}`,
          );
        }
      }

      result.status = 'success';
      result.endTime = new Date().toISOString();
      result.duration =
        new Date(result.endTime).getTime() - new Date(startTime).getTime();

      // Update metrics
      session.metrics.queriesIssued++;
      session.metrics.queryLatency.samples.push(result.duration);

      // Store result in context
      this.context.set(`steps.${step.name}`, result);

      this.log(`Step ${step.name} completed in ${result.duration}ms`, 'success');
    } catch (error) {
      result.status = 'failed';
      result.error = (error as Error).message;
      result.endTime = new Date().toISOString();
      result.duration =
        new Date(result.endTime).getTime() - new Date(startTime).getTime();

      session.metrics.errorCount++;

      this.log(`Step ${step.name} failed: ${result.error}`, 'error');
    }

    return result;
  }

  /**
   * Execute GraphQL query/mutation
   */
  private async executeGraphQL(step: WorkflowStep): Promise<any> {
    if (!step.query) {
      throw new Error('GraphQL step requires query');
    }

    // Safety check
    this.safetyGuard.validateQuery(step.query);

    // Resolve variables
    const variables = this.resolveVariables(step.variables || {});

    const response = await this.httpClient.post(this.apiUrl, {
      query: step.query,
      variables,
    });

    if (response.data.errors) {
      throw new Error(
        `GraphQL Error: ${JSON.stringify(response.data.errors)}`,
      );
    }

    // Extract entities and relationships for metrics
    const data = response.data.data;
    this.updateMetricsFromResponse(data);

    return data;
  }

  /**
   * Execute REST API call
   */
  private async executeREST(step: WorkflowStep): Promise<any> {
    if (!step.endpoint) {
      throw new Error('REST step requires endpoint');
    }

    const url = this.resolveTemplate(step.endpoint);
    const method = step.action === 'rest-get' ? 'GET' : 'POST';

    const config: any = { method, url };

    if (step.body) {
      config.data = this.resolveVariables(step.body);
    }

    const response = await this.httpClient.request(config);
    return response.data;
  }

  /**
   * Execute polling operation
   */
  private async executePoll(step: WorkflowStep): Promise<any> {
    if (!step.endpoint || !step.until) {
      throw new Error('Poll step requires endpoint and until condition');
    }

    const timeout = step.timeout || 60000;
    const interval = step.interval || 1000;
    const startTime = Date.now();

    const url = this.resolveTemplate(step.endpoint);

    while (Date.now() - startTime < timeout) {
      const response = await this.httpClient.get(url);
      const data = response.data;

      // Evaluate until condition
      if (this.evaluateCondition(step.until, data)) {
        return data;
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(`Poll timeout after ${timeout}ms`);
  }

  /**
   * Execute wait operation
   */
  private async executeWait(step: WorkflowStep): Promise<void> {
    const delay = step.delay || 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Execute assert operation
   */
  private async executeAssert(step: WorkflowStep): Promise<any> {
    if (!step.assertions || step.assertions.length === 0) {
      throw new Error('Assert step requires assertions');
    }

    const results = await this.runAssertions(step.assertions, this.context);

    const failedAssertions = results.filter((a) => !a.passed);
    if (failedAssertions.length > 0) {
      throw new Error(
        `Assertions failed: ${failedAssertions.map((a) => a.expression).join(', ')}`,
      );
    }

    return { assertions: results };
  }

  /**
   * Run assertions on data
   */
  private async runAssertions(
    assertions: string[],
    data: any,
  ): Promise<AssertionResult[]> {
    const results: AssertionResult[] = [];

    for (const assertion of assertions) {
      try {
        const passed = this.evaluateCondition(assertion, data);
        results.push({
          expression: assertion,
          passed,
          actual: data,
        });
      } catch (error) {
        results.push({
          expression: assertion,
          passed: false,
          actual: data,
          expected: 'valid evaluation',
        });
      }
    }

    return results;
  }

  /**
   * Evaluate condition expression
   */
  private evaluateCondition(expression: string, data: any): boolean {
    try {
      // Simple expression evaluation
      // In production, use a safe expression evaluator library

      // Handle common patterns
      if (expression.includes('==')) {
        const [left, right] = expression.split('==').map((s) => s.trim());
        const leftVal = this.resolvePath(left, data);
        const rightVal = this.resolveTemplate(right);
        return leftVal == rightVal;
      }

      if (expression.includes('>=')) {
        const [left, right] = expression.split('>=').map((s) => s.trim());
        const leftVal = this.resolvePath(left, data);
        const rightVal = parseFloat(right);
        return leftVal >= rightVal;
      }

      if (expression.includes('<=')) {
        const [left, right] = expression.split('<=').map((s) => s.trim());
        const leftVal = this.resolvePath(left, data);
        const rightVal = parseFloat(right);
        return leftVal <= rightVal;
      }

      // Default: check if path exists and is truthy
      return !!this.resolvePath(expression, data);
    } catch (error) {
      return false;
    }
  }

  /**
   * Resolve path in object (e.g., "user.name")
   */
  private resolvePath(path: string, data: any): any {
    const parts = path.split('.');
    let current = data;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Resolve template variables (e.g., "{{scenario.id}}")
   */
  private resolveTemplate(template: string): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.resolvePath(path.trim(), Object.fromEntries(this.context));
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Resolve variables object
   */
  private resolveVariables(variables: Record<string, any>): Record<string, any> {
    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(variables)) {
      if (typeof value === 'string') {
        resolved[key] = this.resolveTemplate(value);
      } else if (typeof value === 'object' && value !== null) {
        resolved[key] = this.resolveVariables(value);
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * Update metrics from GraphQL response
   */
  private updateMetricsFromResponse(data: any): void {
    // Count entities
    if (data.entities && Array.isArray(data.entities)) {
      this.context.set('entitiesFound', (this.context.get('entitiesFound') || 0) + data.entities.length);
    }

    // Count relationships
    if (data.relationships && Array.isArray(data.relationships)) {
      this.context.set('relationshipsFound', (this.context.get('relationshipsFound') || 0) + data.relationships.length);
    }

    // Check for insights (first meaningful result)
    if (!this.context.has('timeToFirstInsight')) {
      if (
        (data.entities && data.entities.length > 0) ||
        (data.relationships && data.relationships.length > 0) ||
        (data.copilotRun && data.copilotRun.status === 'COMPLETED')
      ) {
        this.context.set('timeToFirstInsight', Date.now());
      }
    }
  }

  /**
   * Should continue execution on error
   */
  private shouldContinueOnError(step: WorkflowStep): boolean {
    // Could be extended with step-level configuration
    return false;
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): SessionMetrics {
    return {
      totalDuration: 0,
      queriesIssued: 0,
      entitiesFound: 0,
      relationshipsFound: 0,
      queryLatency: {
        min: 0,
        max: 0,
        mean: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        samples: [],
      },
      errorCount: 0,
      retryCount: 0,
    };
  }

  /**
   * Load workflow script from file
   */
  private loadScript(path: string): WorkflowScript {
    // In real implementation, load from file system
    // For now, throw error
    throw new Error('Loading scripts from file not yet implemented');
  }

  /**
   * Log message
   */
  private log(message: string, level: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
    if (!this.verbose && level === 'info') {
      return;
    }

    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m',
    };
    const reset = '\x1b[0m';

    console.log(`${colors[level]}[GhostAnalyst] ${message}${reset}`);
  }
}
