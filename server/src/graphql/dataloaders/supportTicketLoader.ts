import DataLoader from 'dataloader';
import { getPostgresPool } from '../../config/database.js';
import { getRedisClient } from '../../config/database.js';
import pino from 'pino';

const logger = pino();

// Define the shape of a Comment (match your actual type)
export interface SupportTicketComment {
  id: string;
  ticket_id: string;
  author_id: string;
  author_email?: string;
  content: string;
  is_internal: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

// Helper to safely get rows
const safeRows = <T = unknown>(result: unknown): T[] =>
  Array.isArray((result as { rows?: unknown[] })?.rows)
    ? ((result as { rows: T[] }).rows as T[])
    : [];

// Helper to revive dates from JSON
const reviveDates = (key: string, value: any) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value);
  }
  return value;
};

// Function to batch load comments by ticket IDs with Redis MGET support
const batchGetComments = async (ticketIds: readonly string[]): Promise<SupportTicketComment[][]> => {
  if (ticketIds.length === 0) return [];

  const redis = getRedisClient();
  const cacheKeys = ticketIds.map(id => `support:comments:${id}`);
  const results: SupportTicketComment[][] = new Array(ticketIds.length).fill(null);
  const missedIndices: number[] = [];
  const missedTicketIds: string[] = [];

  // 1. Try MGET from Redis
  if (redis) {
    try {
      const cachedValues = await redis.mget(cacheKeys);
      cachedValues.forEach((val, index) => {
        if (val) {
          // Revive dates to ensure consistency with DB driver which returns Date objects
          results[index] = JSON.parse(val, reviveDates);
        } else {
          missedIndices.push(index);
          missedTicketIds.push(ticketIds[index]);
        }
      });
    } catch (err) {
      logger.warn({ err }, 'Redis MGET failed for support ticket loader');
      // On error, treat all as misses
      ticketIds.forEach((id, index) => {
        missedIndices.push(index);
        missedTicketIds.push(id);
      });
    }
  } else {
      ticketIds.forEach((id, index) => {
        missedIndices.push(index);
        missedTicketIds.push(id);
      });
  }

  // 2. Fetch misses from DB
  if (missedTicketIds.length > 0) {
      const pool = getPostgresPool();
      // Using ANY($1) for array handling in Postgres
      // We also verify ticket_id is in the missed list
      const query = `
        SELECT * FROM support_ticket_comments
        WHERE ticket_id = ANY($1)
        ORDER BY created_at ASC
      `;

      try {
        const result = await pool.query(query, [missedTicketIds]);
        const allComments = safeRows<SupportTicketComment>(result);

        // Group comments by ticket_id
        const commentsByTicket = new Map<string, SupportTicketComment[]>();
        missedTicketIds.forEach(id => commentsByTicket.set(id, []));

        allComments.forEach(comment => {
            const list = commentsByTicket.get(comment.ticket_id);
            if (list) {
            list.push(comment);
            }
        });

        // Pipeline writes to Redis
        const pipeline = redis ? redis.pipeline() : null;

        missedTicketIds.forEach((id, i) => {
            const comments = commentsByTicket.get(id) || [];
            const originalIndex = missedIndices[i];
            results[originalIndex] = comments;

            if (pipeline) {
                 // Cache for 60 seconds
                pipeline.setex(`support:comments:${id}`, 60, JSON.stringify(comments));
            }
        });

        if (pipeline) {
            pipeline.exec().catch(err => logger.warn({ err }, 'Redis pipeline write failed'));
        }

      } catch (err) {
          logger.error({ err }, 'DB Fetch failed in support ticket loader');
          // If DB fails, we return Errors for the missed items
          missedIndices.forEach(index => {
              // DataLoader expects values or Errors.
              // We return empty array to prevent crashing, but logs will show the issue.
              results[index] = [];
          });
      }
  }

  // 3. Return combined results
  // We need to cast because we initialized with nulls but logic ensures they are filled.
  return results as SupportTicketComment[][];
};

export const createSupportTicketLoader = () => new DataLoader<string, SupportTicketComment[]>(batchGetComments);
