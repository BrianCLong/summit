/**
 * Audit logging for Admin CLI operations
 * Records all CLI operations to the audit black box
 */

import os from 'node:os';
import { v4 as uuidv4 } from 'uuid';
import type { AuditorInterface, AuditRecord, ApiClientInterface } from '../types/index.js';
import { logger } from './logger.js';

/**
 * Auditor configuration
 */
interface AuditorConfig {
  enabled: boolean;
  apiClient?: ApiClientInterface;
  localLogPath?: string;
}

/**
 * Create auditor instance
 */
export function createAuditor(config: AuditorConfig): AuditorInterface {
  const { enabled, apiClient } = config;

  async function record(event: AuditRecord): Promise<void> {
    if (!enabled) {
      logger.debug('Audit logging disabled, skipping record');
      return;
    }

    const fullEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      hostname: os.hostname(),
      username: os.userInfo().username,
      ...event,
      // Redact sensitive options
      options: redactSensitive(event.options),
    };

    logger.debug('Recording audit event', { action: event.action });

    // Log locally for backup
    logLocally(fullEvent);

    // Send to audit service if API client is configured
    if (apiClient) {
      try {
        const response = await apiClient.post('/admin/audit/record', {
          action: `cli.${event.action}`,
          details: fullEvent,
        });

        if (!response.success) {
          logger.warn('Failed to send audit event to server', {
            error: response.error?.message,
          });
        }
      } catch (err) {
        logger.warn('Error sending audit event', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return { record };
}

/**
 * Redact sensitive values from options
 */
function redactSensitive(options: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = [
    'token',
    'password',
    'secret',
    'key',
    'apiKey',
    'credential',
    'auth',
  ];

  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(options)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some(
      (sk) => lowerKey.includes(sk.toLowerCase())
    );

    if (isSensitive && typeof value === 'string') {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitive(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Log audit event locally
 */
function logLocally(event: Record<string, unknown>): void {
  // In production, this would write to a local file or syslog
  // For now, we use structured logging
  logger.verbose('AUDIT', event);
}

/**
 * Generate audit context for a command
 */
export function createAuditContext(
  command: string,
  args: string[],
  options: Record<string, unknown>
): Pick<AuditRecord, 'command' | 'args' | 'options'> {
  return {
    command,
    args,
    options: redactSensitive(options),
  };
}

/**
 * Wrap a command handler with audit logging
 */
export function withAudit<T extends (...args: unknown[]) => Promise<void>>(
  auditor: AuditorInterface,
  action: string,
  userId: string,
  handler: T
): T {
  return (async (...args: unknown[]) => {
    const startTime = Date.now();
    let result: 'success' | 'failure' | 'cancelled' = 'success';
    let errorMessage: string | undefined;

    try {
      await handler(...args);
    } catch (err) {
      result = 'failure';
      errorMessage = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      const durationMs = Date.now() - startTime;

      await auditor.record({
        action,
        command: action,
        args: args.map(String),
        options: {},
        userId,
        result,
        errorMessage,
        durationMs,
      });
    }
  }) as T;
}
