import { Socket } from 'socket.io';
import { z } from 'zod';
import pino from 'pino';
import { writeAudit } from '../utils/audit.js';

const logger = pino();

interface AuthedSocket extends Socket {
  userId?: string;
}

const mutationSchema = z.object({
  graphId: z.string(),
  entityId: z.string(),
  changes: z.record(z.any()),
});

export function registerMutationHandlers(socket: AuthedSocket) {
  socket.on('graph:join', ({ graphId }: { graphId: string }) => {
    if (graphId) socket.join(`graph:${graphId}`);
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
