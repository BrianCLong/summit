"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueEvents = exports.Worker = exports.Queue = void 0;
const globals_1 = require("@jest/globals");
class Queue {
    name;
    constructor(name) {
        this.name = name;
    }
    add = globals_1.jest.fn().mockResolvedValue({ id: 'mock-job-id' });
    on = globals_1.jest.fn();
    close = globals_1.jest.fn().mockResolvedValue(undefined);
    getJob = globals_1.jest.fn().mockResolvedValue(null);
    getJobs = globals_1.jest.fn().mockResolvedValue([]);
}
exports.Queue = Queue;
class Worker {
    name;
    processor;
    constructor(name, processor) {
        this.name = name;
        this.processor = processor;
    }
    on = globals_1.jest.fn();
    close = globals_1.jest.fn().mockResolvedValue(undefined);
}
exports.Worker = Worker;
class QueueEvents {
    name;
    constructor(name) {
        this.name = name;
    }
    on = globals_1.jest.fn();
    close = globals_1.jest.fn().mockResolvedValue(undefined);
}
exports.QueueEvents = QueueEvents;
exports.default = {
    Queue,
    Worker,
    QueueEvents,
};
