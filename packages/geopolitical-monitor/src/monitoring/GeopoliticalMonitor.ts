/**
 * Geopolitical Monitor - Core Monitoring Engine
 * Real-time monitoring and tracking of political events globally
 */

import { EventEmitter } from 'events';
import {
  GeopoliticalEvent,
  EventType,
  EventFilter,
  MonitoringConfig,
  RiskLevel,
  Alert,
  EventSource
} from '../types/index.js';

export class GeopoliticalMonitor extends EventEmitter {
  private config: MonitoringConfig;
  private events: Map<string, GeopoliticalEvent>;
  private activeMonitors: Set<string>;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(config: MonitoringConfig) {
    super();
    this.config = config;
    this.events = new Map();
    this.activeMonitors = new Set();
  }

  /**
   * Start monitoring geopolitical events
   */
  async start(): Promise<void> {
    console.log('Starting Geopolitical Monitor...');

    // Initialize monitoring for configured regions/countries
    for (const region of this.config.regions) {
      await this.startRegionMonitor(region);
    }

    for (const country of this.config.countries) {
      await this.startCountryMonitor(country);
    }

    // Set up periodic updates
    if (this.config.updateInterval > 0) {
      this.monitoringInterval = setInterval(() => {
        this.updateEvents();
      }, this.config.updateInterval);
    }

    this.emit('started', { timestamp: new Date() });
  }

  /**
   * Stop monitoring
   */
  async stop(): Promise<void> {
    console.log('Stopping Geopolitical Monitor...');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.activeMonitors.clear();
    this.emit('stopped', { timestamp: new Date() });
  }

  /**
   * Track a new geopolitical event
   */
  async trackEvent(event: GeopoliticalEvent): Promise<void> {
    // Validate event meets minimum thresholds
    if (!this.meetsThresholds(event)) {
      return;
    }

    this.events.set(event.id, event);
    this.emit('event', event);

    // Check if alert should be generated
    if (this.shouldAlert(event)) {
      await this.generateAlert(event);
    }

    // Trigger analysis for high-risk events
    if (event.riskLevel === RiskLevel.HIGH || event.riskLevel === RiskLevel.CRITICAL) {
      this.emit('high-risk-event', event);
    }
  }

  /**
   * Get events with optional filtering
   */
  getEvents(filter?: EventFilter): GeopoliticalEvent[] {
    let events = Array.from(this.events.values());

    if (!filter) {
      return events;
    }

    // Apply filters
    if (filter.countries && filter.countries.length > 0) {
      events = events.filter(e => filter.countries!.includes(e.country));
    }

    if (filter.regions && filter.regions.length > 0) {
      events = events.filter(e => filter.regions!.includes(e.region));
    }

    if (filter.eventTypes && filter.eventTypes.length > 0) {
      events = events.filter(e => filter.eventTypes!.includes(e.type));
    }

    if (filter.riskLevels && filter.riskLevels.length > 0) {
      events = events.filter(e => filter.riskLevels!.includes(e.riskLevel));
    }

    if (filter.dateRange) {
      events = events.filter(e =>
        e.timestamp >= filter.dateRange!.start &&
        e.timestamp <= filter.dateRange!.end
      );
    }

    if (filter.minConfidence !== undefined) {
      events = events.filter(e => e.confidence >= filter.minConfidence!);
    }

    if (filter.verified !== undefined) {
      events = events.filter(e => e.verified === filter.verified);
    }

    if (filter.tags && filter.tags.length > 0) {
      events = events.filter(e =>
        filter.tags!.some(tag => e.tags.includes(tag))
      );
    }

    return events;
  }

  /**
   * Get event by ID
   */
  getEvent(eventId: string): GeopoliticalEvent | undefined {
    return this.events.get(eventId);
  }

  /**
   * Update an existing event
   */
  updateEvent(eventId: string, updates: Partial<GeopoliticalEvent>): void {
    const event = this.events.get(eventId);
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    const updatedEvent = {
      ...event,
      ...updates,
      updatedAt: new Date()
    };

    this.events.set(eventId, updatedEvent);
    this.emit('event-updated', updatedEvent);
  }

