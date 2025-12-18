
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

export class MaestroEventBus extends EventEmitter {
  constructor() {
    super();
  }

  emitRunCreated(runId: string, tenantId: string, templateId: string) {
    this.emit('maestro.run.created', { runId, tenantId, templateId, timestamp: new Date() });
    logger.info(`[MaestroEvent] Run Created: ${runId}`);
  }

  emitRunStarted(runId: string) {
    this.emit('maestro.run.started', { runId, timestamp: new Date() });
    logger.info(`[MaestroEvent] Run Started: ${runId}`);
  }

  emitRunCompleted(runId: string, status: string) {
    this.emit('maestro.run.completed', { runId, status, timestamp: new Date() });
    logger.info(`[MaestroEvent] Run Completed: ${runId} (${status})`);
  }

  emitTaskStarted(taskId: string, runId: string, kind: string) {
    this.emit('maestro.task.started', { taskId, runId, kind, timestamp: new Date() });
    logger.info(`[MaestroEvent] Task Started: ${taskId} (${kind})`);
  }

  emitTaskCompleted(taskId: string, runId: string, result: any) {
    this.emit('maestro.task.completed', { taskId, runId, timestamp: new Date() });
    logger.info(`[MaestroEvent] Task Completed: ${taskId}`);
  }

  emitTaskFailed(taskId: string, runId: string, error: string) {
    this.emit('maestro.task.failed', { taskId, runId, error, timestamp: new Date() });
    logger.error(`[MaestroEvent] Task Failed: ${taskId} - ${error}`);
  }
}

export const maestroEvents = new MaestroEventBus();
