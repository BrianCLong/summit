"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.winstonLogger = exports.logger = void 0;
const structuredLogger_js_1 = require("../src/logging/structuredLogger.js");
const winstonBridge_js_1 = require("../src/logging/winstonBridge.js");
exports.logger = structuredLogger_js_1.appLogger;
exports.winstonLogger = winstonBridge_js_1.winstonBridge;
exports.default = structuredLogger_js_1.appLogger;
