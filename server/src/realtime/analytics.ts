import { Socket } from 'socket.io';
import pino from 'pino';
import { getRedisClient } from '../db/redis.js';
import { TimeSeriesService } from '../services/TimeSeriesService.js';
import { getIO } from './socket.js';

const logger = (pino as any)();
const redis = getRedisClient();
const sub = redis.duplicate();
const timeSeries = new TimeSeriesService();

// Initialize Redis subscription for all metrics
// We subscribe to a pattern to catch all metric updates
sub.psubscribe('ts:update:*');
sub.subscribe('alerts');

// We need a reference to the IO server or we can use the socket instance to join rooms.
// Using rooms is much more efficient than managing maps manually.

export function registerAnalyticsHandlers(socket: Socket): void {

  socket.on('subscribe_alerts', async (): Promise<void> => {
    logger.info({ socketId: socket.id }, 'Client subscribed to alerts');
    await socket.join('alerts');
  });

  socket.on('unsubscribe_alerts', (): void => {
    logger.info({ socketId: socket.id }, 'Client unsubscribed from alerts');
    socket.leave('alerts');
  });

  socket.on('subscribe_metric', async (metric: string): Promise<void> => {
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

  socket.on('unsubscribe_metric', (metric: string): void => {
    logger.info({ socketId: socket.id, metric }, 'Client unsubscribed from metric');
    socket.leave(`metric:${metric}`);
  });

  socket.on('query_metrics', async ({ metric, start, end }: { metric: string, start: number, end: number }, callback: (response: { status: string; data?: any; error?: string }) => void): Promise<void> => {
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

sub.on('pmessage', (_pattern: string, channel: string, message: string): void => {
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
    } catch (e: any) {
        logger.error({ error: e }, 'Error broadcasting metric update');
    }
});

sub.on('message', (channel: string, message: string): void => {
    if (channel === 'alerts') {
        try {
            const alert = JSON.parse(message);
            const io = getIO();
            if (io) {
                io.of('/realtime').to('alerts').emit('alert', alert);
            }
        } catch (e: any) {
            logger.error({ error: e }, 'Error broadcasting alert');
        }
    }
});
