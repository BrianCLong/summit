import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { Driver } from 'neo4j-driver';
import { auditEventsTotal } from '../monitoring/metrics.js';
import { getNeo4jDriver } from '../db/neo4j.js';

export interface AuditEvent {
  userId: string | null;
  tenantId: string | null;
  action: string;
  resource: string;
  timestamp?: string;
  details?: any;
}

export class AuditLogService {
  private filePath: string;
  private neo4j: Driver;

  constructor(neo4jDriver: Driver, filePath = path.join(process.cwd(), 'audit.log')) {
    this.neo4j = neo4jDriver;
    this.filePath = filePath;
  }

  async logEvent(event: AuditEvent): Promise<void> {
    const entry = { ...event, timestamp: event.timestamp || new Date().toISOString() };
    try {
      await fs.promises.appendFile(this.filePath, JSON.stringify(entry) + '\n');
    } catch (err) {
      // swallow file errors
    }

    try {
      const session = this.neo4j.session();
      await session.run(
        'CREATE (a:AuditEvent {userId:$userId, tenantId:$tenantId, action:$action, resource:$resource, timestamp:$timestamp, details:$details})',
        entry
      );
      await session.close();
    } catch (err) {
      // ignore neo4j errors
    }

    try {
      auditEventsTotal.inc();
    } catch {
      // ignore metric errors
    }

    if (process.env.PROV_LEDGER_URL) {
      try {
        await fetch(`${process.env.PROV_LEDGER_URL}/events`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(entry),
        });
      } catch (err) {
        // ignore forwarding errors
      }
    }
  }
}

export const auditLogService = new AuditLogService(getNeo4jDriver());
export default auditLogService;
