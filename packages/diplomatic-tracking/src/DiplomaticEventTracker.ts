import {
  DiplomaticEvent,
  DiplomaticEventType,
  EventStatus,
  Participant,
  StateVisit,
  SummitEvent,
  NegotiationSession,
  EmbassyActivity,
  BackchannelIndicator
} from './types.js';

/**
 * DiplomaticEventTracker
 *
 * Core tracking system for diplomatic events, state visits, summits,
 * negotiations, and all forms of diplomatic engagement
 */
export class DiplomaticEventTracker {
  private events: Map<string, DiplomaticEvent> = new Map();
  private eventsByType: Map<DiplomaticEventType, Set<string>> = new Map();
  private eventsByCountry: Map<string, Set<string>> = new Map();
  private eventsByParticipant: Map<string, Set<string>> = new Map();
  private upcomingEvents: DiplomaticEvent[] = [];

  /**
   * Track a new diplomatic event
   */
  trackEvent(event: DiplomaticEvent): void {
    this.events.set(event.id, event);

    // Index by type
    if (!this.eventsByType.has(event.type)) {
      this.eventsByType.set(event.type, new Set());
    }
    this.eventsByType.get(event.type)!.add(event.id);

    // Index by country
    const countries = [event.hostCountry, ...event.guestCountries];
    for (const country of countries) {
      if (!this.eventsByCountry.has(country)) {
        this.eventsByCountry.set(country, new Set());
      }
      this.eventsByCountry.get(country)!.add(event.id);
    }

    // Index by participant
    for (const participant of event.participants) {
      const key = `${participant.country}:${participant.name}`;
      if (!this.eventsByParticipant.has(key)) {
        this.eventsByParticipant.set(key, new Set());
      }
      this.eventsByParticipant.get(key)!.add(event.id);
    }

    // Track upcoming events
    if (event.status === EventStatus.SCHEDULED || event.status === EventStatus.CONFIRMED) {
      this.upcomingEvents.push(event);
      this.upcomingEvents.sort((a, b) =>
        a.scheduledStartDate.getTime() - b.scheduledStartDate.getTime()
      );
    }
  }

  /**
   * Get events by type
   */
  getEventsByType(type: DiplomaticEventType): DiplomaticEvent[] {
    const eventIds = this.eventsByType.get(type) || new Set();
    return Array.from(eventIds)
      .map(id => this.events.get(id))
      .filter((e): e is DiplomaticEvent => e !== undefined);
  }

  /**
   * Get events involving a specific country
   */
  getEventsByCountry(country: string): DiplomaticEvent[] {
    const eventIds = this.eventsByCountry.get(country) || new Set();
    return Array.from(eventIds)
      .map(id => this.events.get(id))
      .filter((e): e is DiplomaticEvent => e !== undefined);
  }

  /**
   * Get bilateral events between two countries
   */
  getBilateralEvents(country1: string, country2: string): DiplomaticEvent[] {
    const events1 = this.eventsByCountry.get(country1) || new Set();
    const events2 = this.eventsByCountry.get(country2) || new Set();

    const bilateralIds = Array.from(events1).filter(id => events2.has(id));
    return bilateralIds
      .map(id => this.events.get(id))
      .filter((e): e is DiplomaticEvent => e !== undefined)
      .filter(e =>
        e.type === DiplomaticEventType.BILATERAL_MEETING ||
        e.type === DiplomaticEventType.STATE_VISIT ||
        e.type === DiplomaticEventType.OFFICIAL_VISIT
      );
  }

  /**
   * Get upcoming events within a time window
   */
  getUpcomingEvents(daysAhead: number = 30): DiplomaticEvent[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

    return this.upcomingEvents.filter(e =>
      e.scheduledStartDate <= cutoffDate
    );
  }

  /**
   * Get high-significance events
   */
  getHighSignificanceEvents(minSignificance: number = 8): DiplomaticEvent[] {
    return Array.from(this.events.values())
      .filter(e => e.significance >= minSignificance)
      .sort((a, b) => b.significance - a.significance);
  }

  /**
   * Track state visit with full ceremonial details
   */
  trackStateVisit(visit: StateVisit): void {
    this.trackEvent(visit);
  }

