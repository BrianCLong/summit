"use strict";
/**
 * Collection Manager - Orchestrates multiple collectors
 * TRAINING/SIMULATION ONLY
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectionManager = void 0;
const eventemitter3_1 = require("eventemitter3");
const uuid_1 = require("uuid");
const SignalCollector_1 = require("./SignalCollector");
class CollectionManager extends eventemitter3_1.EventEmitter {
    config;
    collectors = new Map();
    tasks = new Map();
    signals = [];
    complianceLog = [];
    constructor(config = {}) {
        super();
        this.config = {
            maxConcurrentTasks: config.maxConcurrentTasks || 10,
            signalRetentionHours: config.signalRetentionHours || 72,
            autoMinimization: config.autoMinimization ?? true,
            complianceMode: config.complianceMode || 'TRAINING'
        };
        console.log(`[SIGINT] Collection Manager initialized in ${this.config.complianceMode} mode`);
    }
    async addCollector(config) {
        const collector = new SignalCollector_1.SignalCollector(config);
        collector.on('signal:received', (signal) => {
            this.handleSignal(signal);
        });
        collector.on('error', (error) => {
            this.emit('error', error);
        });
        await collector.initialize();
        this.collectors.set(config.id, collector);
        this.emit('collector:added', collector);
        this.logCompliance('COLLECTOR_ADDED', undefined, `Added collector: ${config.name}`);
        return collector;
    }
    async removeCollector(collectorId) {
        const collector = this.collectors.get(collectorId);
        if (collector) {
            await collector.shutdown();
            this.collectors.delete(collectorId);
            this.emit('collector:removed', collectorId);
            this.logCompliance('COLLECTOR_REMOVED', undefined, `Removed collector: ${collectorId}`);
        }
    }
    async createTask(params) {
        // Validate legal authority
        if (!params.legalAuthority) {
            throw new Error('Legal authority is required for all collection tasks');
        }
        const now = new Date();
        const task = {
            id: (0, uuid_1.v4)(),
            name: params.name,
            description: params.description,
            targetFrequencies: params.targetFrequencies,
            targetSignalTypes: params.targetSignalTypes,
            targetLocations: params.targetLocations,
            startTime: now,
            endTime: new Date(now.getTime() + params.durationHours * 3600000),
            continuous: false,
            legalAuthority: params.legalAuthority,
            expirationDate: new Date(now.getTime() + params.durationHours * 3600000),
            minimizationRequired: params.minimizationRequired ?? true,
            status: 'PENDING',
            isTrainingTask: true
        };
        this.tasks.set(task.id, task);
        this.emit('task:created', task);
        this.logCompliance('TASK_CREATED', task.id, `Created task: ${task.name}, Authority: ${task.legalAuthority}`);
        return task;
    }
    async assignTask(taskId, collectorId) {
        const task = this.tasks.get(taskId);
        const collector = this.collectors.get(collectorId);
        if (!task)
            throw new Error(`Task ${taskId} not found`);
        if (!collector)
            throw new Error(`Collector ${collectorId} not found`);
        // Check task expiration
        if (task.expirationDate < new Date()) {
            throw new Error('Cannot assign expired task');
        }
        // Check concurrent task limit
        const activeTasks = Array.from(this.tasks.values()).filter(t => t.status === 'ACTIVE');
        if (activeTasks.length >= this.config.maxConcurrentTasks) {
            throw new Error(`Maximum concurrent tasks (${this.config.maxConcurrentTasks}) reached`);
        }
        task.status = 'ACTIVE';
        await collector.startCollection(task);
        this.emit('task:assigned', task, collectorId);
        this.logCompliance('TASK_ASSIGNED', taskId, `Assigned to collector: ${collectorId}`);
    }
    handleSignal(signal) {
        // Apply minimization if required
        if (this.config.autoMinimization) {
            this.applyMinimization(signal);
        }
        this.signals.push(signal);
        this.emit('signal:collected', signal);
        // Clean old signals
        this.cleanOldSignals();
    }
    applyMinimization(signal) {
        // Simulated minimization - in real systems this would redact US person information
        signal.metadata.minimized = true;
        // Log minimization action
        this.logCompliance('MINIMIZATION_APPLIED', signal.metadata.missionId, `Signal ${signal.metadata.id} minimized`);
    }
    cleanOldSignals() {
        const cutoff = new Date(Date.now() - this.config.signalRetentionHours * 3600000);
        this.signals = this.signals.filter(s => s.metadata.timestamp > cutoff);
    }
    logCompliance(action, taskId, details) {
        this.complianceLog.push({
            timestamp: new Date(),
            action,
            taskId,
            details
        });
    }
    getStats() {
        const signalsByType = {};
        const signalsByCategory = {};
        for (const signal of this.signals) {
            const type = signal.metadata.signalType;
            const category = signal.metadata.category;
            signalsByType[type] = (signalsByType[type] || 0) + 1;
            signalsByCategory[category] = (signalsByCategory[category] || 0) + 1;
        }
        const activeCollectors = Array.from(this.collectors.values())
            .filter(c => c.getStatus() === 'COLLECTING').length;
        const activeTasks = Array.from(this.tasks.values())
            .filter(t => t.status === 'ACTIVE').length;
        return {
            totalSignals: this.signals.length,
            signalsByType,
            signalsByCategory,
            activeCollectors,
            activeTasks
        };
    }
    getCollectors() {
        return Array.from(this.collectors.values());
    }
    getTasks() {
        return Array.from(this.tasks.values());
    }
    getSignals(filter) {
        let result = [...this.signals];
        if (filter?.signalType) {
            result = result.filter(s => s.metadata.signalType === filter.signalType);
        }
        if (filter?.category) {
            result = result.filter(s => s.metadata.category === filter.category);
        }
        if (filter?.since) {
            result = result.filter(s => s.metadata.timestamp >= filter.since);
        }
        return result;
    }
    getComplianceLog() {
        return [...this.complianceLog];
    }
    async shutdown() {
        for (const collector of this.collectors.values()) {
            await collector.shutdown();
        }
        this.collectors.clear();
        this.tasks.clear();
        this.logCompliance('SYSTEM_SHUTDOWN', undefined, 'Collection manager shut down');
        console.log('[SIGINT] Collection Manager shut down');
    }
}
exports.CollectionManager = CollectionManager;
//# sourceMappingURL=CollectionManager.js.map