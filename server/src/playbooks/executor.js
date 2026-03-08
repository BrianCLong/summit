"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaybookExecutor = void 0;
// @ts-nocheck
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const defaultHandlers = {
    log: async (step) => {
        logger_js_1.default.info('Playbook log step', { stepId: step.id, message: step.message });
        return { message: step.message };
    },
    delay: async (step) => {
        await new Promise((resolve) => setTimeout(resolve, step.durationMs));
        return { durationMs: step.durationMs };
    },
};
class PlaybookExecutor {
    handlers;
    constructor(handlers = defaultHandlers) {
        this.handlers = handlers;
    }
    async execute(playbook) {
        const results = [];
        for (const step of playbook.steps) {
            const startedAt = new Date().toISOString();
            try {
                const handler = this.getHandler(step.type);
                const output = await handler(step);
                const finishedAt = new Date().toISOString();
                results.push({
                    stepId: step.id,
                    type: step.type,
                    status: 'success',
                    startedAt,
                    finishedAt,
                    output,
                });
            }
            catch (error) {
                const finishedAt = new Date().toISOString();
                const message = error instanceof Error ? error.message : 'Unknown error';
                results.push({
                    stepId: step.id,
                    type: step.type,
                    status: 'failed',
                    startedAt,
                    finishedAt,
                    error: message,
                });
                throw error;
            }
        }
        return results;
    }
    getHandler(type) {
        const handler = this.handlers[type];
        if (!handler) {
            throw new Error(`No handler registered for step type: ${type}`);
        }
        return handler;
    }
}
exports.PlaybookExecutor = PlaybookExecutor;
