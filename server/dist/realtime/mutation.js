import { z } from 'zod';
import pino from 'pino';
import { writeAudit } from '../utils/audit.js';
const logger = pino();
const mutationSchema = z.object({
    graphId: z.string(),
    entityId: z.string(),
    changes: z.record(z.any()),
});
export function registerMutationHandlers(socket) {
    socket.on('graph:join', ({ graphId }) => {
        if (graphId)
            socket.join(`graph:${graphId}`);
    });
    socket.on('graph:mutate', async (payload) => {
        const parsed = mutationSchema.safeParse(payload);
        if (!parsed.success) {
            socket.emit('error', 'INVALID_PAYLOAD');
            return;
        }
        const { graphId, entityId, changes } = parsed.data;
        const userId = socket.userId;
        socket.to(`graph:${graphId}`).emit('graph:mutated', {
            userId,
            entityId,
            changes,
            ts: Date.now(),
        });
        logger.info({ userId, graphId, entityId }, 'graph:mutate');
        await writeAudit({
            userId,
            action: 'graph.mutate',
            resourceType: 'graph',
            resourceId: graphId,
            details: { entityId, changes },
        });
    });
}
//# sourceMappingURL=mutation.js.map