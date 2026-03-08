"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maestroEvents = exports.MaestroEventBus = void 0;
const events_1 = require("events");
const logger_js_1 = require("../utils/logger.js");
class MaestroEventBus extends events_1.EventEmitter {
    constructor() {
        super();
    }
    emitRunCreated(runId, tenantId, templateId) {
        this.emit('maestro.run.created', { runId, tenantId, templateId, timestamp: new Date() });
        logger_js_1.logger.info(`[MaestroEvent] Run Created: ${runId}`);
    }
    emitRunStarted(runId) {
        this.emit('maestro.run.started', { runId, timestamp: new Date() });
        logger_js_1.logger.info(`[MaestroEvent] Run Started: ${runId}`);
    }
    emitRunCompleted(runId, status) {
        this.emit('maestro.run.completed', { runId, status, timestamp: new Date() });
        logger_js_1.logger.info(`[MaestroEvent] Run Completed: ${runId} (${status})`);
    }
    emitTaskStarted(taskId, runId, kind) {
        this.emit('maestro.task.started', { taskId, runId, kind, timestamp: new Date() });
        logger_js_1.logger.info(`[MaestroEvent] Task Started: ${taskId} (${kind})`);
    }
    emitTaskCompleted(taskId, runId, result) {
        this.emit('maestro.task.completed', { taskId, runId, timestamp: new Date() });
        logger_js_1.logger.info(`[MaestroEvent] Task Completed: ${taskId}`);
    }
    emitTaskFailed(taskId, runId, error) {
        this.emit('maestro.task.failed', { taskId, runId, error, timestamp: new Date() });
        logger_js_1.logger.error(`[MaestroEvent] Task Failed: ${taskId} - ${error}`);
    }
}
exports.MaestroEventBus = MaestroEventBus;
exports.maestroEvents = new MaestroEventBus();
