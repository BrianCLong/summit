"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startMetricsServer = exports.ReceiptWorkerMetrics = exports.ReceiptWorker = exports.InMemoryQueue = void 0;
exports.createReceiptWorker = createReceiptWorker;
const InMemoryQueue_js_1 = require("./queue/InMemoryQueue.js");
Object.defineProperty(exports, "InMemoryQueue", { enumerable: true, get: function () { return InMemoryQueue_js_1.InMemoryQueue; } });
const ReceiptWorker_js_1 = require("./ReceiptWorker.js");
Object.defineProperty(exports, "ReceiptWorker", { enumerable: true, get: function () { return ReceiptWorker_js_1.ReceiptWorker; } });
const metrics_js_1 = require("./metrics/metrics.js");
Object.defineProperty(exports, "ReceiptWorkerMetrics", { enumerable: true, get: function () { return metrics_js_1.ReceiptWorkerMetrics; } });
const server_js_1 = require("./metrics/server.js");
Object.defineProperty(exports, "startMetricsServer", { enumerable: true, get: function () { return server_js_1.startMetricsServer; } });
function createReceiptWorker({ handler, config, metrics = new metrics_js_1.ReceiptWorkerMetrics(), }) {
    const queue = new InMemoryQueue_js_1.InMemoryQueue();
    const deadLetterQueue = new InMemoryQueue_js_1.InMemoryQueue();
    const worker = new ReceiptWorker_js_1.ReceiptWorker({
        queue,
        deadLetterQueue,
        handler,
        metrics,
        config,
    });
    return { worker, queue, deadLetterQueue };
}