  /**
   * Get monitoring statistics
   */
  getStats(): {
    totalEvents: number;
    eventsByType: Record<EventType, number>;
    eventsByRisk: Record<RiskLevel, number>;
    eventsByCountry: Record<string, number>;
    activeMonitors: number;
  } {
    const events = Array.from(this.events.values());

    const eventsByType = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<EventType, number>);

    const eventsByRisk = events.reduce((acc, event) => {
      acc[event.riskLevel] = (acc[event.riskLevel] || 0) + 1;
      return acc;
    }, {} as Record<RiskLevel, number>);

    const eventsByCountry = events.reduce((acc, event) => {
      acc[event.country] = (acc[event.country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalEvents: events.length,
      eventsByType,
      eventsByRisk,
      eventsByCountry,
      activeMonitors: this.activeMonitors.size
    };
  }

  /**
   * Clear all events
   */
  clearEvents(): void {
    this.events.clear();
    this.emit('events-cleared');
  }

  /**
   * Start monitoring a specific region
   */
  private async startRegionMonitor(region: string): Promise<void> {
    const monitorId = `region:${region}`;
    if (this.activeMonitors.has(monitorId)) {
      return;
    }

    this.activeMonitors.add(monitorId);
    console.log(`Started monitoring region: ${region}`);
  }

  /**
   * Start monitoring a specific country
   */
  private async startCountryMonitor(country: string): Promise<void> {
    const monitorId = `country:${country}`;
    if (this.activeMonitors.has(monitorId)) {
      return;
    }

    this.activeMonitors.add(monitorId);
    console.log(`Started monitoring country: ${country}`);
  }

  /**
   * Update events from sources
   */
  private async updateEvents(): Promise<void> {
    // This would integrate with various data sources
    // For now, emit an update event
    this.emit('update-cycle', {
      timestamp: new Date(),
      activeMonitors: this.activeMonitors.size,
      totalEvents: this.events.size
    });
  }

  /**
   * Check if event meets minimum thresholds
   */
  private meetsThresholds(event: GeopoliticalEvent): boolean {
    // Check minimum risk level
    const riskLevels = [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL];
    const minRiskIndex = riskLevels.indexOf(this.config.minRiskLevel);
    const eventRiskIndex = riskLevels.indexOf(event.riskLevel);

    if (eventRiskIndex < minRiskIndex) {
      return false;
    }

    // Check minimum confidence
    if (event.confidence < this.config.minConfidence) {
      return false;
    }

    // Check if event type is monitored
    if (this.config.eventTypes.length > 0 &&
        !this.config.eventTypes.includes(event.type)) {
      return false;
    }

    // Check if source is allowed
    if (this.config.sources.length > 0 &&
        !this.config.sources.includes(event.source)) {
      return false;
    }

    return true;
  }

  /**
   * Check if alert should be generated
   */
  private shouldAlert(event: GeopoliticalEvent): boolean {
    if (!this.config.enableAlerts) {
      return false;
    }

    // Check risk level threshold
    const riskLevels = [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL];
    const thresholdIndex = riskLevels.indexOf(this.config.alertThresholds.riskLevel);
    const eventRiskIndex = riskLevels.indexOf(event.riskLevel);

    if (eventRiskIndex >= thresholdIndex) {
      return true;
    }

    // Check volatility threshold
    if (event.volatilityScore >= this.config.alertThresholds.volatilityScore) {
      return true;
    }

    return false;
  }

  /**
   * Generate alert for event
   */
  private async generateAlert(event: GeopoliticalEvent): Promise<void> {
    const alert: Alert = {
      id: `alert-${event.id}-${Date.now()}`,
      eventId: event.id,
      severity: this.getAlertSeverity(event),
      title: `${event.riskLevel} Risk Event: ${event.title}`,
      message: `${event.type} in ${event.country} - ${event.description}`,
      timestamp: new Date(),
      acknowledged: false,
      recipients: []
    };

    this.emit('alert', alert);
  }

  /**
   * Determine alert severity
   */
  private getAlertSeverity(event: GeopoliticalEvent): 'INFO' | 'WARNING' | 'CRITICAL' {
    switch (event.riskLevel) {
      case RiskLevel.CRITICAL:
        return 'CRITICAL';
      case RiskLevel.HIGH:
        return 'WARNING';
      default:
        return 'INFO';
    }
  }
}
