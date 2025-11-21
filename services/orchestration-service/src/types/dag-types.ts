/**
 * Local type definitions for workflow orchestration types
 */

// DAG Engine types
export interface DAGConfig {
  dagId: string;
  description?: string;
  schedule?: string;
  [key: string]: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface DAG {
  dagId: string;
  config: DAGConfig;
  validate(): ValidationResult;
  toJSON(): any;
}

export interface DAGStatic {
  new (config: DAGConfig): DAG;
  fromJSON(json: any): DAG;
}

export interface ExecutionEngineConfig {
  concurrency?: number;
}

export interface ExecutionEngine {
  registerOperator(name: string, operator: any): void;
  execute(dag: DAG, params?: Record<string, any>): Promise<any>;
  on(event: string, listener: (...args: any[]) => void): void;
}

export interface ExecutionEngineStatic {
  new (config?: ExecutionEngineConfig): ExecutionEngine;
}

// Task Scheduling types
export interface Schedule {
  dagId: string;
  cronExpression: string;
  enabled: boolean;
}

export interface CronScheduler {
  addSchedule(schedule: Schedule): void;
  removeSchedule(dagId: string): void;
  pauseSchedule(dagId: string): void;
  resumeSchedule(dagId: string): void;
  getSchedule(dagId: string): Schedule | undefined;
  getAllSchedules(): Schedule[];
  getNextRunTime(dagId: string): Date | undefined;
  getPreviousRunTime(dagId: string): Date | undefined;
  stopAll(): void;
  on(event: string, listener: (...args: any[]) => void): void;
}

export interface CronSchedulerStatic {
  new (): CronScheduler;
}

export interface TriggerManager {
  on(event: string, listener: (...args: any[]) => void): void;
}

export interface TriggerManagerStatic {
  new (): TriggerManager;
}

// Workflow Operators types
export interface Operator {
  execute(context: any): Promise<any>;
}

export interface BashOperatorConfig {
  command: string;
}

export interface BashOperator extends Operator {}

export interface BashOperatorStatic {
  new (config: BashOperatorConfig): BashOperator;
}

export interface PythonOperator extends Operator {}

export interface PythonOperatorStatic {
  new (config: any): PythonOperator;
}

export interface HttpOperatorConfig {
  url: string;
  method?: string;
}

export interface HttpOperator extends Operator {}

export interface HttpOperatorStatic {
  new (config: HttpOperatorConfig): HttpOperator;
}

export interface EmailOperatorConfig {
  to: string;
  subject: string;
  body: string;
}

export interface EmailOperator extends Operator {}

export interface EmailOperatorStatic {
  new (config: EmailOperatorConfig): EmailOperator;
}

export interface TransferOperatorConfig {
  sourceTask: string;
}

export interface TransferOperator extends Operator {}

export interface TransferOperatorStatic {
  new (config: TransferOperatorConfig): TransferOperator;
}

export interface BranchOperatorConfig {
  condition: () => Promise<string>;
  branches: Record<string, string>;
}

export interface BranchOperator extends Operator {}

export interface BranchOperatorStatic {
  new (config: BranchOperatorConfig): BranchOperator;
}

export interface DummyOperator extends Operator {}

export interface DummyOperatorStatic {
  new (): DummyOperator;
}

// Workflow Orchestration types
export type TaskState = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';

export interface WorkflowExecution {
  executionId: string;
  dagId: string;
  state: TaskState;
  startTime: Date;
  endTime?: Date;
}

export interface TaskExecution {
  taskId: string;
  workflowExecutionId: string;
  state: TaskState;
}

export interface StateManager {
  storeDagConfig(config: DAGConfig): void;
  storeWorkflowExecution(execution: any): void;
  storeTaskExecution(execution: any): void;
  updateWorkflowState(executionId: string, state: TaskState): void;
  updateTaskState(executionId: string, taskId: string, state: TaskState): void;
  getWorkflowExecution(executionId: string): WorkflowExecution | undefined;
  getWorkflowHistory(dagId: string, limit: number): WorkflowExecution[];
  getWorkflowTaskExecutions(executionId: string): TaskExecution[];
  getActiveWorkflows(): WorkflowExecution[];
  getStatistics(): Record<string, any>;
}

export interface StateManagerStatic {
  new (): StateManager;
}

export interface WorkerConfig {
  concurrency: number;
}

export interface Worker {
  workerId: string;
  status: string;
  config: WorkerConfig;
  currentTasks: Set<string>;
  totalTasksExecuted: number;
  lastHeartbeat: Date;
}

export interface WorkerPool {
  getAllWorkers(): Worker[];
  shutdown(): void;
}

export interface WorkerPoolStatic {
  new (): WorkerPool;
}

export interface TemplateEngine {
  render(template: string, context: Record<string, any>): string;
}

export interface TemplateEngineStatic {
  new (): TemplateEngine;
}

// Workflow Monitoring types
export interface Metric {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface MetricStats {
  count: number;
  min: number;
  max: number;
  avg: number;
}

export interface MetricsCollector {
  recordWorkflowMetrics(execution: any): void;
  recordTaskMetrics(execution: any): void;
  getAllMetrics(): Metric[];
  getMetricsByName(name: string): Metric[];
  getMetricStats(name: string): MetricStats | undefined;
}

export interface MetricsCollectorStatic {
  new (): MetricsCollector;
}

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface Alert {
  alertId: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  resolved: boolean;
  createdAt: Date;
}

export interface AlertManager {
  createAlert(severity: AlertSeverity, title: string, message: string, metadata?: Record<string, any>): Alert;
  resolveAlert(alertId: string): void;
  getAllAlerts(): Alert[];
  getActiveAlerts(): Alert[];
  getAlertsBySeverity(severity: AlertSeverity): Alert[];
}

export interface AlertManagerStatic {
  new (): AlertManager;
}

// Mock implementations for development
export const DAG: DAGStatic = class implements DAG {
  dagId: string;
  config: DAGConfig;

  constructor(config: DAGConfig) {
    this.dagId = config.dagId;
    this.config = config;
  }

  validate(): ValidationResult {
    return { valid: true, errors: [] };
  }

  toJSON(): any {
    return this.config;
  }

  static fromJSON(json: any): DAG {
    return new DAG(json);
  }
} as any;

export const ExecutionEngine: ExecutionEngineStatic = class implements ExecutionEngine {
  private listeners: Map<string, Function[]> = new Map();

  constructor(_config?: ExecutionEngineConfig) {}

  registerOperator(_name: string, _operator: any): void {}

  async execute(_dag: DAG, _params?: Record<string, any>): Promise<any> {
    return { executionId: `exec-${Date.now()}` };
  }

  on(event: string, listener: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }
} as any;

export const CronScheduler: CronSchedulerStatic = class implements CronScheduler {
  private schedules: Map<string, Schedule> = new Map();
  private listeners: Map<string, Function[]> = new Map();

  addSchedule(schedule: Schedule): void {
    this.schedules.set(schedule.dagId, schedule);
  }

  removeSchedule(dagId: string): void {
    this.schedules.delete(dagId);
  }

  pauseSchedule(dagId: string): void {
    const schedule = this.schedules.get(dagId);
    if (schedule) schedule.enabled = false;
  }

  resumeSchedule(dagId: string): void {
    const schedule = this.schedules.get(dagId);
    if (schedule) schedule.enabled = true;
  }

  getSchedule(dagId: string): Schedule | undefined {
    return this.schedules.get(dagId);
  }

  getAllSchedules(): Schedule[] {
    return Array.from(this.schedules.values());
  }

  getNextRunTime(_dagId: string): Date | undefined {
    return new Date();
  }

  getPreviousRunTime(_dagId: string): Date | undefined {
    return new Date();
  }

  stopAll(): void {}

  on(event: string, listener: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }
} as any;

export const TriggerManager: TriggerManagerStatic = class implements TriggerManager {
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, listener: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }
} as any;

export const BashOperator: BashOperatorStatic = class implements BashOperator {
  constructor(_config: BashOperatorConfig) {}
  async execute(_context: any): Promise<any> {
    return {};
  }
} as any;

export const PythonOperator: PythonOperatorStatic = class implements PythonOperator {
  constructor(_config: any) {}
  async execute(_context: any): Promise<any> {
    return {};
  }
} as any;

export const HttpOperator: HttpOperatorStatic = class implements HttpOperator {
  constructor(_config: HttpOperatorConfig) {}
  async execute(_context: any): Promise<any> {
    return {};
  }
} as any;

export const EmailOperator: EmailOperatorStatic = class implements EmailOperator {
  constructor(_config: EmailOperatorConfig) {}
  async execute(_context: any): Promise<any> {
    return {};
  }
} as any;

export const TransferOperator: TransferOperatorStatic = class implements TransferOperator {
  constructor(_config: TransferOperatorConfig) {}
  async execute(_context: any): Promise<any> {
    return {};
  }
} as any;

export const BranchOperator: BranchOperatorStatic = class implements BranchOperator {
  constructor(_config: BranchOperatorConfig) {}
  async execute(_context: any): Promise<any> {
    return {};
  }
} as any;

export const DummyOperator: DummyOperatorStatic = class implements DummyOperator {
  async execute(_context: any): Promise<any> {
    return {};
  }
} as any;

export const StateManager: StateManagerStatic = class implements StateManager {
  private executions: Map<string, WorkflowExecution> = new Map();

  storeDagConfig(_config: DAGConfig): void {}
  storeWorkflowExecution(execution: any): void {
    this.executions.set(execution.executionId, execution);
  }
  storeTaskExecution(_execution: any): void {}
  updateWorkflowState(executionId: string, state: TaskState): void {
    const execution = this.executions.get(executionId);
    if (execution) execution.state = state;
  }
  updateTaskState(_executionId: string, _taskId: string, _state: TaskState): void {}
  getWorkflowExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }
  getWorkflowHistory(_dagId: string, _limit: number): WorkflowExecution[] {
    return [];
  }
  getWorkflowTaskExecutions(_executionId: string): TaskExecution[] {
    return [];
  }
  getActiveWorkflows(): WorkflowExecution[] {
    return [];
  }
  getStatistics(): Record<string, any> {
    return {};
  }
} as any;

