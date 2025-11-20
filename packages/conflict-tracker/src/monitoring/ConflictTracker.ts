/**
 * Conflict Tracker - Core Monitoring System
 * Track and analyze armed conflicts and security incidents
 */

import { EventEmitter } from 'events';
import {
  Conflict,
  ConflictType,
  ConflictStatus,
  ConflictFilter,
  ConflictEvent,
  SecurityIncident,
  TroopMovement,
  MonitoringAlert,
  IntensityLevel
} from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

export class ConflictTracker extends EventEmitter {
  private conflicts: Map<string, Conflict>;
  private events: Map<string, ConflictEvent>;
  private incidents: Map<string, SecurityIncident>;
  private troopMovements: Map<string, TroopMovement>;
  private alerts: Map<string, MonitoringAlert>;
  private monitoringInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.conflicts = new Map();
    this.events = new Map();
    this.incidents = new Map();
    this.troopMovements = new Map();
    this.alerts = new Map();
  }

  /**
   * Start conflict monitoring
   */
  async start(updateIntervalMs: number = 300000): Promise<void> {
    console.log('Starting Conflict Tracker...');

    // Set up periodic updates
    this.monitoringInterval = setInterval(() => {
      this.updateConflicts();
    }, updateIntervalMs);

    this.emit('started', { timestamp: new Date() });
  }

  /**
   * Stop monitoring
   */
  async stop(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    console.log('Stopped Conflict Tracker');
    this.emit('stopped', { timestamp: new Date() });
  }

  /**
   * Track a new conflict
   */
  trackConflict(conflict: Conflict): void {
    this.conflicts.set(conflict.id, conflict);
    this.emit('conflict-added', conflict);

    // Check for high-risk situations
    if (conflict.riskScore >= 70 || conflict.intensity === IntensityLevel.EXTREME) {
      this.generateAlert({
        conflictId: conflict.id,
        severity: 'CRITICAL',
        type: 'ESCALATION',
        message: `High-risk conflict: ${conflict.name} (Risk Score: ${conflict.riskScore})`
      });
    }
  }

  /**
   * Update conflict status
   */
  updateConflict(conflictId: string, updates: Partial<Conflict>): void {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict not found: ${conflictId}`);
    }

    const previousStatus = conflict.status;
    const previousIntensity = conflict.intensity;

    const updated = {
      ...conflict,
      ...updates,
      lastUpdated: new Date()
    };

    this.conflicts.set(conflictId, updated);
    this.emit('conflict-updated', updated);

    // Check for significant changes
    if (updates.status && updates.status !== previousStatus) {
      this.emit('status-change', {
        conflictId,
        from: previousStatus,
        to: updates.status
      });

      if (updates.status === ConflictStatus.ESCALATING) {
        this.generateAlert({
          conflictId,
          severity: 'WARNING',
          type: 'ESCALATION',
          message: `Conflict escalating: ${conflict.name}`
        });
      }
    }

    if (updates.intensity && updates.intensity !== previousIntensity) {
      this.emit('intensity-change', {
        conflictId,
        from: previousIntensity,
        to: updates.intensity
      });
    }
  }

  /**
   * Get conflicts with filtering
   */
  getConflicts(filter?: ConflictFilter): Conflict[] {
    let conflicts = Array.from(this.conflicts.values());

    if (!filter) {
      return conflicts;
    }

    if (filter.types && filter.types.length > 0) {
      conflicts = conflicts.filter(c => filter.types!.includes(c.type));
    }

    if (filter.statuses && filter.statuses.length > 0) {
      conflicts = conflicts.filter(c => filter.statuses!.includes(c.status));
    }

    if (filter.intensities && filter.intensities.length > 0) {
      conflicts = conflicts.filter(c => filter.intensities!.includes(c.intensity));
    }

    if (filter.countries && filter.countries.length > 0) {
      conflicts = conflicts.filter(c =>
        filter.countries!.some(country => c.countries.includes(country))
      );
    }

    if (filter.regions && filter.regions.length > 0) {
      conflicts = conflicts.filter(c =>
        filter.regions!.some(region => c.regions.includes(region))
      );
    }

    if (filter.minRiskScore !== undefined) {
      conflicts = conflicts.filter(c => c.riskScore >= filter.minRiskScore!);
    }

    if (filter.active_only) {
      conflicts = conflicts.filter(c =>
        c.status === ConflictStatus.ACTIVE ||
        c.status === ConflictStatus.ESCALATING
      );
    }

    if (filter.dateRange) {
      conflicts = conflicts.filter(c =>
        c.startDate >= filter.dateRange!.start &&
        (!c.endDate || c.endDate <= filter.dateRange!.end)
      );
    }

    return conflicts;
  }

  /**
   * Get conflict by ID
   */
  getConflict(id: string): Conflict | undefined {
    return this.conflicts.get(id);
  }

  /**
   * Track conflict event
   */
  trackEvent(event: ConflictEvent): void {
    this.events.set(event.id, event);
    this.emit('event-tracked', event);

    // Update parent conflict
    const conflict = this.conflicts.get(event.conflictId);
    if (conflict) {
      // Update casualty count
      conflict.casualties.total += event.casualties.total;
      conflict.casualties.military.killed += event.casualties.military.killed;
      conflict.casualties.military.wounded += event.casualties.military.wounded;
      conflict.casualties.civilian.killed += event.casualties.civilian.killed;
      conflict.casualties.civilian.wounded += event.casualties.civilian.wounded;

      this.updateConflict(event.conflictId, conflict);
    }

    if (event.impact === 'CRITICAL' || event.impact === 'HIGH') {
      this.generateAlert({
        conflictId: event.conflictId,
        severity: event.impact === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
        type: 'MAJOR_INCIDENT',
        message: `Major incident in ${conflict?.name}: ${event.description}`
      });
    }
  }

  /**
   * Track security incident
   */
  trackIncident(incident: SecurityIncident): void {
    this.incidents.set(incident.id, incident);
    this.emit('incident-tracked', incident);

    if (incident.casualties.total > 10) {
      this.generateAlert({
        conflictId: '', // May not be tied to specific conflict
        severity: 'WARNING',
        type: 'MAJOR_INCIDENT',
        message: `Major security incident: ${incident.type} at ${incident.location.name}`
      });
    }
  }

  /**
   * Track troop movement
   */
  trackTroopMovement(movement: TroopMovement): void {
    this.troopMovements.set(movement.id, movement);
    this.emit('troop-movement', movement);

    if (movement.significance === 'MAJOR' || movement.significance === 'SIGNIFICANT') {
      this.emit('significant-movement', movement);
    }
  }

  /**
   * Get events for a conflict
   */
  getConflictEvents(conflictId: string): ConflictEvent[] {
    return Array.from(this.events.values())
      .filter(e => e.conflictId === conflictId)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /**
   * Get recent security incidents
   */
  getRecentIncidents(days: number = 7): SecurityIncident[] {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return Array.from(this.incidents.values())
      .filter(i => i.date >= cutoff)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /**
   * Get troop movements by country
   */
  getTroopMovements(country: string, days: number = 30): TroopMovement[] {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return Array.from(this.troopMovements.values())
      .filter(m => m.country === country && m.date >= cutoff)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalConflicts: number;
    activeConflicts: number;
    conflictsByType: Record<ConflictType, number>;
    conflictsByStatus: Record<ConflictStatus, number>;
    conflictsByIntensity: Record<IntensityLevel, number>;
    totalCasualties: number;
    totalEvents: number;
    recentIncidents: number;
  } {
    const conflicts = Array.from(this.conflicts.values());
    const activeConflicts = conflicts.filter(c =>
      c.status === ConflictStatus.ACTIVE ||
      c.status === ConflictStatus.ESCALATING
    ).length;

    const conflictsByType = conflicts.reduce((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1;
      return acc;
    }, {} as Record<ConflictType, number>);

    const conflictsByStatus = conflicts.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {} as Record<ConflictStatus, number>);

    const conflictsByIntensity = conflicts.reduce((acc, c) => {
      acc[c.intensity] = (acc[c.intensity] || 0) + 1;
      return acc;
    }, {} as Record<IntensityLevel, number>);

    const totalCasualties = conflicts.reduce((sum, c) => sum + c.casualties.total, 0);

    const recentIncidents = this.getRecentIncidents(7).length;

    return {
      totalConflicts: conflicts.length,
      activeConflicts,
      conflictsByType,
      conflictsByStatus,
      conflictsByIntensity,
      totalCasualties,
      totalEvents: this.events.size,
      recentIncidents
    };
  }

  /**
   * Generate monitoring alert
   */
  private generateAlert(params: {
    conflictId: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    type: 'ESCALATION' | 'CEASEFIRE_VIOLATION' | 'MAJOR_INCIDENT' | 'HUMANITARIAN_CRISIS';
    message: string;
  }): void {
    const alert: MonitoringAlert = {
      id: uuidv4(),
      ...params,
      timestamp: new Date(),
      acknowledged: false
    };

    this.alerts.set(alert.id, alert);
    this.emit('alert', alert);
  }

  /**
   * Get unacknowledged alerts
   */
  getUnacknowledgedAlerts(): MonitoringAlert[] {
    return Array.from(this.alerts.values())
      .filter(a => !a.acknowledged)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      this.alerts.set(alertId, alert);
      this.emit('alert-acknowledged', alert);
    }
  }

  /**
   * Update conflicts (periodic)
   */
  private updateConflicts(): void {
    // Update conflict durations
    for (const [id, conflict] of this.conflicts) {
      if (!conflict.endDate && conflict.status !== ConflictStatus.RESOLVED) {
        const duration = Math.floor(
          (Date.now() - conflict.startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (duration !== conflict.duration) {
          this.updateConflict(id, { duration });
        }
      }
    }

    this.emit('update-complete', {
      timestamp: new Date(),
      conflicts: this.conflicts.size
    });
  }
}
