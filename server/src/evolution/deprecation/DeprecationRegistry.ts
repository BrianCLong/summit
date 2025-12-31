import { DeprecationStage, DeprecationRecord } from './types.js';
import fs from 'fs';
import path from 'path';
import { ProvenanceLedgerV2 } from '../../provenance/ledger.js';

const DEFAULT_DATA_FILE = path.join(process.cwd(), 'server', 'deprecation-data.json');

export class DeprecationRegistry {
  private static instance: DeprecationRegistry;
  private records: Map<string, DeprecationRecord> = new Map();
  private dataFile: string;
  // Use lazy singleton access to avoid circular dependency issues at import time
  private getLedger() {
      return ProvenanceLedgerV2.getInstance();
  }

  // Made public for testing or manual instantiation
  public constructor(dataFile: string = DEFAULT_DATA_FILE) {
    this.dataFile = dataFile;
    this.load();
  }

  public static getInstance(): DeprecationRegistry {
    if (!DeprecationRegistry.instance) {
      DeprecationRegistry.instance = new DeprecationRegistry();
    }
    return DeprecationRegistry.instance;
  }

  // Allow resetting the instance for testing
  public static resetInstance(dataFile?: string) {
    DeprecationRegistry.instance = new DeprecationRegistry(dataFile);
  }

  public reload() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = fs.readFileSync(this.dataFile, 'utf-8');
        const json = JSON.parse(data);
        if (Array.isArray(json)) {
          this.records = new Map(json.map((r: DeprecationRecord) => [r.id, r]));
        }
      } else {
        // If file doesn't exist, start empty
        this.records.clear();
      }
    } catch (error) {
      console.error('[DeprecationRegistry] Failed to load records:', error);
    }
  }

  private save() {
    try {
      const dir = path.dirname(this.dataFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = JSON.stringify(Array.from(this.records.values()), null, 2);
      fs.writeFileSync(this.dataFile, data);
    } catch (error) {
      console.error('[DeprecationRegistry] Failed to save records:', error);
    }
  }

  public register(record: DeprecationRecord): void {
    const existing = this.records.get(record.id);
    this.records.set(record.id, record);
    this.save();
    console.log(`[DeprecationRegistry] Registered deprecation for ${record.id} at stage ${record.stage}`);

    // Log to Provenance Ledger
    // Best effort - do not fail if DB is unavailable during a script run
    try {
        const ledger = this.getLedger();
        // Since we are likely running in a script context where DB connection might be lazy,
        // we wrap in a simple check or try/catch block if we are in test mode without DB.
        // Assuming the Ledger class handles connection pooling.

        ledger.appendEntry({
            tenantId: 'system', // System-level event
            actionType: existing ? 'DEPRECATION_UPDATE' : 'DEPRECATION_ANNOUNCED',
            actorId: record.owner || 'system',
            actorType: 'system',
            resourceType: 'DeprecationRecord',
            resourceId: record.id,
            timestamp: new Date(),
            metadata: {
                stage: record.stage,
                reason: record.reason,
                deadline: record.deadline,
                replacement: record.replacement
            },
            payload: {
                // Cast to any to satisfy MutationPayload requirements if strictly typed
                mutationType: existing ? 'update' : 'create',
                changes: [
                   { field: 'stage', oldValue: existing?.stage, newValue: record.stage }
                ]
            } as any
        }).catch(err => {
            console.warn('[DeprecationRegistry] Failed to log to ledger (async):', err.message);
        });

    } catch (error) {
         console.warn('[DeprecationRegistry] Failed to initiate ledger logging:', error);
    }
  }

  public get(id: string): DeprecationRecord | undefined {
    return this.records.get(id);
  }

  public getAll(): DeprecationRecord[] {
    return Array.from(this.records.values());
  }

  public checkStatus(id: string, overrideToken?: string): { allowed: boolean; message?: string; headers?: Record<string, string> } {
    const record = this.records.get(id);
    if (!record) {
      return { allowed: true };
    }

    const headers: Record<string, string> = {
      'Deprecation-Stage': record.stage,
      'Deprecation-Deadline': record.deadline,
      'Link': record.replacement ? `<${record.replacement}>; rel="alternate"` : '',
    };

    switch (record.stage) {
      case DeprecationStage.Active:
        return { allowed: true };
      case DeprecationStage.Announce:
        headers['Deprecation-Notice'] = `This component is deprecated. Reason: ${record.reason}`;
        return { allowed: true, headers };
      case DeprecationStage.Warn:
        headers['Deprecation-Warning'] = `This component will be restricted on ${record.deadline}. Please migrate.`;
        return { allowed: true, headers };
      case DeprecationStage.Restrict:
        if (overrideToken && overrideToken.length > 5) { // Simple validation for MVP (length check)
           headers['Deprecation-Warning'] = `Access allowed via override.`;
           // Log override usage to ledger? - Keeping it simple for checkStatus (sync)
           return { allowed: true, headers };
        }

        headers['Deprecation-Warning'] = `Usage is restricted. Future access may be blocked.`;
        return {
          allowed: false,
          message: `Component ${id} is restricted. Usage requires valid 'Deprecation-Override-Token' header.`,
          headers
        };
      case DeprecationStage.Disable:
      case DeprecationStage.Remove:
        return { allowed: false, message: `Component ${id} is disabled. ${record.reason}`, headers };
      default:
        return { allowed: true };
    }
  }
}

export const registry = DeprecationRegistry.getInstance();
