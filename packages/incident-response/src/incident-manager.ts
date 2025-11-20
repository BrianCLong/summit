import { Incident, IncidentStatus, IncidentMetrics } from './types.js';

/**
 * Incident Manager
 * Manages security incidents and response workflows
 */
export class IncidentManager {
  private incidents: Map<string, Incident> = new Map();

  /**
   * Create new incident
   */
  async createIncident(incident: Incident): Promise<Incident> {
    this.incidents.set(incident.id, incident);
    return incident;
  }

  /**
   * Get incident by ID
   */
  getIncident(id: string): Incident | undefined {
    return this.incidents.get(id);
  }

  /**
   * Update incident
   */
  async updateIncident(id: string, updates: Partial<Incident>): Promise<Incident | undefined> {
    const incident = this.incidents.get(id);
    if (!incident) {
      return undefined;
    }

    const updated: Incident = {
      ...incident,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.incidents.set(id, updated);
    return updated;
  }

  /**
   * Update incident status
   */
  async updateStatus(id: string, status: IncidentStatus): Promise<Incident | undefined> {
    const incident = this.incidents.get(id);
    if (!incident) {
      return undefined;
    }

    const updates: Partial<Incident> = {
      status,
      updatedAt: new Date().toISOString(),
    };

    // Set timestamp based on status
    const now = new Date().toISOString();
    switch (status) {
      case 'CONTAINED':
        updates.containedAt = now;
        break;
      case 'ERADICATED':
        updates.eradicatedAt = now;
        break;
      case 'RECOVERED':
        updates.recoveredAt = now;
        break;
      case 'CLOSED':
      case 'FALSE_POSITIVE':
        updates.closedAt = now;
        break;
    }

    return this.updateIncident(id, updates);
  }

  /**
   * Add evidence to incident
   */
  async addEvidence(
    incidentId: string,
    evidence: Incident['evidenceCollected'][0]
  ): Promise<Incident | undefined> {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      return undefined;
    }

    const updated = {
      ...incident,
      evidenceCollected: [...incident.evidenceCollected, evidence],
      updatedAt: new Date().toISOString(),
    };

    this.incidents.set(incidentId, updated);
    return updated;
  }

  /**
   * Add action to incident
   */
  async addAction(
    incidentId: string,
    action: Incident['actions'][0]
  ): Promise<Incident | undefined> {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      return undefined;
    }

    const updated = {
      ...incident,
      actions: [...incident.actions, action],
      updatedAt: new Date().toISOString(),
    };

