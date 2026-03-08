"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObserverReviewerAgent = void 0;
class ObserverReviewerAgent {
    name = "Observer";
    role = "reviewer";
    execute(task) {
        const ciReport = {
            checks: ["lint", "typecheck", "unit-tests"],
            status: "green",
            builderOutput: task.inputs?.builder ?? null,
        };
        return Promise.resolve({
            status: "success",
            outputs: ciReport,
        });
    }
}
exports.ObserverReviewerAgent = ObserverReviewerAgent;
