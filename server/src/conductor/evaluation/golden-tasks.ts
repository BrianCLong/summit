// Golden Task Evaluation Harness
// Continuous quality gates with regression detection and CI integration

import { EventEmitter } from 'events';
import { ExpertArm } from '../learn/bandit';
import { adaptiveExpertRouter } from '../router/router-v2';
import { prometheusConductorMetrics } from '../observability/prometheus';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { spawn } from 'child_process';
import * as path from 'path';

export interface GoldenTask {
  id: string;
  name: string;
  category:
    | 'graph_ops'
    | 'rag_retrieval'
    | 'osint_analysis'
    | 'export_generation'
    | 'files_management'
    | 'general_llm';
  description: string;
  input: {
    query: string;
    context: {
      domain?: string;
      sensitivity?: 'public' | 'internal' | 'confidential' | 'secret';
      tenant: string;
      expectedTokens?: number;
    };
    parameters?: Record<string, any>;
  };
  expectedOutput?: {
    format: 'json' | 'text' | 'markdown' | 'csv';
    schema?: any;
    contains?: string[];
    excludes?: string[];
    minLength?: number;
    maxLength?: number;
  };
  scoring: {
    method:
      | 'exact_match'
      | 'semantic_similarity'
      | 'regex_match'
      | 'json_schema'
      | 'custom_hook'
      | 'llm_judge';
    weight: number;
    passThreshold: number;
    target?: any;
    customHook?: string; // Function name or script path
    judgePrompt?: string; // For LLM judge scoring
  };
  metadata: {
    createdBy: string;
    createdAt: number;
    lastUpdated: number;
    tags: string[];
    difficulty: 'easy' | 'medium' | 'hard';
    estimatedDuration: number; // seconds
    tenantLabels: string[]; // For tenant-specific regression tracking
  };
}

export interface EvaluationRun {
  id: string;
  timestamp: number;
  gitCommit?: string;
  branch?: string;
  prNumber?: number;
  config: {
    taskFilter?: string[];
    tenantFilter?: string[];
    parallel: boolean;
    maxConcurrency: number;
    timeoutMs: number;
  };
  results: TaskResult[];
  summary: {
    totalTasks: number;
    passed: number;
    failed: number;
    skipped: number;
    avgScore: number;
    avgDuration: number;
    regressionDetected: boolean;
    qualityGate: 'pass' | 'fail' | 'warning';
  };
  regressions?: RegressionAnalysis[];
  duration: number;
  environment: string;
}

export interface TaskResult {
  taskId: string;
  status: 'passed' | 'failed' | 'skipped' | 'error';
  score: number;
  duration: number;
  expert: ExpertArm;
  actualOutput: any;
  expectedOutput: any;
  scoringDetails: {
    method: string;
    rawScore: number;
    normalizedScore: number;
    feedback?: string;
  };
  error?: string;
  metadata: {
    tenant: string;
    category: string;
    difficulty: string;
  };
}

export interface RegressionAnalysis {
  tenant: string;
  category: string;
  currentScore: number;
  baselineScore: number;
  scoreDrop: number;
  significantRegression: boolean;
  affectedTasks: string[];
}

export interface QualityTrend {
  timestamp: number;
  overallScore: number;
  categoryScores: Record<string, number>;
  tenantScores: Record<string, number>;
  regressionCount: number;
  passRate: number;
}

/**
 * Golden Task Suite Manager
 */
export class GoldenTaskSuite {
  private tasks: Map<string, GoldenTask> = new Map();
  private baselines: Map<string, number> = new Map(); // task -> baseline score
  private qualityHistory: QualityTrend[] = [];
  private readonly maxHistorySize = 1000;

  constructor() {
    this.loadBuiltinTasks();
    this.loadBaselines();
  }

  /**
   * Add golden task to suite
   */
  addTask(task: GoldenTask): void {
    this.tasks.set(task.id, task);
    this.persistTasks();
  }

