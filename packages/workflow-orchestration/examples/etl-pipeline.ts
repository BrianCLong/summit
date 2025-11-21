/**
 * Example: ETL Pipeline Workflow
 *
 * This example demonstrates a complete ETL (Extract, Transform, Load) pipeline
 * using the workflow orchestration platform.
 */

import { DAG, ExecutionEngine } from '@summit/dag-engine';
import { CronScheduler } from '@summit/task-scheduling';
import { StateManager, WorkerPool, TemplateEngine } from '@summit/workflow-orchestration';
import { MetricsCollector, AlertManager } from '@summit/workflow-monitoring';

// Initialize components
const stateManager = new StateManager();
const metrics = new MetricsCollector();
const alerts = new AlertManager();
const template = new TemplateEngine();

// Configure alerts
alerts.addRule({
  name: 'pipeline-failure',
  condition: () => false, // Will be set based on metrics
  severity: 'critical',
  channels: ['slack'],
  message: 'ETL pipeline failed',
});

// Define the ETL DAG
const etlPipeline = new DAG({
  dagId: 'etl-pipeline',
  description: 'Daily ETL pipeline for data warehouse',
  schedule: '0 2 * * *', // Run at 2 AM daily
  defaultArgs: {
    retries: 3,
    retryDelay: 300000, // 5 minutes
  },
  tags: ['etl', 'data-warehouse', 'daily'],
});

// Task 1: Extract from source database
etlPipeline.addTask({
  taskId: 'extract_orders',
  execute: async (context) => {
    const query = template.render(
      'SELECT * FROM orders WHERE date >= "{{ start_date }}" AND date < "{{ end_date }}"',
      {
        start_date: context.params.startDate,
        end_date: context.params.endDate,
      }
    );

    console.log(`Executing query: ${query}`);

    // Simulate extraction
    const records = Array.from({ length: 1000 }, (_, i) => ({
      id: i + 1,
      amount: Math.random() * 1000,
      status: ['completed', 'pending', 'cancelled'][Math.floor(Math.random() * 3)],
    }));

    return { recordCount: records.length, data: records };
  },
});

// Task 2: Extract from another source
etlPipeline.addTask({
  taskId: 'extract_customers',
  execute: async (context) => {
    console.log('Extracting customer data...');

    const customers = Array.from({ length: 500 }, (_, i) => ({
      id: i + 1,
      name: `Customer ${i + 1}`,
      tier: ['bronze', 'silver', 'gold'][Math.floor(Math.random() * 3)],
    }));

    return { recordCount: customers.length, data: customers };
  },
});

// Task 3: Transform and join data
etlPipeline.addTask({
  taskId: 'transform_data',
  execute: async (context) => {
    const ordersOutput = context.previousTaskInstance?.output as { data: any[] } | undefined;

    console.log('Transforming data...');

    // Simulate transformation
    const transformed = {
      totalOrders: ordersOutput?.data?.length || 0,
      totalRevenue: ordersOutput?.data?.reduce((sum: number, o: any) => sum + o.amount, 0) || 0,
      byStatus: {
        completed: ordersOutput?.data?.filter((o: any) => o.status === 'completed').length || 0,
        pending: ordersOutput?.data?.filter((o: any) => o.status === 'pending').length || 0,
        cancelled: ordersOutput?.data?.filter((o: any) => o.status === 'cancelled').length || 0,
      },
    };

    return { transformed, recordCount: transformed.totalOrders };
  },
});

// Task 4: Data quality checks
etlPipeline.addTask({
  taskId: 'quality_check',
  execute: async (context) => {
    console.log('Running data quality checks...');

    const checks = [
      { name: 'null_check', passed: true },
      { name: 'duplicate_check', passed: true },
      { name: 'range_check', passed: true },
    ];

    const allPassed = checks.every(c => c.passed);

    if (!allPassed) {
      throw new Error('Data quality checks failed');
    }

    return { checks, allPassed };
  },
});

