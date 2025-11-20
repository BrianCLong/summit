/**
 * Webhook Service
 * Allows agents to be triggered via webhooks and external events
 */

import { randomUUID } from 'crypto';
import crypto from 'crypto';
import type { AgentRequest, AgentResponse, TriggerType } from './types.js';
import { AgentGateway } from './AgentGateway.js';

export interface WebhookConfig {
  id: string;
  agentId: string;
  url: string; // Webhook endpoint path
  secret: string; // For signature verification
  isActive: boolean;
  triggerConfig: {
    operationMode?: 'SIMULATION' | 'DRY_RUN' | 'ENFORCED';
    actionType: string;
    actionTarget?: string;
    payloadMapping?: Record<string, string>; // Map webhook payload to action payload
  };
  createdAt: Date;
}

export interface WebhookEvent {
  id: string;
  webhookId: string;
  payload: Record<string, unknown>;
  headers: Record<string, string>;
  signature?: string;
  receivedAt: Date;
  processedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  runId?: string;
  error?: string;
}

export class WebhookService {
  constructor(
    private db: any,
    private gateway: AgentGateway
  ) {}

  /**
   * Register a webhook for an agent
   */
  async registerWebhook(config: Omit<WebhookConfig, 'id' | 'createdAt'>): Promise<WebhookConfig> {
    const id = randomUUID();
    const createdAt = new Date();

    // Generate webhook URL
    const url = `/webhooks/${id}`;

    const result = await this.db.query(
      `INSERT INTO agent_webhooks (
        id, agent_id, url, secret, is_active, trigger_config, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        id,
        config.agentId,
        url,
        config.secret,
        config.isActive,
        JSON.stringify(config.triggerConfig),
        createdAt,
      ]
    );

    return this.mapRowToWebhookConfig(result.rows[0]);
  }

  /**
   * Process incoming webhook
   */
  async processWebhook(
    webhookId: string,
    payload: Record<string, unknown>,
    headers: Record<string, string>
  ): Promise<WebhookEvent> {
    // Create event record
    const event: WebhookEvent = {
      id: randomUUID(),
      webhookId,
      payload,
      headers,
      signature: headers['x-webhook-signature'],
      receivedAt: new Date(),
      status: 'pending',
    };

    // Save event
    await this.saveEvent(event);

    try {
      // Get webhook config
      const config = await this.getWebhookConfig(webhookId);

      if (!config) {
        throw new Error('Webhook not found');
      }

      if (!config.isActive) {
        throw new Error('Webhook is not active');
      }

      // Verify signature if present
      if (event.signature) {
        const isValid = this.verifySignature(
          config.secret,
          JSON.stringify(payload),
          event.signature
        );

        if (!isValid) {
          throw new Error('Invalid webhook signature');
        }
      }

      // Mark as processing
      event.status = 'processing';
      await this.updateEvent(event);

      // Build agent request from webhook
      const request = this.buildRequestFromWebhook(config, payload);

      // Get agent credentials (in real implementation, would fetch from secure store)
      const agentApiKey = await this.getAgentApiKey(config.agentId);

      // Execute through gateway
      const response = await this.gateway.executeRequest(request, agentApiKey);

      // Update event
      event.status = response.success ? 'completed' : 'failed';
      event.processedAt = new Date();
      event.runId = response.runId;

      if (!response.success) {
        event.error = response.error?.message;
      }

      await this.updateEvent(event);

      return event;
    } catch (error: any) {
      event.status = 'failed';
      event.error = error.message;
      event.processedAt = new Date();
      await this.updateEvent(event);

      throw error;
    }
  }

  /**
   * Build agent request from webhook payload
   */
  private buildRequestFromWebhook(
    config: WebhookConfig,
    payload: Record<string, unknown>
  ): AgentRequest {
    // Map payload fields to action payload
    const actionPayload: Record<string, unknown> = {};

    if (config.triggerConfig.payloadMapping) {
      for (const [destKey, sourceKey] of Object.entries(config.triggerConfig.payloadMapping)) {
        actionPayload[destKey] = this.getNestedValue(payload, sourceKey);
      }
    } else {
      // Use entire payload
      Object.assign(actionPayload, payload);
    }

    return {
      agentId: config.agentId,
      tenantId: (payload.tenantId as string) || 'default',
      operationMode: config.triggerConfig.operationMode || 'ENFORCED',
      action: {
        type: config.triggerConfig.actionType as any,
        target: config.triggerConfig.actionTarget,
        payload: actionPayload,
      },
      metadata: {
        trigger: 'webhook',
        webhookId: config.id,
      },
    };
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): unknown {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Verify webhook signature
   */
  private verifySignature(secret: string, payload: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Generate webhook signature for testing
   */
  generateSignature(secret: string, payload: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Get webhook configuration
   */
  async getWebhookConfig(webhookId: string): Promise<WebhookConfig | null> {
    const result = await this.db.query(
      'SELECT * FROM agent_webhooks WHERE id = $1',
      [webhookId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToWebhookConfig(result.rows[0]);
  }

  /**
   * List webhooks for an agent
   */
  async listWebhooks(agentId: string): Promise<WebhookConfig[]> {
    const result = await this.db.query(
      'SELECT * FROM agent_webhooks WHERE agent_id = $1 ORDER BY created_at DESC',
      [agentId]
    );

    return result.rows.map(this.mapRowToWebhookConfig);
  }

  /**
   * Deactivate webhook
   */
  async deactivateWebhook(webhookId: string): Promise<void> {
    await this.db.query(
      'UPDATE agent_webhooks SET is_active = false WHERE id = $1',
      [webhookId]
    );
  }

  /**
   * Get agent API key (placeholder - implement secure retrieval)
   */
  private async getAgentApiKey(agentId: string): Promise<string> {
    // In real implementation, retrieve from secure credential store
    // For now, throw error indicating it needs to be implemented
    throw new Error('Agent API key retrieval not implemented - integrate with credential store');
  }

  /**
   * Save webhook event
   */
  private async saveEvent(event: WebhookEvent): Promise<void> {
    await this.db.query(
      `INSERT INTO webhook_events (
        id, webhook_id, payload, headers, signature,
        received_at, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        event.id,
        event.webhookId,
        JSON.stringify(event.payload),
        JSON.stringify(event.headers),
        event.signature,
        event.receivedAt,
        event.status,
      ]
    );
  }