  /**
   * Get task by ID
   */
  getTask(id: string): GoldenTask | undefined {
    return this.tasks.get(id);
  }

  /**
   * Get all tasks, optionally filtered
   */
  getTasks(filter?: {
    category?: string[];
    tenant?: string[];
    difficulty?: string[];
    tags?: string[];
  }): GoldenTask[] {
    let tasks = Array.from(this.tasks.values());

    if (filter) {
      if (filter.category) {
        tasks = tasks.filter((t) => filter.category!.includes(t.category));
      }
      if (filter.tenant) {
        tasks = tasks.filter((t) =>
          t.metadata.tenantLabels.some((l) => filter.tenant!.includes(l)),
        );
      }
      if (filter.difficulty) {
        tasks = tasks.filter((t) =>
          filter.difficulty!.includes(t.metadata.difficulty),
        );
      }
      if (filter.tags) {
        tasks = tasks.filter((t) =>
          filter.tags!.some((tag) => t.metadata.tags.includes(tag)),
        );
      }
    }

    return tasks;
  }

  /**
   * Load built-in golden tasks
   */
  private loadBuiltinTasks(): void {
    // Graph Operations Tasks
    this.addTask({
      id: 'graph_basic_query',
      name: 'Basic Graph Query',
      category: 'graph_ops',
      description: 'Test basic graph traversal and entity relationships',
      input: {
        query:
          'Find all connections between Person:Alice and Organization:TechCorp',
        context: {
          domain: 'graph',
          tenant: 'default',
          sensitivity: 'internal',
        },
      },
      expectedOutput: {
        format: 'json',
        contains: ['Person', 'Organization', 'relationships'],
        minLength: 100,
      },
      scoring: {
        method: 'json_schema',
        weight: 1.0,
        passThreshold: 0.8,
        target: {
          type: 'object',
          required: ['nodes', 'relationships'],
          properties: {
            nodes: { type: 'array', minItems: 2 },
            relationships: { type: 'array', minItems: 1 },
          },
        },
      },
      metadata: {
        createdBy: 'system',
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        tags: ['graph', 'relationships', 'basic'],
        difficulty: 'easy',
        estimatedDuration: 3,
        tenantLabels: ['default', 'enterprise'],
      },
    });

    // RAG Retrieval Tasks
    this.addTask({
      id: 'rag_document_search',
      name: 'Document Search and Retrieval',
      category: 'rag_retrieval',
      description: 'Test RAG system document retrieval accuracy',
      input: {
        query:
          'Find documents about cybersecurity incident response procedures',
        context: {
          domain: 'rag',
          tenant: 'security_team',
          sensitivity: 'internal',
        },
      },
      expectedOutput: {
        format: 'json',
        contains: ['documents', 'relevance_scores'],
        minLength: 50,
      },
      scoring: {
        method: 'semantic_similarity',
        weight: 1.0,
        passThreshold: 0.75,
        target: 'cybersecurity incident response procedures documentation',
      },
      metadata: {
        createdBy: 'system',
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        tags: ['rag', 'search', 'documents'],
        difficulty: 'medium',
        estimatedDuration: 5,
        tenantLabels: ['security_team', 'enterprise'],
      },
    });

    // OSINT Analysis Tasks
    this.addTask({
      id: 'osint_threat_analysis',
      name: 'Threat Intelligence Analysis',
      category: 'osint_analysis',
      description: 'Test OSINT threat actor profiling capabilities',
      input: {
        query:
          'Analyze threat patterns for APT groups targeting financial institutions',
        context: {
          domain: 'osint',
          tenant: 'threat_intel',
          sensitivity: 'confidential',
        },
      },
      expectedOutput: {
        format: 'json',
        contains: ['threat_actors', 'tactics', 'indicators'],
        minLength: 200,
      },
      scoring: {
        method: 'llm_judge',
        weight: 1.2,
        passThreshold: 0.7,
        judgePrompt:
          'Evaluate if this threat analysis includes: 1) Specific APT groups, 2) Financial sector TTPs, 3) Actionable indicators. Score 0-1.',
      },
      metadata: {
        createdBy: 'system',
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        tags: ['osint', 'threat_intelligence', 'apt'],
        difficulty: 'hard',
        estimatedDuration: 15,
        tenantLabels: ['threat_intel', 'government'],
      },
    });

    // Export Generation Tasks
    this.addTask({
      id: 'export_csv_report',
      name: 'CSV Report Generation',
      category: 'export_generation',
      description: 'Test CSV export formatting and data integrity',
      input: {
        query: 'Export user activity data for the last 30 days as CSV',
        context: {
          domain: 'export',
          tenant: 'analytics_team',
          sensitivity: 'internal',
        },
      },
      expectedOutput: {
        format: 'csv',
        contains: ['user_id', 'activity_date', 'action_type'],
        minLength: 100,
      },
      scoring: {
        method: 'regex_match',
        weight: 1.0,
        passThreshold: 0.9,
        target:
          /^user_id,activity_date,action_type[\s\S]*\n.*,\d{4}-\d{2}-\d{2},.*$/m,
      },
      metadata: {
        createdBy: 'system',
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        tags: ['export', 'csv', 'reports'],
        difficulty: 'easy',
        estimatedDuration: 2,
        tenantLabels: ['analytics_team', 'default'],
      },
    });

    // Files Management Tasks
    this.addTask({
      id: 'files_metadata_extraction',
      name: 'File Metadata Extraction',
      category: 'files_management',
      description: 'Test file metadata parsing and extraction',
      input: {
        query:
          'Extract metadata from uploaded PDF documents including author, creation date, and page count',
        context: {
          domain: 'files',
          tenant: 'document_team',
          sensitivity: 'internal',
        },
      },
      expectedOutput: {
        format: 'json',
        contains: ['filename', 'author', 'created_date', 'page_count'],
        minLength: 50,
      },
      scoring: {
        method: 'json_schema',
        weight: 1.0,
        passThreshold: 0.85,
        target: {
          type: 'array',
          items: {
            type: 'object',
            required: ['filename', 'metadata'],
            properties: {
              metadata: {
                type: 'object',
                properties: {
                  author: { type: 'string' },
                  created_date: { type: 'string' },
                  page_count: { type: 'number' },
                },
              },
            },
          },
        },
      },
      metadata: {
        createdBy: 'system',
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        tags: ['files', 'metadata', 'pdf'],
        difficulty: 'medium',
        estimatedDuration: 4,
        tenantLabels: ['document_team', 'enterprise'],
      },
    });

    // General LLM Tasks
    this.addTask({
      id: 'llm_code_generation',
      name: 'Code Generation Task',
      category: 'general_llm',
      description: 'Test code generation capabilities and correctness',
      input: {
        query:
          'Generate a Python function that calculates the Fibonacci sequence up to n terms',
        context: {
          tenant: 'dev_team',
          sensitivity: 'public',
        },
      },
      expectedOutput: {
        format: 'text',
        contains: ['def', 'fibonacci', 'return'],
        minLength: 100,
      },
      scoring: {
        method: 'custom_hook',
        weight: 1.0,
        passThreshold: 0.8,
        customHook: 'evaluatePythonCode',
      },
      metadata: {
        createdBy: 'system',
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        tags: ['llm', 'code_generation', 'python'],
        difficulty: 'medium',
        estimatedDuration: 8,
        tenantLabels: ['dev_team', 'default'],
      },
    });
  }

