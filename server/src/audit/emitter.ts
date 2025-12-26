
import { EventEmitter } from 'events';
import { logger } from '../config/logger.js';

class AuditEmitter extends EventEmitter {}

export const auditEmitter = new AuditEmitter();

// Optional: Log all audit events in dev mode
if (process.env.NODE_ENV === 'development') {
  auditEmitter.on('audit', (event) => {
    logger.debug({ event }, 'Audit event emitted');
  });
}
