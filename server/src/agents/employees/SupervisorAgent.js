"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupervisorAgent = void 0;
const AgentEmployee_js_1 = require("./AgentEmployee.js");
class SupervisorAgent extends AgentEmployee_js_1.AgentEmployee {
    async processTask(task) {
        this.status = 'working';
        this.log(`Reviewing task: ${task.type} - ${task.description}`);
        if (task.status === 'completed') {
            // Simulate review logic
            this.log(`Reviewing completed task ${task.id} from ${task.assignedTo}`);
            // Basic logic: if result has error, reject. Else approve.
            if (task.result && task.result.error) {
                this.log(`Task rejected due to error: ${task.result.error}`);
                // In a real system, we might re-assign or escalate
            }
            else {
                this.log(`Task approved.`);
                // Could trigger next steps here
            }
            task.history.push({ timestamp: Date.now(), action: 'reviewed', actor: this.id });
        }
        else {
            this.log(`Task is not completed, cannot review.`);
        }
        this.status = 'idle';
    }
    async delegate(task, worker) {
        this.log(`Delegating task ${task.id} to ${worker.name}`);
        await worker.processTask(task);
        // After worker finishes, supervisor reviews
        await this.processTask(task);
    }
}
exports.SupervisorAgent = SupervisorAgent;
