"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
await globals_1.jest.unstable_mockModule('../../observability/metrics.js', () => ({
    registry: {
        contentType: 'text/plain; version=0.0.4',
        metrics: globals_1.jest.fn(async () => 'reliability_request_duration_seconds 1'),
    },
}));
const { metricsRoute } = await Promise.resolve().then(() => __importStar(require('../metricsRoute.js')));
(0, globals_1.describe)('metricsRoute', () => {
    (0, globals_1.it)('returns a metrics payload with reliability collectors', async () => {
        const headers = {};
        const res = {
            set: globals_1.jest.fn((key, value) => {
                headers[key.toLowerCase()] = value;
                return res;
            }),
            status: globals_1.jest.fn(() => res),
            send: globals_1.jest.fn(),
        };
        await metricsRoute({}, res);
        (0, globals_1.expect)(res.send).toHaveBeenCalled();
        (0, globals_1.expect)(headers['content-type']).toContain('text/plain');
    });
});
