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
exports.systemMonitor = void 0;
// @ts-nocheck
const v8 = __importStar(require("v8"));
const os = __importStar(require("os"));
const logger_js_1 = require("../config/logger.js");
class SystemMonitor {
    static instance;
    lastCpuUsage = null;
    lastCpuTime = Date.now();
    currentCpuLoad = 0;
    // Thresholds
    MEMORY_THRESHOLD = 0.85; // 85% heap usage
    CPU_THRESHOLD = 0.90; // 90% CPU load
    constructor() {
        // Start periodic sampling
        setInterval(() => this.sampleCpu(), 5000).unref();
    }
    static getInstance() {
        if (!SystemMonitor.instance) {
            SystemMonitor.instance = new SystemMonitor();
        }
        return SystemMonitor.instance;
    }
    sampleCpu() {
        const currentCpuUsage = process.cpuUsage();
        const currentTime = Date.now();
        if (this.lastCpuUsage) {
            const timeDiff = currentTime - this.lastCpuTime;
            const userDiff = currentCpuUsage.user - this.lastCpuUsage.user;
            const systemDiff = currentCpuUsage.system - this.lastCpuUsage.system;
            // Calculate % usage (microseconds / milliseconds * 1000)
            const totalUsage = (userDiff + systemDiff) / (timeDiff * 1000);
            this.currentCpuLoad = Math.min(1.0, totalUsage);
        }
        this.lastCpuUsage = currentCpuUsage;
        this.lastCpuTime = currentTime;
    }
    getHealth() {
        const heapStats = v8.getHeapStatistics();
        const memoryUsage = heapStats.used_heap_size / heapStats.heap_size_limit;
        const loadAvg = os.loadavg();
        const cpuUsage = this.currentCpuLoad;
        let isOverloaded = false;
        let reason;
        if (memoryUsage > this.MEMORY_THRESHOLD) {
            isOverloaded = true;
            reason = `Memory usage critical: ${(memoryUsage * 100).toFixed(1)}%`;
            logger_js_1.logger.warn({ memoryUsage, threshold: this.MEMORY_THRESHOLD }, 'System Monitor: Memory overload detected');
        }
        else if (cpuUsage > this.CPU_THRESHOLD) {
            isOverloaded = true;
            reason = `CPU usage critical: ${(cpuUsage * 100).toFixed(1)}%`;
            logger_js_1.logger.warn({ cpuUsage, threshold: this.CPU_THRESHOLD }, 'System Monitor: CPU overload detected');
        }
        return {
            isOverloaded,
            reason,
            metrics: {
                cpuUsage,
                memoryUsage,
                uptime: process.uptime(),
                loadAverage: loadAvg,
            },
        };
    }
}
exports.systemMonitor = SystemMonitor.getInstance();