  private persistTasks(): void {
    const tasksArray = Array.from(this.tasks.values());
    const tasksFile = path.join(process.cwd(), 'golden-tasks.json');
    writeFileSync(tasksFile, JSON.stringify(tasksArray, null, 2));
  }

  private loadBaselines(): void {
    const baselineFile = path.join(process.cwd(), 'quality-baselines.json');
    if (existsSync(baselineFile)) {
      try {
        const baselines = JSON.parse(readFileSync(baselineFile, 'utf8'));
        this.baselines = new Map(Object.entries(baselines));
      } catch (error) {
        console.warn('Failed to load quality baselines:', error.message);
      }
    }
  }

  private saveBaselines(): void {
    const baselineFile = path.join(process.cwd(), 'quality-baselines.json');
    const baselines = Object.fromEntries(this.baselines);
    writeFileSync(baselineFile, JSON.stringify(baselines, null, 2));
  }

  updateBaseline(taskId: string, score: number): void {
    this.baselines.set(taskId, score);
    this.saveBaselines();
  }

  getBaseline(taskId: string): number | undefined {
    return this.baselines.get(taskId);
  }

  addQualityTrend(trend: QualityTrend): void {
    this.qualityHistory.push(trend);

    // Keep only recent history
    if (this.qualityHistory.length > this.maxHistorySize) {
      this.qualityHistory = this.qualityHistory.slice(-this.maxHistorySize);
    }
  }

