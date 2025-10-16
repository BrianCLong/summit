import { v4 as uuid } from 'uuid';
import pino from 'pino';
import { ZodError } from 'zod';
const logger = pino({ name: 'ErrorMapper' });
export class UserFacingError extends Error {
    statusCode;
    traceId;
    constructor(message, statusCode, traceId) {
        super(message);
        this.statusCode = statusCode;
        this.traceId = traceId;
    }
}
export function mapGraphRAGError(error) {
    const traceId = uuid();
    let summary = 'Unknown error';
    if (error instanceof ZodError) {
        summary = error.issues
            .map((i) => `${i.path.join('.')}: ${i.message}`)
            .join('; ');
    }
    else if (error instanceof Error) {
        summary = error.message;
    }
    logger.warn({ traceId, issues: summary }, 'GraphRAG schema validation failed');
    return new UserFacingError(`Invalid GraphRAG response. Trace ID: ${traceId}`, 400, traceId);
}
//# sourceMappingURL=errors.js.map