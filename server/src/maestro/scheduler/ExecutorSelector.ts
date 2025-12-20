import { ExecutorRecord } from '../executors/executors-repo.js';

export interface ExecutorSelectionStrategy {
  select(executors: ExecutorRecord[], tenantId: string): ExecutorRecord | undefined;
}

export class FirstReadyStrategy implements ExecutorSelectionStrategy {
  select(executors: ExecutorRecord[], tenantId: string): ExecutorRecord | undefined {
    return executors.find(e => e.status === 'ready');
  }
}

export class ExecutorSelector {
  private strategy: ExecutorSelectionStrategy;

  constructor(strategy: ExecutorSelectionStrategy = new FirstReadyStrategy()) {
    this.strategy = strategy;
  }

  public setStrategy(strategy: ExecutorSelectionStrategy) {
    this.strategy = strategy;
  }

  public selectExecutor(executors: ExecutorRecord[], tenantId: string): ExecutorRecord | undefined {
    return this.strategy.select(executors, tenantId);
  }
}
