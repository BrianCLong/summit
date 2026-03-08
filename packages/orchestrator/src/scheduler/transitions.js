"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Scheduler = void 0;
const policy_1 = require("@summit/policy");
class Scheduler {
    graph;
    policy = new policy_1.OrchestratorPolicy();
    constructor(graph) {
        this.graph = graph;
    }
    applyEvent(event) {
        // Policy check logic
        let action = '';
        // Simple mapping for MWS
        if (event.type === 'TASK_STARTED')
            action = 'start_task';
        else if (event.type === 'TASK_COMPLETED')
            action = 'complete_task';
        if (action) {
            if (!this.policy.checkPermission(action, {})) {
                // In a real system we might flag this event as a violation
                console.warn(`Event ${event.type} potentially violated policy (simulation)`);
            }
        }
        switch (event.type) {
            case 'TASK_CREATED':
                this.graph.addTask(event.payload);
                break;
            case 'TASK_STARTED':
                {
                    const p = event.payload;
                    this.graph.startTask(p.taskId, p.agentId, p.timestamp);
                }
                break;
            case 'TASK_COMPLETED':
                {
                    const p = event.payload;
                    this.graph.completeTask(p.taskId, p.timestamp);
                }
                break;
        }
    }
}
exports.Scheduler = Scheduler;
