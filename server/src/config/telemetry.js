"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.telemetryConfig = void 0;
exports.telemetryConfig = {
    snapshotter: {
        memoryThreshold: 1.5 * 1024 * 1024 * 1024, // 1.5 GB
        latencyThreshold: 2000, // 2 seconds
    },
};
