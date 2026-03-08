"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChaosJobMiddleware = void 0;
const harness_js_1 = require("./harness.js");
// Generic interface to wrap job processing
class ChaosJobMiddleware {
    targetName;
    constructor(targetName = 'job-queue') {
        this.targetName = targetName;
    }
    async checkChaos() {
        const harness = harness_js_1.ChaosHarness.getInstance();
        await harness.delay(this.targetName);
        if (harness.shouldFail(this.targetName)) {
            throw new Error('Chaos injected Job failure');
        }
    }
}
exports.ChaosJobMiddleware = ChaosJobMiddleware;
