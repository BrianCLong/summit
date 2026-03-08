"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupBullBoard = void 0;
// @ts-nocheck
const api_1 = require("@bull-board/api");
const bullMQAdapter_js_1 = require("@bull-board/api/bullMQAdapter.js");
const express_1 = require("@bull-board/express");
const setupBullBoard = (queues) => {
    const serverAdapter = new express_1.ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');
    (0, api_1.createBullBoard)({
        queues: queues.map((queue) => new bullMQAdapter_js_1.BullMQAdapter(queue)),
        serverAdapter,
    });
    return serverAdapter;
};
exports.setupBullBoard = setupBullBoard;