  getQualityTrends(hours: number = 24): QualityTrend[] {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return this.qualityHistory.filter((t) => t.timestamp >= cutoff);
  }
}

/**
 * Evaluation Engine
 */
export class EvaluationEngine extends EventEmitter {
  private taskSuite: GoldenTaskSuite;
  private activeRuns = new Map<string, EvaluationRun>();

  constructor(taskSuite: GoldenTaskSuite) {
    super();
    this.taskSuite = taskSuite;
  }

  /**
   * Run evaluation suite
   */
  async runEvaluation(
    config: {
      taskFilter?: string[];
      tenantFilter?: string[];
      parallel?: boolean;
      maxConcurrency?: number;
      timeoutMs?: number;
      updateBaselines?: boolean;
    } = {},
  ): Promise<EvaluationRun> {
    const runId = `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    const evaluationRun: EvaluationRun = {
      id: runId,
      timestamp: startTime,
      gitCommit: await this.getGitCommit(),
      branch: await this.getGitBranch(),
      config: {
        taskFilter: config.taskFilter,
        tenantFilter: config.tenantFilter,
        parallel: config.parallel ?? true,
        maxConcurrency: config.maxConcurrency ?? 5,
        timeoutMs: config.timeoutMs ?? 300000,
      },
      results: [],
      summary: {
        totalTasks: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        avgScore: 0,
        avgDuration: 0,
        regressionDetected: false,
        qualityGate: 'pass',
      },
      duration: 0,
      environment: process.env.NODE_ENV || 'development',
    };

    this.activeRuns.set(runId, evaluationRun);

    try {
      // Get tasks to evaluate
      const tasks = this.taskSuite.getTasks({
        category: config.taskFilter,
        tenant: config.tenantFilter,
      });

      evaluationRun.summary.totalTasks = tasks.length;

      // Execute tasks
      if (config.parallel) {
        await this.executeTasksParallel(tasks, evaluationRun);
      } else {
        await this.executeTasksSequential(tasks, evaluationRun);
      }

      // Calculate summary statistics
      this.calculateSummary(evaluationRun);

      // Detect regressions
      await this.detectRegressions(evaluationRun);

      // Update baselines if requested
      if (config.updateBaselines) {
        this.updateBaselines(evaluationRun);
      }

      // Record quality trend
      this.recordQualityTrend(evaluationRun);

      evaluationRun.duration = Date.now() - startTime;

      // Emit completion event
      this.emit('evaluation:completed', evaluationRun);

      // Record metrics
      prometheusConductorMetrics.recordOperationalEvent(
        'evaluation_completed',
        evaluationRun.summary.qualityGate === 'pass',
      );
      prometheusConductorMetrics.recordOperationalMetric(
        'evaluation_duration',
        evaluationRun.duration,
      );
      prometheusConductorMetrics.recordOperationalMetric(
        'evaluation_pass_rate',
        evaluationRun.summary.passed / evaluationRun.summary.totalTasks,
      );
    } catch (error) {
      console.error('Evaluation failed:', error);
      evaluationRun.summary.qualityGate = 'fail';
      this.emit('evaluation:failed', { runId, error });

      prometheusConductorMetrics.recordOperationalEvent(
        'evaluation_failed',
        false,
      );
    } finally {
      this.activeRuns.delete(runId);
    }

    return evaluationRun;
  }

  /**
   * Execute tasks in parallel
   */
  private async executeTasksParallel(
    tasks: GoldenTask[],
    run: EvaluationRun,
  ): Promise<void> {
    const semaphore = new Array(run.config.maxConcurrency).fill(null);
    let taskIndex = 0;

    const executeNext = async (): Promise<void> => {
      while (taskIndex < tasks.length) {
        const currentIndex = taskIndex++;
        const task = tasks[currentIndex];

        try {
          const result = await this.executeTask(task, run.config.timeoutMs);
          run.results.push(result);
          this.emit('task:completed', { task, result, runId: run.id });
        } catch (error) {
          const errorResult: TaskResult = {
            taskId: task.id,
            status: 'error',
            score: 0,
            duration: 0,
            expert: 'LLM_LIGHT',
            actualOutput: null,
            expectedOutput: task.expectedOutput,
            scoringDetails: {
              method: task.scoring.method,
              rawScore: 0,
              normalizedScore: 0,
              feedback: error.message,
            },
            error: error.message,
            metadata: {
              tenant: task.metadata.tenantLabels[0] || 'default',
              category: task.category,
              difficulty: task.metadata.difficulty,
            },
          };
          run.results.push(errorResult);
          this.emit('task:error', { task, error, runId: run.id });
        }
      }
    };

    // Start parallel execution
    await Promise.all(semaphore.map(() => executeNext()));
  }

  /**
   * Execute tasks sequentially
   */
  private async executeTasksSequential(
    tasks: GoldenTask[],
    run: EvaluationRun,
  ): Promise<void> {
    for (const task of tasks) {
      try {
        const result = await this.executeTask(task, run.config.timeoutMs);
        run.results.push(result);
        this.emit('task:completed', { task, result, runId: run.id });
      } catch (error) {
        const errorResult: TaskResult = {
          taskId: task.id,
          status: 'error',
          score: 0,
          duration: 0,
          expert: 'LLM_LIGHT',
          actualOutput: null,
          expectedOutput: task.expectedOutput,
          scoringDetails: {
            method: task.scoring.method,
            rawScore: 0,
            normalizedScore: 0,
            feedback: error.message,
          },
          error: error.message,
          metadata: {
            tenant: task.metadata.tenantLabels[0] || 'default',
            category: task.category,
            difficulty: task.metadata.difficulty,
          },
        };
        run.results.push(errorResult);
        this.emit('task:error', { task, error, runId: run.id });
      }
    }
  }

  /**
   * Execute individual task
   */
  private async executeTask(
    task: GoldenTask,
    timeoutMs: number,
  ): Promise<TaskResult> {
    const startTime = Date.now();

    // Route task through router
    const routingResponse = await adaptiveExpertRouter.route({
      id: `eval_${task.id}_${Date.now()}`,
      query: task.input.query,
      context: {
        ...task.input.context,
        tenant: task.input.context.tenant,
      },
      metadata: { evaluation: true },
    });

    // Simulate expert execution (in real implementation, this would call the actual expert)
    const actualOutput = await this.simulateExpertExecution(
      routingResponse.selectedExpert,
      task,
    );

    // Score the output
    const scoringResult = await this.scoreOutput(task, actualOutput);

    const duration = Date.now() - startTime;
    const passed = scoringResult.normalizedScore >= task.scoring.passThreshold;

    const result: TaskResult = {
      taskId: task.id,
      status: passed ? 'passed' : 'failed',
      score: scoringResult.normalizedScore,
      duration,
      expert: routingResponse.selectedExpert,
      actualOutput,
      expectedOutput: task.expectedOutput,
      scoringDetails: scoringResult,
      metadata: {
        tenant: task.metadata.tenantLabels[0] || 'default',
        category: task.category,
        difficulty: task.metadata.difficulty,
      },
    };

    // Report outcome to router for learning
    await adaptiveExpertRouter.processOutcome(routingResponse.queryId, {
      success: passed,
      latency: duration,
      cost: routingResponse.estimatedCost,
      quality: scoringResult.normalizedScore,
    });

    return result;
  }

  /**
   * Simulate expert execution (placeholder)
   */
  private async simulateExpertExecution(
    expert: ExpertArm,
    task: GoldenTask,
  ): Promise<any> {
    // This would be replaced with actual expert execution
    // For now, simulate different expert responses

    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 2000 + 500),
    );

    switch (expert) {
      case 'GRAPH_TOOL':
        return {
          nodes: [
            { id: 'Alice', type: 'Person' },
            { id: 'TechCorp', type: 'Organization' },
          ],
          relationships: [{ from: 'Alice', to: 'TechCorp', type: 'WORKS_AT' }],
        };

      case 'RAG_TOOL':
        return {
          documents: [
            { id: 'doc1', title: 'Incident Response Plan', relevance: 0.95 },
            { id: 'doc2', title: 'Cybersecurity Framework', relevance: 0.87 },
          ],
        };

      case 'OSINT_TOOL':
        return {
          threat_actors: ['APT29', 'APT1'],
          tactics: ['Spear Phishing', 'Living off the Land'],
          indicators: ['malware.exe', '192.168.1.100'],
        };

      case 'EXPORT_TOOL':
        return 'user_id,activity_date,action_type\nuser123,2024-01-15,login\nuser456,2024-01-15,search';

      case 'FILES_TOOL':
        return [
          {
            filename: 'document.pdf',
            metadata: {
              author: 'John Doe',
              created_date: '2024-01-01',
              page_count: 42,
            },
          },
        ];

      case 'LLM_LIGHT':
      case 'LLM_HEAVY':
      default:
        return `def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)`;
    }
  }

  /**
   * Score task output
   */
  private async scoreOutput(
    task: GoldenTask,
    actualOutput: any,
  ): Promise<{
    method: string;
    rawScore: number;
    normalizedScore: number;
    feedback?: string;
  }> {
    const { scoring } = task;
    let rawScore = 0;
    let feedback = '';

    try {
      switch (scoring.method) {
        case 'exact_match':
          rawScore =
            JSON.stringify(actualOutput) === JSON.stringify(scoring.target)
              ? 1
              : 0;
          break;

        case 'json_schema':
          rawScore = this.validateJsonSchema(actualOutput, scoring.target)
            ? 1
            : 0;
          break;

        case 'regex_match':
          const regex =
            scoring.target instanceof RegExp
              ? scoring.target
              : new RegExp(scoring.target);
          rawScore = regex.test(String(actualOutput)) ? 1 : 0;
          break;

        case 'semantic_similarity':
          rawScore = await this.calculateSemanticSimilarity(
            String(actualOutput),
            String(scoring.target),
          );
          break;

        case 'custom_hook':
          rawScore = await this.executeCustomHook(
            scoring.customHook!,
            actualOutput,
            task,
          );
          break;

        case 'llm_judge':
          const judgeResult = await this.llmJudgeScore(
            actualOutput,
            scoring.judgePrompt!,
            task,
          );
          rawScore = judgeResult.score;
          feedback = judgeResult.feedback;
          break;

        default:
          throw new Error(`Unknown scoring method: ${scoring.method}`);
      }
    } catch (error) {
      console.error(`Scoring error for task ${task.id}:`, error);
      rawScore = 0;
      feedback = `Scoring error: ${error.message}`;
    }

    // Apply task weight
    const normalizedScore = Math.min(1, Math.max(0, rawScore * scoring.weight));

    return {
      method: scoring.method,
      rawScore,
      normalizedScore,
      feedback,
    };
  }

  private validateJsonSchema(data: any, schema: any): boolean {
    // Simple schema validation (in production, use a proper JSON schema validator)
    try {
      if (schema.type === 'object') {
        if (typeof data !== 'object' || data === null) return false;

        if (schema.required) {
          for (const requiredField of schema.required) {
            if (!(requiredField in data)) return false;
          }
        }

        if (schema.properties) {
          for (const [key, propSchema] of Object.entries(schema.properties)) {
            if (key in data) {
              if (!this.validateJsonSchema(data[key], propSchema)) return false;
            }
          }
        }
      } else if (schema.type === 'array') {
        if (!Array.isArray(data)) return false;
        if (schema.minItems && data.length < schema.minItems) return false;

        if (schema.items) {
          for (const item of data) {
            if (!this.validateJsonSchema(item, schema.items)) return false;
          }
        }
      } else if (schema.type) {
        return typeof data === schema.type;
      }

      return true;
    } catch {
      return false;
    }
  }

  private async calculateSemanticSimilarity(
    text1: string,
    text2: string,
  ): Promise<number> {
    // Placeholder semantic similarity calculation
    // In production, use embeddings and cosine similarity
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);

    const intersection = words1.filter((w) => words2.includes(w));
    const union = [...new Set([...words1, ...words2])];

    return intersection.length / union.length;
  }

  private async executeCustomHook(
    hookName: string,
    output: any,
    task: GoldenTask,
  ): Promise<number> {
    // Execute custom scoring hooks
    if (hookName === 'evaluatePythonCode') {
      return this.evaluatePythonCode(output);
    }

    // Add more custom hooks as needed
    console.warn(`Unknown custom hook: ${hookName}`);
    return 0;
  }

  private evaluatePythonCode(code: string): number {
    let score = 0;

    // Check for function definition
    if (code.includes('def fibonacci')) score += 0.3;

    // Check for recursive structure
    if (code.includes('fibonacci(') && code.includes('fibonacci('))
      score += 0.3;

    // Check for base case
    if (code.includes('n <= 1') || code.includes('n < 2')) score += 0.2;

    // Check for return statement
    if (code.includes('return')) score += 0.2;

    return Math.min(1, score);
  }

  private async llmJudgeScore(
    output: any,
    judgePrompt: string,
    task: GoldenTask,
  ): Promise<{ score: number; feedback: string }> {
    // In production, this would call an LLM API for scoring
    // For now, simulate LLM judge response
    const outputStr = JSON.stringify(output, null, 2);

    // Simple heuristic scoring based on content
    let score = 0.5;
    const feedback = 'Automated evaluation';

    if (outputStr.length > 100) score += 0.2;
    if (outputStr.includes('threat') || outputStr.includes('APT')) score += 0.3;

    return { score: Math.min(1, score), feedback };
  }

  private calculateSummary(run: EvaluationRun): void {
    const { results } = run;

    run.summary.totalTasks = results.length;
    run.summary.passed = results.filter((r) => r.status === 'passed').length;
    run.summary.failed = results.filter((r) => r.status === 'failed').length;
    run.summary.skipped = results.filter((r) => r.status === 'skipped').length;

    if (results.length > 0) {
      run.summary.avgScore =
        results.reduce((sum, r) => sum + r.score, 0) / results.length;
      run.summary.avgDuration =
        results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    }

    // Determine quality gate status
    const passRate = run.summary.passed / run.summary.totalTasks;

    if (passRate >= 0.9 && run.summary.avgScore >= 0.8) {
      run.summary.qualityGate = 'pass';
    } else if (passRate >= 0.7 && run.summary.avgScore >= 0.6) {
      run.summary.qualityGate = 'warning';
    } else {
      run.summary.qualityGate = 'fail';
    }
  }

  private async detectRegressions(run: EvaluationRun): Promise<void> {
    const regressions: RegressionAnalysis[] = [];

    // Group results by tenant and category
    const groups = new Map<string, TaskResult[]>();

    for (const result of run.results) {
      const key = `${result.metadata.tenant}_${result.metadata.category}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(result);
    }

    // Analyze each group for regressions
    for (const [groupKey, results] of groups) {
      const [tenant, category] = groupKey.split('_');
      const currentScore =
        results.reduce((sum, r) => sum + r.score, 0) / results.length;

      // Get baseline score for this group
      const baselineKey = `${tenant}_${category}`;
      const baselineScore = this.taskSuite.getBaseline(baselineKey);

      if (baselineScore !== undefined) {
        const scoreDrop = baselineScore - currentScore;
        const significantRegression = scoreDrop > 0.1; // 10% drop threshold

        if (significantRegression) {
          regressions.push({
            tenant,
            category,
            currentScore,
            baselineScore,
            scoreDrop,
            significantRegression,
            affectedTasks: results.map((r) => r.taskId),
          });
        }
      }
    }

    if (regressions.length > 0) {
      run.summary.regressionDetected = true;
      run.regressions = regressions;

      // Downgrade quality gate if regressions detected
      if (run.summary.qualityGate === 'pass') {
        run.summary.qualityGate = 'warning';
      }
    }
  }

  private updateBaselines(run: EvaluationRun): void {
    // Update baselines with current scores
    const groups = new Map<string, number[]>();

    for (const result of run.results) {
      const key = `${result.metadata.tenant}_${result.metadata.category}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(result.score);
    }

    for (const [groupKey, scores] of groups) {
      const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      this.taskSuite.updateBaseline(groupKey, avgScore);
    }
  }

  private recordQualityTrend(run: EvaluationRun): void {
    const categoryScores: Record<string, number> = {};
    const tenantScores: Record<string, number> = {};

    // Calculate category averages
    const categoryGroups = new Map<string, number[]>();
    const tenantGroups = new Map<string, number[]>();

    for (const result of run.results) {
      if (!categoryGroups.has(result.metadata.category)) {
        categoryGroups.set(result.metadata.category, []);
      }
      categoryGroups.get(result.metadata.category)!.push(result.score);

      if (!tenantGroups.has(result.metadata.tenant)) {
        tenantGroups.set(result.metadata.tenant, []);
      }
      tenantGroups.get(result.metadata.tenant)!.push(result.score);
    }

    for (const [category, scores] of categoryGroups) {
      categoryScores[category] =
        scores.reduce((sum, s) => sum + s, 0) / scores.length;
    }

    for (const [tenant, scores] of tenantGroups) {
      tenantScores[tenant] =
        scores.reduce((sum, s) => sum + s, 0) / scores.length;
    }

    const trend: QualityTrend = {
      timestamp: run.timestamp,
      overallScore: run.summary.avgScore,
      categoryScores,
      tenantScores,
      regressionCount: run.regressions?.length || 0,
      passRate: run.summary.passed / run.summary.totalTasks,
    };

    this.taskSuite.addQualityTrend(trend);
  }

  private async getGitCommit(): Promise<string> {
    try {
      const { stdout } = await this.execCommand('git rev-parse HEAD');
      return stdout.trim();
    } catch {
      return 'unknown';
    }
  }

  private async getGitBranch(): Promise<string> {
    try {
      const { stdout } = await this.execCommand(
        'git rev-parse --abbrev-ref HEAD',
      );
      return stdout.trim();
    } catch {
      return 'unknown';
    }
  }

  private execCommand(
    command: string,
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(' ');
      const child = spawn(cmd, args);
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command failed: ${command}\n${stderr}`));
        }
      });
    });
  }

  /**
   * Get evaluation run by ID
   */
  getEvaluationRun(runId: string): EvaluationRun | undefined {
    return this.activeRuns.get(runId);
  }

  /**
   * List active evaluation runs
   */
  getActiveRuns(): string[] {
    return Array.from(this.activeRuns.keys());
  }
}

// Singleton instances
export const goldenTaskSuite = new GoldenTaskSuite();
export const evaluationEngine = new EvaluationEngine(goldenTaskSuite);
