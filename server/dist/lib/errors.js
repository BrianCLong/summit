import { randomUUID as uuid } from 'crypto';
import baseLogger from '../config/logger';
import { ZodError } from 'zod';
const logger = baseLogger.child({ name: 'ErrorMapper' });
export class UserFacingError extends Error {
    statusCode;
    traceId;
    constructor(message, statusCode, traceId) {
        super(message);
        this.statusCode = statusCode;
        this.traceId = traceId;
    }
}
// Alias for backward compatibility
export const AppError = UserFacingError;
export function mapGraphRAGError(error) {
    const traceId = uuid();
    let summary = 'Unknown error';
    if (error instanceof ZodError) {
        summary = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    }
    else if (error instanceof Error) {
        summary = error.message;
    }
    logger.warn({ traceId, issues: summary }, 'GraphRAG schema validation failed');
    return new UserFacingError(`Invalid GraphRAG response. Trace ID: ${traceId}`, 400, traceId);
}
