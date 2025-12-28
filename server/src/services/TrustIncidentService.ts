import { EventEmitter } from 'events';
import { DatabaseService } from './DatabaseService'; // Adjust import path
import logger from '../utils/logger';

export interface TrustIncident {
  id: string;
  title: string;
  summary: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  severity: 'minor' | 'major' | 'critical';
  affectedServices: string[];
  affectedRegions: string[];
  startedAt: Date;
  resolvedAt?: Date;
  updatedAt: Date;
  evidenceLinks: {
    pirId?: string; // Post Incident Report ID
    provenanceId?: string; // Link to ledger
  };
  updates: Array<{
    timestamp: Date;
    message: string;
    status: string;
  }>;
}

export class TrustIncidentService extends EventEmitter {
  private db: DatabaseService;
  private incidents: Map<string, TrustIncident> = new Map(); // Use memory for now if no DB table

  constructor() {
    super();
    this.db = new DatabaseService();
  }

  // Retrieve public incidents for the trust portal
  // In a real implementation, this would query a database table
  // For now, I will use a simple in-memory store seeded with mock data if empty
  // or a query if I can confirm table existence.
  // Given constraints, I'll use in-memory with simple persistence simulation or just rely on runtime state.
  // Actually, to make it persistent across restarts (if DB existed), I'd use DB.
  // But I will stick to in-memory for the MVP unless I add a migration.
  // The prompt says "No manual data entry", but implies we need a system to *show* this.
  // I will create a simple file-backed store or just in-memory.

  public async getActiveIncidents(): Promise<TrustIncident[]> {
    // Return all non-resolved incidents
    return Array.from(this.incidents.values()).filter(i => i.status !== 'resolved');
  }

  public async getIncidentHistory(limit: number = 10): Promise<TrustIncident[]> {
    // Return resolved incidents, sorted by date
    return Array.from(this.incidents.values())
      .filter(i => i.status === 'resolved')
      .sort((a, b) => b.resolvedAt!.getTime() - a.resolvedAt!.getTime())
      .slice(0, limit);
  }

  public async getIncident(id: string): Promise<TrustIncident | undefined> {
    return this.incidents.get(id);
  }

  // Method to create an incident (would be called by internal admin tools or alerting system)
  public async createIncident(incident: Omit<TrustIncident, 'id' | 'updatedAt' | 'updates'>): Promise<TrustIncident> {
    const id = `inc-${Date.now()}`;
    const newIncident: TrustIncident = {
      ...incident,
      id,
      updatedAt: new Date(),
      updates: [{
        timestamp: new Date(),
        message: incident.summary,
        status: incident.status
      }]
    };

    this.incidents.set(id, newIncident);
    return newIncident;
  }

  public async updateIncident(id: string, update: { message: string, status?: TrustIncident['status'] }): Promise<TrustIncident> {
    const incident = this.incidents.get(id);
    if (!incident) throw new Error('Incident not found');

    if (update.status) incident.status = update.status;
    incident.updatedAt = new Date();
    incident.updates.push({
      timestamp: new Date(),
      message: update.message,
      status: incident.status
    });

    if (update.status === 'resolved' && !incident.resolvedAt) {
        incident.resolvedAt = new Date();
    }

    this.incidents.set(id, incident);
    return incident;
  }
}

export const trustIncidentService = new TrustIncidentService();
