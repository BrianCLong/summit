"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncubationSandbox = void 0;
const budget_js_1 = require("./budget.js");
const registry_js_1 = require("./registry.js");
class IncubationSandbox {
    registry;
    constructor() {
        this.registry = new registry_js_1.SafeToolRegistry();
    }
    async run(capability, input, limits) {
        const budget = new budget_js_1.SimpleBudgetManager(limits);
        const violations = [];
        const logs = [];
        const context = {
            tools: this.registry,
            budget: budget,
            logger: (msg) => logs.push(msg),
        };
        const startTime = Date.now();
        try {
            // Wrap execution to catch errors (including budget/security)
            const result = await capability.run(input, context);
            return {
                ...result,
                metrics: {
                    ...result.metrics,
                    durationMs: Date.now() - startTime
                },
                violations: [...violations, ...result.violations]
            };
        }
        catch (error) {
            if (error.message.includes('Security Violation')) {
                violations.push(error.message);
            }
            if (error.message.includes('Budget exceeded')) {
                violations.push(error.message);
            }
            return {
                success: false,
                output: `Execution failed: ${error.message}`,
                metrics: {
                    steps: 0, // Incomplete
                    tokens: 0,
                    durationMs: Date.now() - startTime
                },
                violations: violations
            };
        }
    }
}
exports.IncubationSandbox = IncubationSandbox;
