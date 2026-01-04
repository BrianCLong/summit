/**
 * Audit Ledger Service Interface
 * 
 * Defines the contract for audit ledger integration
 */

import Redis from 'ioredis';

export interface AuditEvent {
  timestamp: string;
  correlationId: string;
  provenanceId?: string;
  source: string;
  actor?: string;
  operation: string;
  classification: string;
  confidence?: number;
  isSimulated: boolean;
  dataHash: string;
  userId?: string;
  tenantId?: string;
  provenanceChainId?: string;
}

export interface AuditResult {
  success: boolean;
  eventId?: string;
  error?: string;
}

export interface AuditLedgerService {
  log(event: AuditEvent): Promise<AuditResult>;
}

/**
 * Redis-based implementation of Audit Ledger Service
 * 
 * Provides persistent audit logging to Redis with configurable retention
 */
export class RedisAuditLedgerService implements AuditLedgerService {
  private redis: Redis;
  private readonly retentionPeriod: number; // in seconds

  constructor(redisUrl?: string, retentionDays: number = 7) {
    this.redis = new (Redis as any)(
      redisUrl || process.env.REDIS_URL || 'redis://localhost:6379'
    );
    this.retentionPeriod = retentionDays * 24 * 60 * 60; // Convert days to seconds
  }

  async log(event: AuditEvent): Promise<AuditResult> {
    try {
      // Generate unique event ID
      const eventId = `${event.correlationId}-${Date.now()}`;
      
      // Add event ID to the event
      const enrichedEvent = {
        ...event,
        eventId,
        timestamp: event.timestamp || new Date().toISOString(),
      };

      // Store in Redis list for audit trail
      await this.redis.lpush('audit-ledger-events', JSON.stringify(enrichedEvent));
      
      // Set retention period
      await this.redis.expire('audit-ledger-events', this.retentionPeriod);
      
      // Also create a mapping by event ID for direct lookup
      await this.redis.setex(
        `audit-event:${eventId}`, 
        this.retentionPeriod,
        JSON.stringify(enrichedEvent)
      );
      
      // Increment audit counters by date
      const dateKey = `audit-counts:${new Date().toISOString().split('T')[0]}`;
      await this.redis.hincrby('audit-ledger-daily-counts', dateKey, 1);
      
      // Maintain retention on daily counts as well
      await this.redis.expire('audit-ledger-daily-counts', this.retentionPeriod);

      return {
        success: true,
        eventId,
      };
    } catch (error: any) {
      console.error('[AuditLedgerService] Failed to log audit event:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Retrieve audit events by date range
   */
  async getEventsByDate(date: string): Promise<AuditEvent[]> {
    try {
      const key = `audit-events:${date}`;
      const eventsString = await this.redis.get(key);
      
      if (!eventsString) {
        return [];
      }
      
      return JSON.parse(eventsString) as AuditEvent[];
    } catch (error: any) {
      console.error('[AuditLedgerService] Failed to get events by date:', error);
      return [];
    }
  }

  /**
   * Retrieve audit events by tenant
   */
  async getEventsByTenant(tenantId: string, limit: number = 1000): Promise<AuditEvent[]> {
    try {
      // Get all audit events and filter by tenant
      const allEventsString = await this.redis.lrange('audit-ledger-events', 0, -1);
      const allEvents = allEventsString.map((str: string) => JSON.parse(str) as AuditEvent);
      
      return allEvents
        .filter((event: AuditEvent) => event.tenantId === tenantId)
        .slice(0, limit);
    } catch (error: any) {
      console.error('[AuditLedgerService] Failed to get events by tenant:', error);
      return [];
    }
  }

  /**
   * Check if an event has already been logged (deduplication)
   */
  async isEventLogged(correlationId: string, dataHash: string): Promise<boolean> {
    try {
      // Create a unique key based on correlationId and dataHash
      const dedupeKey = `audit-dedupe:${correlationId}:${dataHash}`;
      const exists = await this.redis.exists(dedupeKey);
      return exists === 1;
    } catch (error: any) {
      console.error('[AuditLedgerService] Failed to check event existence:', error);
      return false; // Assume not logged if we can't check
    }
  }

  /**
   * Close the Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}