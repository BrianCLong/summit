"use strict";
/**
 * Usage tracker - records prompt usage for analytics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsageTracker = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const os_1 = require("os");
class UsageTracker {
    metricsFile;
    constructor() {
        const dataDir = (0, path_1.join)((0, os_1.homedir)(), '.intelgraph', 'prompt-system');
        if (!(0, fs_1.existsSync)(dataDir)) {
            (0, fs_1.mkdirSync)(dataDir, { recursive: true });
        }
        this.metricsFile = (0, path_1.join)(dataDir, 'usage-metrics.jsonl');
    }
    /**
     * Record a prompt usage event
     */
    track(metric) {
        const line = JSON.stringify(metric) + '\n';
        try {
            (0, fs_1.writeFileSync)(this.metricsFile, line, { flag: 'a' });
        }
        catch (error) {
            console.warn('Failed to track usage metric:', error);
        }
    }
    /**
     * Get all recorded metrics
     */
    getAll() {
        if (!(0, fs_1.existsSync)(this.metricsFile)) {
            return [];
        }
        const content = (0, fs_1.readFileSync)(this.metricsFile, 'utf-8');
        const lines = content.trim().split('\n').filter(Boolean);
        return lines.map(line => {
            try {
                return JSON.parse(line);
            }
            catch {
                return null;
            }
        }).filter((m) => m !== null);
    }
    /**
     * Get metrics for a specific template
     */
    getForTemplate(templateId) {
        return this.getAll().filter(m => m.templateId === templateId);
    }
    /**
     * Get metrics within a time period
     */
    getForPeriod(days) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffTime = cutoff.toISOString();
        return this.getAll().filter(m => m.timestamp >= cutoffTime);
    }
    /**
     * Clear all metrics
     */
    clear() {
        if ((0, fs_1.existsSync)(this.metricsFile)) {
            (0, fs_1.writeFileSync)(this.metricsFile, '');
        }
    }
}
exports.UsageTracker = UsageTracker;
