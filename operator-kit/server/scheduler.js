"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueuePower = enqueuePower;
exports.startScheduler = startScheduler;
const events_1 = require("./events");
const queues = { power: [] };
function enqueuePower(job) {
    queues.power.push(job);
}
function budgetFrac(model) {
    // Placeholder: wire to your LiteLLM counters; treat as 0 here
    return 0;
}
function windowOpen(model) {
    // Read current gauge; if nonzero, assume open (this is illustrative)
    try {
        // no public read of prom-client gauges; assume 1 if set recently by planner
        return true;
    }
    catch {
        return false;
    }
}
function startScheduler() {
    setInterval(() => {
        const q = queues.power;
        const job = q.shift();
        if (!job)
            return;
        if (!windowOpen(job.model) || budgetFrac(job.model) >= 0.8) {
            // requeue at tail or downgrade in your router
            q.push(job);
            return;
        }
        (0, events_1.emit)({
            type: 'budget.update',
            model: job.model,
            fraction: budgetFrac(job.model),
        });
        // dispatch(job) -> your executor
    }, 1000);
}