  /**
   * Update webhook event
   */
  private async updateEvent(event: WebhookEvent): Promise<void> {
    await this.db.query(
      `UPDATE webhook_events
       SET status = $1, processed_at = $2, run_id = $3, error = $4
       WHERE id = $5`,
      [event.status, event.processedAt, event.runId, event.error, event.id]
    );
  }

  /**
   * Get event history for webhook
   */
  async getEventHistory(webhookId: string, limit: number = 100): Promise<WebhookEvent[]> {
    const result = await this.db.query(
      `SELECT * FROM webhook_events
       WHERE webhook_id = $1
       ORDER BY received_at DESC
       LIMIT $2`,
      [webhookId, limit]
    );

    return result.rows.map(this.mapRowToEvent);
  }

  // =========================================================================
  // Mappers
  // =========================================================================

  private mapRowToWebhookConfig(row: any): WebhookConfig {
    return {
      id: row.id,
      agentId: row.agent_id,
      url: row.url,
      secret: row.secret,
      isActive: row.is_active,
      triggerConfig: JSON.parse(row.trigger_config),
      createdAt: row.created_at,
    };
  }

  private mapRowToEvent(row: any): WebhookEvent {
    return {
      id: row.id,
      webhookId: row.webhook_id,
      payload: JSON.parse(row.payload),
      headers: JSON.parse(row.headers),
      signature: row.signature,
      receivedAt: row.received_at,
      processedAt: row.processed_at,
      status: row.status,
      runId: row.run_id,
      error: row.error,
    };
  }
}

// ============================================================================
// Webhook Tables Migration
// ============================================================================

export const WEBHOOK_TABLES_SQL = `
-- Webhook configurations
CREATE TABLE IF NOT EXISTS agent_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL UNIQUE,
    secret VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    trigger_config JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_agent_webhooks_agent (agent_id),
    INDEX idx_agent_webhooks_active (is_active) WHERE is_active = true
);

-- Webhook events log
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES agent_webhooks(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    headers JSONB NOT NULL,
    signature VARCHAR(255),
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    run_id UUID,
    error TEXT,

    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    INDEX idx_webhook_events_webhook (webhook_id),
    INDEX idx_webhook_events_status (status),
    INDEX idx_webhook_events_received (received_at DESC)
);
`;