    this.incidents.set(incidentId, updated);
    return updated;
  }

  /**
   * Update action status
   */
  async updateAction(
    incidentId: string,
    actionId: string,
    updates: Partial<Incident['actions'][0]>
  ): Promise<Incident | undefined> {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      return undefined;
    }

    const actions = incident.actions.map(action =>
      action.id === actionId
        ? { ...action, ...updates }
        : action
    );

    const updated = {
      ...incident,
      actions,
      updatedAt: new Date().toISOString(),
    };

    this.incidents.set(incidentId, updated);
    return updated;
  }

  /**
   * Add communication log
   */
  async addCommunication(
    incidentId: string,
    communication: Incident['communications'][0]
  ): Promise<Incident | undefined> {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      return undefined;
    }

    const updated = {
      ...incident,
      communications: [...incident.communications, communication],
      updatedAt: new Date().toISOString(),
    };

    this.incidents.set(incidentId, updated);
    return updated;
  }

  /**
   * Calculate incident metrics
   */
  calculateMetrics(incident: Incident): IncidentMetrics | null {
    if (!incident.detectedAt) {
      return null;
    }

    const detectedTime = new Date(incident.detectedAt).getTime();
    const reportedTime = new Date(incident.reportedAt).getTime();
    const containedTime = incident.containedAt ? new Date(incident.containedAt).getTime() : null;
    const eradicatedTime = incident.eradicatedAt ? new Date(incident.eradicatedAt).getTime() : null;
    const recoveredTime = incident.recoveredAt ? new Date(incident.recoveredAt).getTime() : null;
    const closedTime = incident.closedAt ? new Date(incident.closedAt).getTime() : null;

    const timeToDetect = reportedTime - detectedTime;
    const timeToRespond = reportedTime - detectedTime;
    const timeToContain = containedTime ? containedTime - reportedTime : 0;
    const timeToEradicate = eradicatedTime && containedTime ? eradicatedTime - containedTime : 0;
    const timeToRecover = recoveredTime && eradicatedTime ? recoveredTime - eradicatedTime : 0;
    const totalIncidentTime = closedTime ? closedTime - detectedTime : Date.now() - detectedTime;

    const actionsCompleted = incident.actions.filter(a => a.status === 'COMPLETED').length;
    const actionsFailed = incident.actions.filter(a => a.status === 'FAILED').length;
    const evidenceCollected = incident.evidenceCollected.length;

    return {
      timeToDetect,
      timeToRespond,
      timeToContain,
      timeToEradicate,
      timeToRecover,
      totalIncidentTime,
      actionsCompleted,
      actionsFailed,
      evidenceCollected,
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Search incidents
   */
  async searchIncidents(filters: {
    status?: IncidentStatus[];
    severity?: Incident['severity'][];
    category?: Incident['category'][];
    assignedTo?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Incident[]> {
    let results = Array.from(this.incidents.values());

    if (filters.status && filters.status.length > 0) {
      results = results.filter(inc => filters.status!.includes(inc.status));
    }

    if (filters.severity && filters.severity.length > 0) {
      results = results.filter(inc => filters.severity!.includes(inc.severity));
    }

    if (filters.category && filters.category.length > 0) {
      results = results.filter(inc => filters.category!.includes(inc.category));
    }

    if (filters.assignedTo) {
      results = results.filter(inc => inc.assignedTo === filters.assignedTo);
    }

    if (filters.startDate) {
      results = results.filter(inc => inc.detectedAt >= filters.startDate!);
    }

    if (filters.endDate) {
      results = results.filter(inc => inc.detectedAt <= filters.endDate!);
    }

    return results;
  }

  /**
   * Get active incidents
   */
  getActiveIncidents(): Incident[] {
    return Array.from(this.incidents.values()).filter(
      inc => !['CLOSED', 'FALSE_POSITIVE'].includes(inc.status)
    );
  }

  /**
   * Get critical incidents
   */
  getCriticalIncidents(): Incident[] {
    return Array.from(this.incidents.values()).filter(
      inc => inc.severity === 'CRITICAL' && !['CLOSED', 'FALSE_POSITIVE'].includes(inc.status)
    );
  }

  /**
   * Escalate incident
   */
  async escalateIncident(id: string, reason: string): Promise<Incident | undefined> {
    const incident = this.incidents.get(id);
    if (!incident) {
      return undefined;
    }

    const newLevel = Math.min(incident.escalationLevel + 1, 5);

    return this.updateIncident(id, {
      escalationLevel: newLevel,
      actions: [
        ...incident.actions,
        {
          id: `action-${Date.now()}`,
          type: 'COMMUNICATE',
          description: `Escalated to level ${newLevel}: ${reason}`,
          status: 'COMPLETED',
          completedAt: new Date().toISOString(),
        },
      ],
    });
  }

  /**
   * Get incident statistics
   */
  getStatistics(): {
    total: number;
    active: number;
    bySeverity: Record<string, number>;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    averageTimeToContain: number;
    averageTimeToResolve: number;
  } {
    const incidents = Array.from(this.incidents.values());

    const stats = {
      total: incidents.length,
      active: this.getActiveIncidents().length,
      bySeverity: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      averageTimeToContain: 0,
      averageTimeToResolve: 0,
    };

    for (const incident of incidents) {
      // By severity
      stats.bySeverity[incident.severity] = (stats.bySeverity[incident.severity] || 0) + 1;

      // By status
      stats.byStatus[incident.status] = (stats.byStatus[incident.status] || 0) + 1;

      // By category
      stats.byCategory[incident.category] = (stats.byCategory[incident.category] || 0) + 1;
    }

    // Calculate average times
    const containedIncidents = incidents.filter(inc => inc.containedAt);
    if (containedIncidents.length > 0) {
      const totalContainTime = containedIncidents.reduce((sum, inc) => {
        const detected = new Date(inc.detectedAt).getTime();
        const contained = new Date(inc.containedAt!).getTime();
        return sum + (contained - detected);
      }, 0);
      stats.averageTimeToContain = totalContainTime / containedIncidents.length;
    }

    const closedIncidents = incidents.filter(inc => inc.closedAt);
    if (closedIncidents.length > 0) {
      const totalResolveTime = closedIncidents.reduce((sum, inc) => {
        const detected = new Date(inc.detectedAt).getTime();
        const closed = new Date(inc.closedAt!).getTime();
        return sum + (closed - detected);
      }, 0);
      stats.averageTimeToResolve = totalResolveTime / closedIncidents.length;
    }

    return stats;
  }

  /**
   * Get all incidents
   */
  getAllIncidents(): Incident[] {
    return Array.from(this.incidents.values());
  }

  /**
   * Delete incident
   */
  async deleteIncident(id: string): Promise<boolean> {
    return this.incidents.delete(id);
  }

  /**
   * Clear all incidents
   */
  clear(): void {
    this.incidents.clear();
  }
}
