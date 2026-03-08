"use strict";
/**
 * Command Reporter
 * Real-time reporting to command and coalition partners
 * Supports priority-based transmission and classification handling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandReporter = void 0;
const eventemitter3_1 = require("eventemitter3");
const socket_io_1 = require("socket.io");
const socket_io_client_1 = require("socket.io-client");
const uuid_1 = require("uuid");
const logger_js_1 = require("../utils/logger.js");
class CommandReporter extends eventemitter3_1.EventEmitter {
    server;
    satelliteHandler;
    subscribers = new Map();
    pendingReports = [];
    sentReports = new Map();
    coalitionEndpoints = new Map();
    MAX_PENDING_REPORTS = 1000;
    MAX_SENT_HISTORY = 5000;
    REPORT_TTL_SECONDS = 3600;
    constructor(options = {}) {
        super();
        this.satelliteHandler = options.satelliteHandler;
        if (options.port) {
            this.initializeServer(options.port);
        }
    }
    initializeServer(port) {
        this.server = new socket_io_1.Server(port, {
            cors: { origin: '*' },
            transports: ['websocket', 'polling'],
        });
        this.server.on('connection', (socket) => {
            this.handleConnection(socket);
        });
        logger_js_1.logger.info('Command reporter server started', { port });
    }
    handleConnection(socket) {
        const subscriberId = (0, uuid_1.v4)();
        socket.on('subscribe', (data) => {
            const subscriber = {
                id: subscriberId,
                socket,
                classification: data.classification,
                topics: data.topics,
                connected: true,
            };
            this.subscribers.set(subscriberId, subscriber);
            this.emit('subscriber:connected', subscriberId);
            logger_js_1.logger.info('Subscriber connected', { subscriberId, topics: data.topics });
        });
        socket.on('disconnect', () => {
            const subscriber = this.subscribers.get(subscriberId);
            if (subscriber) {
                subscriber.connected = false;
                this.emit('subscriber:disconnected', subscriberId);
            }
        });
        socket.on('ack', (reportId) => {
            this.emit('report:delivered', reportId, subscriberId);
        });
    }
    /**
     * Register a coalition partner endpoint
     */
    registerCoalitionEndpoint(partnerId, endpoint) {
        this.coalitionEndpoints.set(partnerId, endpoint);
        logger_js_1.logger.info('Coalition endpoint registered', { partnerId, endpoint });
    }
    /**
     * Send a status report
     */
    async sendStatusReport(source, destination, workflow, additionalMetrics) {
        const report = this.createReport({
            type: 'status',
            priority: 'routine',
            source,
            destination,
            classification: 'unclass',
            payload: {
                workflowId: workflow.id,
                summary: `Workflow ${workflow.name} status: ${workflow.state}`,
                details: {
                    state: workflow.state,
                    tasksTotal: workflow.tasks.length,
                    tasksCompleted: workflow.tasks.filter(t => t.state === 'completed').length,
                    tasksFailed: workflow.tasks.filter(t => t.state === 'failed').length,
                    tasksRunning: workflow.tasks.filter(t => t.state === 'running').length,
                },
                metrics: additionalMetrics,
            },
        });
        return this.sendReport(report);
    }
    /**
     * Send an alert report
     */
    async sendAlertReport(source, destination, priority, summary, details, classification = 'unclass') {
        const report = this.createReport({
            type: 'alert',
            priority,
            source,
            destination,
            classification,
            payload: {
                summary,
                details,
                recommendations: this.generateRecommendations(details),
            },
        });
        return this.sendReport(report);
    }
    /**
     * Send a completion report
     */
    async sendCompletionReport(source, destination, workflow, results) {
        const report = this.createReport({
            type: 'completion',
            priority: 'priority',
            source,
            destination,
            classification: 'unclass',
            payload: {
                workflowId: workflow.id,
                summary: `Workflow ${workflow.name} completed successfully`,
                details: {
                    duration: this.calculateDuration(workflow),
                    tasksExecuted: workflow.tasks.length,
                    results,
                },
                metrics: {
                    totalTasks: workflow.tasks.length,
                    successRate: workflow.tasks.filter(t => t.state === 'completed').length / workflow.tasks.length,
                },
            },
        });
        return this.sendReport(report);
    }
    /**
     * Send a failure report
     */
    async sendFailureReport(source, destination, workflow, task, error) {
        const report = this.createReport({
            type: 'failure',
            priority: 'immediate',
            source,
            destination,
            classification: 'unclass',
            payload: {
                workflowId: workflow.id,
                taskId: task.id,
                summary: `Task ${task.name} failed: ${error}`,
                details: {
                    workflowState: workflow.state,
                    taskState: task.state,
                    error: task.error,
                    recoverable: task.error?.recoverable ?? false,
                },
                recommendations: [
                    'Review task configuration',
                    'Check network connectivity',
                    'Verify resource availability',
                ],
            },
        });
        return this.sendReport(report);
    }
    /**
     * Send a healing report
     */
    async sendHealingReport(source, destination, action) {
        const report = this.createReport({
            type: 'healing',
            priority: action.success ? 'priority' : 'immediate',
            source,
            destination,
            classification: 'unclass',
            payload: {
                summary: `Healing action ${action.strategy}: ${action.success ? 'succeeded' : 'failed'}`,
                details: {
                    strategy: action.strategy,
                    targetId: action.targetId,
                    targetType: action.targetType,
                    reason: action.reason,
                    success: action.success,
                    ...action.details,
                },
            },
        });
        return this.sendReport(report);
    }
    /**
     * Broadcast report to all applicable subscribers
     */
    async broadcastReport(report) {
        for (const subscriber of this.subscribers.values()) {
            if (!subscriber.connected) {
                continue;
            }
            // Check classification
            if (!this.canReceiveClassification(subscriber.classification, report.classification)) {
                continue;
            }
            // Check topic subscription
            const matchesTopic = subscriber.topics.some(topic => topic === '*' || topic === report.type);
            if (matchesTopic) {
                subscriber.socket.emit('report', report);
            }
        }
    }
    createReport(data) {
        return {
            ...data,
            id: (0, uuid_1.v4)(),
            timestamp: new Date(),
        };
    }
    async sendReport(report) {
        // Broadcast to local subscribers
        await this.broadcastReport(report);
        // Send to coalition partners
        for (const partnerId of report.destination) {
            const endpoint = this.coalitionEndpoints.get(partnerId);
            if (endpoint) {
                await this.sendToCoalition(report, endpoint);
            }
        }
        // Queue for satellite if needed
        if (this.satelliteHandler && !this.hasLocalConnectivity(report.destination)) {
            this.queueForSatellite(report);
        }
        this.sentReports.set(report.id, report);
        this.emit('report:sent', report);
        // Cleanup old reports
        this.cleanupSentReports();
        return report;
    }
    async sendToCoalition(report, endpoint) {
        try {
            const client = (0, socket_io_client_1.io)(endpoint, {
                transports: ['websocket'],
                timeout: 5000,
            });
            await new Promise((resolve, reject) => {
                client.on('connect', () => {
                    client.emit('report', report);
                    client.disconnect();
                    resolve();
                });
                client.on('connect_error', reject);
                setTimeout(() => {
                    client.disconnect();
                    reject(new Error('Connection timeout'));
                }, 5000);
            });
            this.emit('report:delivered', report.id, endpoint);
        }
        catch (error) {
            logger_js_1.logger.warn('Failed to send report to coalition', { endpoint, reportId: report.id });
            // Queue for later retry
            if (this.pendingReports.length < this.MAX_PENDING_REPORTS) {
                this.pendingReports.push(report);
                this.emit('report:queued', report);
            }
        }
    }
    queueForSatellite(report) {
        if (!this.satelliteHandler) {
            return;
        }
        const priority = this.mapPriorityToSatellite(report.priority);
        const payload = Buffer.from(JSON.stringify(report));
        try {
            this.satelliteHandler.queueMessage(priority, payload, report.destination.join(','), this.REPORT_TTL_SECONDS);
            this.emit('report:queued', report);
        }
        catch (error) {
            this.emit('report:failed', report.id, 'Satellite queue full');
        }
    }
    mapPriorityToSatellite(priority) {
        return priority;
    }
    hasLocalConnectivity(destinations) {
        for (const dest of destinations) {
            const subscriber = Array.from(this.subscribers.values()).find(s => s.id === dest && s.connected);
            if (subscriber) {
                return true;
            }
            if (this.coalitionEndpoints.has(dest)) {
                return true;
            }
        }
        return false;
    }
    canReceiveClassification(subscriberLevel, reportLevel) {
        const levels = { unclass: 0, secret: 1, topsecret: 2 };
        return levels[subscriberLevel] >= levels[reportLevel];
    }
    generateRecommendations(details) {
        const recommendations = [];
        if (details.error) {
            recommendations.push('Review error logs for root cause');
        }
        if (details.networkIssue) {
            recommendations.push('Check network connectivity and routing');
        }
        if (details.resourceExhausted) {
            recommendations.push('Scale resources or reduce workload');
        }
        return recommendations.length > 0
            ? recommendations
            : ['Monitor situation', 'Await further updates'];
    }
    calculateDuration(workflow) {
        if (!workflow.createdAt) {
            return 0;
        }
        const endTime = workflow.tasks
            .filter(t => t.completedAt)
            .reduce((max, t) => Math.max(max, t.completedAt.getTime()), 0);
        return endTime > 0 ? endTime - workflow.createdAt.getTime() : 0;
    }
    cleanupSentReports() {
        if (this.sentReports.size > this.MAX_SENT_HISTORY) {
            const sortedIds = Array.from(this.sentReports.entries())
                .sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime())
                .slice(0, this.sentReports.size - this.MAX_SENT_HISTORY)
                .map(([id]) => id);
            for (const id of sortedIds) {
                this.sentReports.delete(id);
            }
        }
    }
    /**
     * Get report statistics
     */
    getReportStats() {
        const byType = {};
        const byPriority = {};
        for (const report of this.sentReports.values()) {
            byType[report.type] = (byType[report.type] ?? 0) + 1;
            byPriority[report.priority] = (byPriority[report.priority] ?? 0) + 1;
        }
        return {
            sent: this.sentReports.size,
            pending: this.pendingReports.length,
            subscribers: Array.from(this.subscribers.values()).filter(s => s.connected).length,
            byType,
            byPriority,
        };
    }
    dispose() {
        this.server?.close();
        this.removeAllListeners();
    }
}
exports.CommandReporter = CommandReporter;
