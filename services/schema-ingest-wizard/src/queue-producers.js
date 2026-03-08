"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueOcr = queueOcr;
// @ts-nocheck
const queue_js_1 = require("../../libs/ops/src/queue.js");
async function queueOcr(filePath) {
    return (0, queue_js_1.enqueue)({ type: 'OCR', payload: { filePath } });
}
