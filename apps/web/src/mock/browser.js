"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.worker = void 0;
const browser_1 = require("msw/browser");
const handlers_1 = require("./handlers");
exports.worker = (0, browser_1.setupWorker)(...handlers_1.handlers);