  /**
   * Track summit with working groups and side events
   */
  trackSummit(summit: SummitEvent): void {
    this.trackEvent(summit);

    // Also track side events
    if (summit.sideEvents) {
      for (const sideEvent of summit.sideEvents) {
        this.trackEvent(sideEvent);
      }
    }
  }

  /**
   * Track negotiation sessions
   */
  trackNegotiationSession(session: NegotiationSession): void {
    // Store as part of diplomatic events
    const event: DiplomaticEvent = {
      id: session.id,
      type: DiplomaticEventType.NEGOTIATION_SESSION,
      title: `Negotiation Session ${session.sessionNumber}`,
      description: `Session ${session.sessionNumber} of negotiation ${session.negotiationId}`,
      status: EventStatus.COMPLETED,
      scheduledStartDate: session.date,
      participants: session.participants,
      hostCountry: session.participants[0]?.country || '',
      guestCountries: session.participants.slice(1).map(p => p.country),
      location: { city: '', country: '' },
      significance: this.calculateNegotiationSignificance(session),
      confidentialityLevel: session.confidentialityLevel as any,
      createdAt: new Date(),
      updatedAt: new Date(),
      sources: [],
      confidence: 1,
      verified: true
    };

    this.trackEvent(event);
  }

  /**
   * Track embassy activities
   */
  trackEmbassyActivity(activity: EmbassyActivity): void {
    const event: DiplomaticEvent = {
      id: activity.id,
      type: DiplomaticEventType.EMBASSY_EVENT,
      title: activity.activityType,
      description: activity.description,
      status: EventStatus.COMPLETED,
      scheduledStartDate: activity.date,
      participants: activity.participants || [],
      hostCountry: activity.hostCountry,
      guestCountries: [activity.country],
      location: { city: '', country: activity.hostCountry },
      significance: activity.significance || 3,
      confidentialityLevel: activity.publicVisibility ? 'PUBLIC' : 'RESTRICTED',
      createdAt: new Date(),
      updatedAt: new Date(),
      sources: [],
      confidence: 1,
      verified: true
    };

    this.trackEvent(event);
  }

  /**
   * Detect and track backchannel communications
   */
  trackBackchannelIndicator(indicator: BackchannelIndicator): void {
    const event: DiplomaticEvent = {
      id: indicator.id,
      type: DiplomaticEventType.BACKCHANNEL_COMMUNICATION,
      title: `Backchannel: ${indicator.indicatorType}`,
      description: indicator.context || `Possible backchannel communication between ${indicator.countries.join(', ')}`,
      status: EventStatus.RUMORED,
      scheduledStartDate: indicator.date,
      participants: [],
      hostCountry: indicator.location?.country || indicator.countries[0],
      guestCountries: indicator.countries.slice(1),
      location: indicator.location || { city: 'Unknown', country: indicator.countries[0] },
      significance: 7, // Backchannels are often significant
      confidentialityLevel: 'CONFIDENTIAL',
      createdAt: new Date(),
      updatedAt: new Date(),
      sources: indicator.sources,
      confidence: indicator.confidence,
      verified: false
    };

    this.trackEvent(event);
  }

