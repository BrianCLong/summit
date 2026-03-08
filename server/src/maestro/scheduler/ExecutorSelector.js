"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutorSelector = exports.FirstReadyStrategy = void 0;
class FirstReadyStrategy {
    select(executors, tenantId) {
        return executors.find(e => e.status === 'ready');
    }
}
exports.FirstReadyStrategy = FirstReadyStrategy;
class ExecutorSelector {
    strategy;
    constructor(strategy = new FirstReadyStrategy()) {
        this.strategy = strategy;
    }
    setStrategy(strategy) {
        this.strategy = strategy;
    }
    selectExecutor(executors, tenantId) {
        return this.strategy.select(executors, tenantId);
    }
}
exports.ExecutorSelector = ExecutorSelector;
