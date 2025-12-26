import { EventEmitter } from 'events';

export class AuditEmitter extends EventEmitter {}

export const auditEmitter = new AuditEmitter();