  /**
   * Analyze diplomatic activity patterns for a country
   */
  analyzeDiplomaticActivity(country: string, days: number = 90): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    topPartners: { country: string; events: number }[];
    averageSignificance: number;
    activityTrend: 'INCREASING' | 'STABLE' | 'DECREASING';
  } {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const events = this.getEventsByCountry(country)
      .filter(e => e.scheduledStartDate >= cutoffDate);

    // Count by type
    const eventsByType: Record<string, number> = {};
    for (const event of events) {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
    }

    // Top diplomatic partners
    const partnerCounts = new Map<string, number>();
    for (const event of events) {
      const partners = event.hostCountry === country
        ? event.guestCountries
        : [event.hostCountry, ...event.guestCountries.filter(c => c !== country)];

      for (const partner of partners) {
        partnerCounts.set(partner, (partnerCounts.get(partner) || 0) + 1);
      }
    }

    const topPartners = Array.from(partnerCounts.entries())
      .map(([country, events]) => ({ country, events }))
      .sort((a, b) => b.events - a.events)
      .slice(0, 10);

    // Average significance
    const averageSignificance = events.length > 0
      ? events.reduce((sum, e) => sum + e.significance, 0) / events.length
      : 0;

    // Activity trend (compare first half vs second half)
    const midpoint = new Date(cutoffDate.getTime() + (Date.now() - cutoffDate.getTime()) / 2);
    const firstHalf = events.filter(e => e.scheduledStartDate < midpoint).length;
    const secondHalf = events.filter(e => e.scheduledStartDate >= midpoint).length;

    let activityTrend: 'INCREASING' | 'STABLE' | 'DECREASING' = 'STABLE';
    if (secondHalf > firstHalf * 1.2) activityTrend = 'INCREASING';
    else if (secondHalf < firstHalf * 0.8) activityTrend = 'DECREASING';

    return {
      totalEvents: events.length,
      eventsByType,
      topPartners,
      averageSignificance,
      activityTrend
    };
  }

  /**
   * Detect patterns in diplomatic engagement
   */
  detectEngagementPatterns(country: string): {
    preferredVenues: string[];
    frequentTopics: string[];
    diplomaticStyle: string;
    multilateralEngagement: number;
    bilateralEngagement: number;
  } {
    const events = this.getEventsByCountry(country);

    // Preferred venues
    const venueCounts = new Map<string, number>();
    for (const event of events) {
      if (event.location.city) {
        venueCounts.set(event.location.city, (venueCounts.get(event.location.city) || 0) + 1);
      }
    }

    const preferredVenues = Array.from(venueCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([venue]) => venue);

    // Frequent topics
    const topicCounts = new Map<string, number>();
    for (const event of events) {
      if (event.topics) {
        for (const topic of event.topics) {
          topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
        }
      }
    }

    const frequentTopics = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic]) => topic);

    // Bilateral vs multilateral
    const bilateral = events.filter(e =>
      e.type === DiplomaticEventType.BILATERAL_MEETING ||
      e.type === DiplomaticEventType.STATE_VISIT ||
      e.type === DiplomaticEventType.OFFICIAL_VISIT
    ).length;

    const multilateral = events.filter(e =>
      e.type === DiplomaticEventType.MULTILATERAL_MEETING ||
      e.type === DiplomaticEventType.SUMMIT ||
      e.type === DiplomaticEventType.CONFERENCE
    ).length;

    // Determine diplomatic style
    let diplomaticStyle = 'BALANCED';
    if (bilateral > multilateral * 2) diplomaticStyle = 'BILATERAL_FOCUSED';
    else if (multilateral > bilateral * 2) diplomaticStyle = 'MULTILATERAL_FOCUSED';

    return {
      preferredVenues,
      frequentTopics,
      diplomaticStyle,
      multilateralEngagement: multilateral,
      bilateralEngagement: bilateral
    };
  }

  private calculateNegotiationSignificance(session: NegotiationSession): number {
    let significance = 5; // Base significance

    if (session.progress === 'BREAKTHROUGH') significance += 3;
    else if (session.progress === 'PROGRESS') significance += 1;
    else if (session.progress === 'DEADLOCK') significance += 2; // Deadlocks are also significant

    // Higher session numbers might indicate long-running important negotiations
    if (session.sessionNumber > 10) significance += 1;

    return Math.min(significance, 10);
  }

  /**
   * Get event by ID
   */
  getEvent(id: string): DiplomaticEvent | undefined {
    return this.events.get(id);
  }

  /**
   * Update event status
   */
  updateEventStatus(id: string, status: EventStatus): void {
    const event = this.events.get(id);
    if (event) {
      event.status = status;
      event.updatedAt = new Date();
    }
  }

  /**
   * Get all events
   */
  getAllEvents(): DiplomaticEvent[] {
    return Array.from(this.events.values());
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByStatus: Record<string, number>;
    upcomingCount: number;
  } {
    const events = Array.from(this.events.values());

    const eventsByType: Record<string, number> = {};
    const eventsByStatus: Record<string, number> = {};

    for (const event of events) {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      eventsByStatus[event.status] = (eventsByStatus[event.status] || 0) + 1;
    }

    return {
      totalEvents: events.length,
      eventsByType,
      eventsByStatus,
      upcomingCount: this.upcomingEvents.length
    };
  }
}
