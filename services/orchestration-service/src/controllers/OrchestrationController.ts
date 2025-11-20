/**
 * Orchestration Controller - Main controller for workflow orchestration
 */

import { DAG, ExecutionEngine, DAGConfig } from '@summit/dag-engine';
import { CronScheduler, TriggerManager } from '@summit/task-scheduling';
import {
  BashOperator,
  PythonOperator,
  HttpOperator,
  EmailOperator,
  TransferOperator,
  BranchOperator,
  DummyOperator,
} from '@summit/workflow-operators';
import { StateManager, WorkerPool, TemplateEngine } from '@summit/workflow-orchestration';
import { MetricsCollector, AlertManager } from '@summit/workflow-monitoring';

export class OrchestrationController {
  public executionEngine: ExecutionEngine;
  public scheduler: CronScheduler;
  public triggerManager: TriggerManager;
  public stateManager: StateManager;
  public workerPool: WorkerPool;
  public metricsCollector: MetricsCollector;
  public alertManager: AlertManager;
  public templateEngine: TemplateEngine;

  private dags: Map<string, DAG>;

  constructor() {
    // Initialize components
    this.executionEngine = new ExecutionEngine({ concurrency: 10 });
    this.scheduler = new CronScheduler();
    this.triggerManager = new TriggerManager();
    this.stateManager = new StateManager();
    this.workerPool = new WorkerPool();
    this.metricsCollector = new MetricsCollector();
    this.alertManager = new AlertManager();
    this.templateEngine = new TemplateEngine();
    this.dags = new Map();

    // Register operators
    this.registerOperators();

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Register built-in operators
   */
  private registerOperators(): void {
    this.executionEngine.registerOperator('bash', new BashOperator({ command: '' }));
    this.executionEngine.registerOperator('python', new PythonOperator({}));
    this.executionEngine.registerOperator('http', new HttpOperator({ url: '' }));
    this.executionEngine.registerOperator('email', new EmailOperator({ to: '', subject: '', body: '' }));
    this.executionEngine.registerOperator('transfer', new TransferOperator({ sourceTask: '' }));
    this.executionEngine.registerOperator('branch', new BranchOperator({ condition: async () => '', branches: {} }));
    this.executionEngine.registerOperator('dummy', new DummyOperator());
  }

  /**
   * Set up event listeners between components
   */
  private setupEventListeners(): void {
    // Scheduler events
    this.scheduler.on('schedule:trigger', async (execution) => {
      const dag = this.dags.get(execution.dagId);
      if (dag) {
        await this.executeWorkflow(dag, execution.params);
      }
    });

    // Trigger events
    this.triggerManager.on('trigger:fired', async (execution) => {
      const dag = this.dags.get(execution.dagId);
      if (dag) {
        await this.executeWorkflow(dag, execution.params);
      }
    });

    // Execution events
    this.executionEngine.on('workflow:start', (execution) => {
      this.stateManager.storeWorkflowExecution(execution);
    });

    this.executionEngine.on('workflow:complete', (execution) => {
      this.stateManager.updateWorkflowState(execution.executionId, 'success');
      this.metricsCollector.recordWorkflowMetrics(execution);
    });

    this.executionEngine.on('workflow:failed', (execution, error) => {
      this.stateManager.updateWorkflowState(execution.executionId, 'failed');
      this.metricsCollector.recordWorkflowMetrics(execution);
      this.alertManager.createAlert(
        'error',
        `Workflow ${execution.dagId} failed`,
        error.message,
        { dag_id: execution.dagId, execution_id: execution.executionId }
      );
    });

    this.executionEngine.on('task:start', (execution) => {
      this.stateManager.storeTaskExecution(execution);
    });

    this.executionEngine.on('task:complete', (execution) => {
      this.stateManager.updateTaskState(
        execution.workflowExecutionId,
        execution.taskId,
        'success'
      );
      this.metricsCollector.recordTaskMetrics(execution);
    });

    this.executionEngine.on('task:failed', (execution, error) => {
      this.stateManager.updateTaskState(
        execution.workflowExecutionId,
        execution.taskId,
        'failed'
      );
      this.metricsCollector.recordTaskMetrics(execution);
    });
  }

  /**
   * Register a DAG
   */
  registerDAG(dag: DAG): void {
    const validation = dag.validate();
    if (!validation.valid) {
      throw new Error(`DAG validation failed: ${validation.errors.join(', ')}`);
    }

    this.dags.set(dag.dagId, dag);
    this.stateManager.storeDagConfig(dag.config);
  }

  /**
   * Unregister a DAG
   */
  unregisterDAG(dagId: string): void {
    this.dags.delete(dagId);
    this.scheduler.removeSchedule(dagId);
  }

  /**
   * Get DAG
   */
  getDAG(dagId: string): DAG | undefined {
    return this.dags.get(dagId);
  }

  /**
   * Get all DAGs
   */
  getAllDAGs(): DAG[] {
    return Array.from(this.dags.values());
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(dag: DAG, params?: Record<string, any>): Promise<any> {
    return this.executionEngine.execute(dag, params);
  }

  /**
   * Pause workflow execution
   */
  pauseWorkflow(executionId: string): void {
    this.stateManager.updateWorkflowState(executionId, 'pending');
  }

  /**
   * Resume workflow execution
   */
  resumeWorkflow(executionId: string): void {
    this.stateManager.updateWorkflowState(executionId, 'running');
  }

  /**
   * Cancel workflow execution
   */
  cancelWorkflow(executionId: string): void {
    this.stateManager.updateWorkflowState(executionId, 'cancelled');
  }

  /**
   * Shutdown
   */
  shutdown(): void {
    this.scheduler.stopAll();
    this.workerPool.shutdown();
  }
}