export const WorkerPool: WorkerPoolStatic = class implements WorkerPool {
  getAllWorkers(): Worker[] {
    return [];
  }
  shutdown(): void {}
} as any;

export const TemplateEngine: TemplateEngineStatic = class implements TemplateEngine {
  render(template: string, _context: Record<string, any>): string {
    return template;
  }
} as any;

export const MetricsCollector: MetricsCollectorStatic = class implements MetricsCollector {
  recordWorkflowMetrics(_execution: any): void {}
  recordTaskMetrics(_execution: any): void {}
  getAllMetrics(): Metric[] {
    return [];
  }
  getMetricsByName(_name: string): Metric[] {
    return [];
  }
  getMetricStats(_name: string): MetricStats | undefined {
    return undefined;
  }
} as any;

export const AlertManager: AlertManagerStatic = class implements AlertManager {
  private alerts: Map<string, Alert> = new Map();

  createAlert(severity: AlertSeverity, title: string, message: string, metadata?: Record<string, any>): Alert {
    const alert: Alert = {
      alertId: `alert-${Date.now()}`,
      severity,
      title,
      message,
      metadata,
      resolved: false,
      createdAt: new Date(),
    };
    this.alerts.set(alert.alertId, alert);
    return alert;
  }

  resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) alert.resolved = true;
  }

  getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }

  getActiveAlerts(): Alert[] {
    return this.getAllAlerts().filter(a => !a.resolved);
  }

  getAlertsBySeverity(severity: AlertSeverity): Alert[] {
    return this.getAllAlerts().filter(a => a.severity === severity);
  }
} as any;
