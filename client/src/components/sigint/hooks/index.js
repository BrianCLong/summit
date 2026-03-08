"use strict";
/**
 * SIGINT Dashboard Hooks
 * Custom hooks for real-time signal data streaming.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.useRedisStream = void 0;
var useRedisStream_1 = require("./useRedisStream");
Object.defineProperty(exports, "useRedisStream", { enumerable: true, get: function () { return useRedisStream_1.useRedisStream; } });
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return __importDefault(useRedisStream_1).default; } });
