/**
 * Pipeline Service Worker
 * Executes data integration pipelines in distributed manner
 */

import { config } from 'dotenv';
import { ETLEngine } from '@intelgraph/etl-engine';
import { WorkflowOrchestrator } from '@intelgraph/workflow-orchestration';

// Load environment variables
config();

class PipelineWorker {
  private orchestrator: WorkflowOrchestrator;
  private running: boolean = false;

  constructor() {
    this.orchestrator = new WorkflowOrchestrator();
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.orchestrator.on('execution:started', ({ executionId, workflowId }) => {
      console.log(`Execution started: ${executionId} for workflow: ${workflowId}`);
    });

    this.orchestrator.on('execution:completed', ({ executionId }) => {
      console.log(`Execution completed: ${executionId}`);
    });

    this.orchestrator.on('execution:failed', ({ executionId, error }) => {
      console.error(`Execution failed: ${executionId}`, error);
    });

    this.orchestrator.on('node:started', ({ executionId, nodeId }) => {
      console.log(`Node started: ${nodeId} in execution: ${executionId}`);
    });
  }

  /**
   * Start worker
   */
  async start(): Promise<void> {
    this.running = true;
    console.log('Pipeline Worker started');
    console.log('Ready to process pipeline executions');

    // Keep worker running
    while (this.running) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * Stop worker
   */
  async stop(): Promise<void> {
    this.running = false;
    console.log('Pipeline Worker stopped');
  }
}

// Start worker
const worker = new PipelineWorker();

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await worker.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await worker.stop();
  process.exit(0);
});

worker.start().catch(error => {
  console.error('Worker failed:', error);
  process.exit(1);
});
