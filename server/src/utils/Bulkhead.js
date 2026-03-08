"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bulkhead = void 0;
const logger_js_1 = __importDefault(require("./logger.js"));
class Bulkhead {
    capacity;
    currentactive = 0;
    waiting = 0;
    maxWaitTime;
    name;
    constructor(options) {
        this.capacity = options.capacity;
        this.maxWaitTime = options.maxWaitTime || 5000;
        this.name = options.name;
    }
    async execute(task) {
        if (this.currentactive >= this.capacity) {
            this.waiting++;
            logger_js_1.default.warn(`[Bulkhead] ${this.name} is at capacity (${this.capacity}). Task waiting. Queued: ${this.waiting}`);
            // Basic wait mechanism
            const start = Date.now();
            while (this.currentactive >= this.capacity) {
                if (Date.now() - start > this.maxWaitTime) {
                    this.waiting--;
                    throw new Error(`[Bulkhead] ${this.name} queue timeout`);
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            this.waiting--;
        }
        this.currentactive++;
        try {
            return await task();
        }
        finally {
            this.currentactive--;
        }
    }
    get stats() {
        return {
            name: this.name,
            active: this.currentactive,
            waiting: this.waiting,
            capacity: this.capacity
        };
    }
}
exports.Bulkhead = Bulkhead;
