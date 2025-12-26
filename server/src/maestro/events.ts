
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

export class MaestroEventBus extends EventEmitter {
  constructor() {
    super();
  }

  async emitRunCreated(runId: string, tenantId: string, templateId: string) {
    this.emit('maestro.run.created', { runId, tenantId, templateId, timestamp: new Date() });
    logger.info(`[MaestroEvent] Run Created: ${runId}`);
    // Already logged in repo create
  }

  async emitRunStarted(runId: string, tenantId: string) {
    this.emit('maestro.run.started', { runId, timestamp: new Date() });
    logger.info(`[MaestroEvent] Run Started: ${runId}`);
    await runEventsRepo.logEvent(runId, 'run.started', {}, tenantId);
  }

  async emitRunCompleted(runId: string, status: string, tenantId: string) {
    this.emit('maestro.run.completed', { runId, status, timestamp: new Date() });
    logger.info(`[MaestroEvent] Run Completed: ${runId} (${status})`);
    await runEventsRepo.logEvent(runId, 'run.completed', { status }, tenantId);
  }

  async emitTaskStarted(taskId: string, runId: string, kind: string, tenantId: string) {
    this.emit('maestro.task.started', { taskId, runId, kind, timestamp: new Date() });
    logger.info(`[MaestroEvent] Task Started: ${taskId} (${kind})`);
    await runEventsRepo.logEvent(runId, 'task.started', { taskId, kind }, tenantId);
  }

  async emitTaskCompleted(taskId: string, runId: string, result: any, tenantId: string) {
    this.emit('maestro.task.completed', { taskId, runId, timestamp: new Date() });
    logger.info(`[MaestroEvent] Task Completed: ${taskId}`);
    await runEventsRepo.logEvent(runId, 'task.completed', { taskId, result }, tenantId);
  }

  async emitTaskFailed(taskId: string, runId: string, error: string, tenantId: string) {
    this.emit('maestro.task.failed', { taskId, runId, error, timestamp: new Date() });
    logger.error(`[MaestroEvent] Task Failed: ${taskId} - ${error}`);
    await runEventsRepo.logEvent(runId, 'task.failed', { taskId, error }, tenantId);
  }
}

export const maestroEvents = new MaestroEventBus();
