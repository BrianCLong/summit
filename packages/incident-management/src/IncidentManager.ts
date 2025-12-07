import { Incident, IncidentState, IncidentSeverity, IncidentEvent } from './types';
import { randomUUID } from 'crypto';

export class IncidentManager {
  private static instance: IncidentManager;
  private incidents: Map<string, Incident> = new Map();
  private events: Map<string, IncidentEvent[]> = new Map();

  private constructor() {}

  public static getInstance(): IncidentManager {
    if (!IncidentManager.instance) {
      IncidentManager.instance = new IncidentManager();
    }
    return IncidentManager.instance;
  }

  public createIncident(title: string, description: string, severity: IncidentSeverity, commanderId?: string): Incident {
    const id = `INC-${new Date().toISOString().slice(0, 10)}-${randomUUID().slice(0, 4)}`;
    const incident: Incident = {
      id,
      title,
      description,
      severity,
      state: 'SUSPECTED',
      commanderId,
      createdAt: new Date(),
      updatedAt: new Date(),
      artifacts: []
    };

    this.incidents.set(id, incident);
    this.logEvent(id, 'STATUS_CHANGE', commanderId || 'SYSTEM', { oldState: null, newState: 'SUSPECTED' });

    return incident;
  }

  /**
   * Hook for automated detection systems to trigger an incident candidate.
   */
  public triggerFromAlert(alertId: string, alertData: any, severity: IncidentSeverity): Incident {
      const title = `Automated Incident: ${alertData.name || alertId}`;
      const description = `Triggered by alert ${alertId}. Details: ${JSON.stringify(alertData)}`;
      const incident = this.createIncident(title, description, severity);

      // Auto-transition to TRIAGE for high severity
      if (severity === 'SEV-1' || severity === 'SEV-2') {
          this.updateState(incident.id, 'TRIAGE', 'SYSTEM');
          this.createWarRoom(incident.id);
      }

      return incident;
  }

  /**
   * Simulates the creation of a War Room (e.g., Slack Channel, Zoom Bridge).
   */
  public createWarRoom(incidentId: string): string {
      const incident = this.getIncident(incidentId);
      if (!incident) throw new Error('Incident not found');

      // In a real implementation, this would call the Chat/Video provider API.
      const mockChannelId = `war-room-${incidentId.toLowerCase()}`;
      incident.channelId = mockChannelId;
      incident.updatedAt = new Date();

      this.logEvent(incidentId, 'ACTION', 'SYSTEM', { action: 'WAR_ROOM_CREATED', channelId: mockChannelId });

      return mockChannelId;
  }

  public getIncident(id: string): Incident | undefined {
    return this.incidents.get(id);
  }

  public updateState(id: string, newState: IncidentState, actorId: string): Incident {
    const incident = this.incidents.get(id);
    if (!incident) throw new Error('Incident not found');

    const oldState = incident.state;
    incident.state = newState;
    incident.updatedAt = new Date();

    if (newState === 'RESOLVED') {
        incident.resolvedAt = new Date();
    }

    this.logEvent(id, 'STATUS_CHANGE', actorId, { oldState, newState });
    return incident;
  }

  public addArtifact(id: string, artifactUrl: string, actorId: string): Incident {
      const incident = this.incidents.get(id);
      if (!incident) throw new Error('Incident not found');

      incident.artifacts.push(artifactUrl);
      incident.updatedAt = new Date();
      this.logEvent(id, 'EVIDENCE', actorId, { artifactUrl });
      return incident;
  }

  public logEvent(incidentId: string, type: IncidentEvent['type'], actorId: string, data: Record<string, any>) {
    const event: IncidentEvent = {
      timestamp: new Date(),
      type,
      actorId,
      data
    };

    if (!this.events.has(incidentId)) {
      this.events.set(incidentId, []);
    }
    this.events.get(incidentId)?.push(event);
  }

  public getTimeline(incidentId: string): IncidentEvent[] {
    return this.events.get(incidentId) || [];
  }
}
