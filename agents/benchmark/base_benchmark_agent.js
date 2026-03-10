// Sentinel exports for TypeScript type aliases and interfaces erased at compile time
export const AgentMemory = {};
export const RunContext = {};
export const BenchmarkAgent = {};

export class BaseBenchmarkAgent {
    context;
    stepHistory = [];
    async init(runContext) {
        this.context = runContext;
        this.stepHistory = [];
    }
    async update(stepResult) {
        this.stepHistory.push(stepResult);
    }
    async finalize() {
        return {
            stepsTaken: this.stepHistory.length
        };
    }
}
