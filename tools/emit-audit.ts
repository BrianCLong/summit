#!/usr/bin/env npx ts-node
import { Command } from 'commander';
import axios from 'axios';
import * as crypto from 'crypto';

/**
 * Summit Audit Emitter
 *
 * Emits audit events from CI/CD pipelines and deployment scripts to the Summit API.
 *
 * Usage:
 *   ./emit-audit.ts --actor-id ci-bot --action deploy --resource-type service --resource-id my-service --outcome success
 */

const program = new Command();

program
  .name('summit-audit')
  .description('Emit audit events to Summit API')
  .version('0.1.0')
  .requiredOption('--api-url <url>', 'Summit API URL (e.g., http://localhost:3000)')
  .requiredOption('--api-key <key>', 'API Key for authentication')
  .requiredOption('--actor-id <id>', 'Actor ID (e.g., github-user, ci-bot)')
  .option('--actor-type <type>', 'Actor Type', 'ci')
  .requiredOption('--action <action>', 'Action performed (e.g., deploy, build, test)')
  .requiredOption('--resource-type <type>', 'Resource Type (e.g., service, repo, artifact)')
  .requiredOption('--resource-id <id>', 'Resource ID')
  .option('--outcome <outcome>', 'Outcome (success, failure, allow, deny)', 'success')
  .option('--trace-id <id>', 'Trace ID')
  .option('--tenant-id <id>', 'Tenant ID', 'system')
  .option('--metadata <json>', 'Additional metadata JSON', '{}')
  .action(async (options) => {
    try {
      const payload = {
        actor: {
          id: options.actorId,
          type: options.actorType,
        },
        action: options.action,
        resource: {
          type: options.resourceType,
          id: options.resourceId,
        },
        decision: {
          outcome: options.outcome,
        },
        traceId: options.traceId || crypto.randomUUID(),
        tenantId: options.tenantId,
        metadata: JSON.parse(options.metadata),
        timestamp: new Date().toISOString(),
      };

      console.log('Emitting audit event:', JSON.stringify(payload, null, 2));

      await axios.post(`${options.apiUrl}/api/audit/emit`, payload, {
        headers: {
          'Authorization': `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
          'x-tenant-id': options.tenantId
        },
      });

      console.log('Successfully emitted audit event');
    } catch (error: any) {
      console.error('Failed to emit audit event:', error.message);
      if (error.response) {
        console.error('Response:', error.response.status, error.response.data);
      }
      process.exit(1);
    }
  });

program.parse(process.argv);
