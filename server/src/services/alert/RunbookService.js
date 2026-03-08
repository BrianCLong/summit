"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runbookService = exports.RunbookService = void 0;
const crypto_1 = __importDefault(require("crypto"));
class RunbookService {
    bindings = [];
    executions = [];
    constructor() {
        // In prod, load from DB
    }
    bindRunbook(ruleId, incidentTag, playbookId, autoRun = false) {
        this.bindings.push({ ruleId, incidentTag, playbookId, autoRun });
    }
    getBindingsForIncident(ruleId, incidentKey) {
        // Logic: match specific ruleId, or tags (not implemented fully here but placeholder)
        return this.bindings.filter(b => b.ruleId === ruleId);
    }
    async triggerRunbook(incidentId, playbookId) {
        const execution = {
            id: crypto_1.default.randomUUID(),
            playbookId,
            incidentId,
            status: 'pending',
            startedAt: Date.now()
        };
        this.executions.push(execution);
        // Simulate async execution
        this.executeRunbook(execution);
        return execution;
    }
    async executeRunbook(execution) {
        execution.status = 'running';
        // Mock delay
        await new Promise(resolve => setTimeout(resolve, 100));
        execution.status = 'completed';
    }
    getExecution(id) {
        return this.executions.find(e => e.id === id);
    }
}
exports.RunbookService = RunbookService;
exports.runbookService = new RunbookService();