// Task 5: Load to data warehouse
etlPipeline.addTask({
  taskId: 'load_warehouse',
  execute: async (context) => {
    console.log('Loading data to warehouse...');

    // Simulate loading
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      loaded: true,
      destination: 'data_warehouse.fact_orders',
      timestamp: new Date().toISOString(),
    };
  },
});

// Task 6: Send notification
etlPipeline.addTask({
  taskId: 'notify_completion',
  execute: async (context) => {
    const message = template.render(
      'ETL Pipeline completed successfully at {{ timestamp }}. Processed {{ records }} records.',
      {
        timestamp: new Date().toISOString(),
        records: 1000,
      }
    );

    console.log(`Notification: ${message}`);

    return { notified: true, message };
  },
});

// Set up task dependencies
// extract_orders ─┐
//                 ├─> transform_data ─> quality_check ─> load_warehouse ─> notify_completion
// extract_customers ┘

etlPipeline.setDependency('extract_orders', 'transform_data');
etlPipeline.setDependency('extract_customers', 'transform_data');
etlPipeline.setDependency('transform_data', 'quality_check');
etlPipeline.setDependency('quality_check', 'load_warehouse');
etlPipeline.setDependency('load_warehouse', 'notify_completion');

// Validate the DAG
const validationResult = etlPipeline.validate();
if (!validationResult.isValid) {
  console.error('DAG validation failed:', validationResult.errors);
  process.exit(1);
}

console.log('DAG validation passed');
console.log('Execution order:', etlPipeline.getExecutionOrder());

// Create execution engine
const engine = new ExecutionEngine({
  concurrency: 4,
  defaultTimeout: 300000, // 5 minutes
});

// Set up event handlers
engine.on('task:started', (taskId, executionId) => {
  console.log(`Task started: ${taskId}`);
  metrics.recordTaskStart(etlPipeline.config.dagId, taskId);
});

engine.on('task:completed', (taskId, executionId, output) => {
  console.log(`Task completed: ${taskId}`);
  metrics.recordTaskEnd(etlPipeline.config.dagId, taskId, 'success');
});

engine.on('task:failed', (taskId, executionId, error) => {
  console.error(`Task failed: ${taskId}`, error);
  metrics.recordTaskEnd(etlPipeline.config.dagId, taskId, 'failed');
});

// Schedule the pipeline
const scheduler = new CronScheduler();

scheduler.addSchedule({
  dagId: etlPipeline.config.dagId,
  schedule: '0 2 * * *',
  timezone: 'UTC',
  catchup: false,
  params: {
    startDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  },
});

scheduler.on('schedule:trigger', async (execution) => {
  console.log(`Scheduled execution triggered: ${execution.dagId}`);

  // Store execution state
  const executionId = `exec-${Date.now()}`;
  stateManager.storeWorkflowExecution({
    executionId,
    dagId: execution.dagId,
    state: 'running',
    startTime: new Date(),
    params: execution.params || {},
  });

  try {
    // Execute the DAG
    metrics.recordWorkflowStart(execution.dagId, executionId);
    const result = await engine.execute(etlPipeline, execution.params);

    stateManager.updateWorkflowState(executionId, 'success');
    metrics.recordWorkflowEnd(execution.dagId, executionId, 'success');

    console.log('Pipeline completed successfully');
  } catch (error) {
    stateManager.updateWorkflowState(executionId, 'failed');
    metrics.recordWorkflowEnd(execution.dagId, executionId, 'failed');

    // Trigger alert
    alerts.emit('alert', {
      name: 'pipeline-failure',
      severity: 'critical',
      message: `ETL pipeline failed: ${error}`,
      timestamp: new Date(),
    });

    console.error('Pipeline failed:', error);
  }
});

// Export for testing
export { etlPipeline, engine, scheduler, stateManager, metrics };
