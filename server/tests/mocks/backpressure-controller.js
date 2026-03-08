"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackpressureController = exports.PriorityClass = void 0;
const events_1 = require("events");
const globals_1 = require("@jest/globals");
var PriorityClass;
(function (PriorityClass) {
    PriorityClass[PriorityClass["CRITICAL"] = 0] = "CRITICAL";
    PriorityClass[PriorityClass["NORMAL"] = 1] = "NORMAL";
    PriorityClass[PriorityClass["BEST_EFFORT"] = 2] = "BEST_EFFORT";
})(PriorityClass || (exports.PriorityClass = PriorityClass = {}));
class BackpressureController extends events_1.EventEmitter {
    static instance;
    static getInstance() {
        if (!BackpressureController.instance) {
            BackpressureController.instance = new BackpressureController();
        }
        return BackpressureController.instance;
    }
    requestAdmission = globals_1.jest.fn().mockResolvedValue({ allowed: true, status: 'ACCEPTED' });
    release = globals_1.jest.fn();
    getMetrics = globals_1.jest.fn().mockReturnValue({
        concurrency: 0,
        queueDepth: 0,
        queues: { critical: 0, normal: 0, bestEffort: 0 }
    });
}
exports.BackpressureController = BackpressureController;
