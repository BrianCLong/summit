"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RCRSession = void 0;
class RCRSession {
    budget;
    env;
    trace = [];
    metrics = {
        depth: 0,
        iterations: 0,
        subcalls: 0,
        wallMs: 0,
        costUsd: 0
    };
    startTime;
    constructor(env, budget) {
        this.env = env;
        this.budget = budget;
        this.startTime = Date.now();
    }
    async listFiles(prefix) {
        this.checkBudget();
        const start = Date.now();
        try {
            const result = await this.env.listFiles(prefix);
            this.recordTrace('listFiles', { prefix }, { count: result.length });
            return result;
        }
        catch (e) {
            this.recordTrace('listFiles', { prefix }, { error: e.message });
            throw e;
        }
    }
    async readFile(path, start, end) {
        this.checkBudget();
        try {
            const result = await this.env.readFile(path, start, end);
            this.recordTrace('readFile', { path, start, end }, { span: result.span });
            return result;
        }
        catch (e) {
            this.recordTrace('readFile', { path, start, end }, { error: e.message });
            throw e;
        }
    }
    async searchText(pattern, opts) {
        this.checkBudget();
        try {
            const result = await this.env.searchText(pattern, opts);
            this.recordTrace('searchText', { pattern, opts }, { hits: result.length });
            return result;
        }
        catch (e) {
            this.recordTrace('searchText', { pattern, opts }, { error: e.message });
            throw e;
        }
    }
    checkBudget() {
        const now = Date.now();
        if (now - this.startTime > this.budget.maxWallMs) {
            throw new Error("Budget exceeded: maxWallMs");
        }
        // Future: check maxIterations, maxCostUsd etc.
    }
    recordTrace(action, input, output) {
        this.trace.push({
            timestamp: new Date().toISOString(),
            action,
            input,
            output
        });
    }
    getTrace() {
        return this.trace;
    }
    getMetrics() {
        return this.metrics;
    }
}
exports.RCRSession = RCRSession;
