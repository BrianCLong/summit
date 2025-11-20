import { Socket } from 'socket.io';
import pino from 'pino';
import { getRedisClient } from '../db/redis.js';
import { TimeSeriesService } from '../services/TimeSeriesService.js';

const logger = pino();
const redis = getRedisClient();
const sub = redis.duplicate();
const timeSeries = new TimeSeriesService();

// Map to track active subscriptions: metric -> set of socket IDs
const metricSubscriptions = new Map<string, Set<string>>();
const socketSubscriptions = new Map<string, Set<string>>();

// Initialize Redis subscription for all metrics
// We subscribe to a pattern to catch all metric updates
sub.psubscribe('ts:update:*');
sub.subscribe('alerts');

// We need a reference to the IO server or we can use the socket instance to join rooms.
// Using rooms is much more efficient than managing maps manually.

export function registerAnalyticsHandlers(socket: Socket) {

  socket.on('subscribe_alerts', async () => {
    logger.info({ socketId: socket.id }, 'Client subscribed to alerts');
    await socket.join('alerts');
  });

  socket.on('unsubscribe_alerts', () => {
    logger.info({ socketId: socket.id }, 'Client unsubscribed from alerts');
    socket.leave('alerts');
  });

  socket.on('subscribe_metric', async (metric: string) => {
    logger.info({ socketId: socket.id, metric }, 'Client subscribed to metric');

    // Join a room specific to this metric
    const room = `metric:${metric}`;
    await socket.join(room);

    // Send latest data immediately
    const latest = await timeSeries.getLatest(metric);
    if (latest) {
        socket.emit('metric_update', latest);
    }
  });

  socket.on('unsubscribe_metric', (metric: string) => {
    logger.info({ socketId: socket.id, metric }, 'Client unsubscribed from metric');
    socket.leave(`metric:${metric}`);
  });

  socket.on('query_metrics', async ({ metric, start, end }: { metric: string, start: number, end: number }, callback) => {
      try {
          const data = await timeSeries.query(metric, start, end);
          if (typeof callback === 'function') {
              callback({ status: 'ok', data });
          }
      } catch (e: any) {
          if (typeof callback === 'function') {
              callback({ status: 'error', error: e.message });
          }
      }
  });
}

// We need to wire up the redis subscriber to emit to the rooms.
// Since `registerAnalyticsHandlers` is called per socket, we need a global way to broadcast.
// The `socket.io-redis` adapter typically handles this if configured, but here we are doing manual Redis Pub/Sub for the data updates.
// Wait, `server/src/index.ts` imports `initSocket`. `server/src/realtime/socket.ts` exports `getIO`.
// We can use `getIO` to broadcast.

import { getIO } from './socket.js';

sub.on('pmessage', (_pattern, channel, message) => {
    try {
        if (channel.startsWith('ts:update:')) {
            const metric = channel.split(':')[2]; // ts:update:metric_name
            const data = JSON.parse(message);

            const io = getIO();
            if (io) {
                // Broadcast to the room
                io.of('/realtime').to(`metric:${metric}`).emit('metric_update', data);
            }
        }
    } catch (e) {
        logger.error({ error: e }, 'Error broadcasting metric update');
    }
});

sub.on('message', (channel, message) => {
    if (channel === 'alerts') {
        try {
            const alert = JSON.parse(message);
            const io = getIO();
            if (io) {
                io.of('/realtime').to('alerts').emit('alert', alert);
            }
        } catch (e) {
            logger.error({ error: e }, 'Error broadcasting alert');
        }
    }
});
