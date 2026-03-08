"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiplomaticEventTracker = void 0;
const types_js_1 = require("./types.js");
/**
 * DiplomaticEventTracker
 *
 * Core tracking system for diplomatic events, state visits, summits,
 * negotiations, and all forms of diplomatic engagement
 */
class DiplomaticEventTracker {
    events = new Map();
    eventsByType = new Map();
    eventsByCountry = new Map();
    eventsByParticipant = new Map();
    upcomingEvents = [];
    /**
     * Track a new diplomatic event
     */
    trackEvent(event) {
        this.events.set(event.id, event);
        // Index by type
        if (!this.eventsByType.has(event.type)) {
            this.eventsByType.set(event.type, new Set());
        }
        this.eventsByType.get(event.type).add(event.id);
        // Index by country
        const countries = [event.hostCountry, ...event.guestCountries];
        for (const country of countries) {
            if (!this.eventsByCountry.has(country)) {
                this.eventsByCountry.set(country, new Set());
            }
            this.eventsByCountry.get(country).add(event.id);
        }
        // Index by participant
        for (const participant of event.participants) {
            const key = `${participant.country}:${participant.name}`;
            if (!this.eventsByParticipant.has(key)) {
                this.eventsByParticipant.set(key, new Set());
            }
            this.eventsByParticipant.get(key).add(event.id);
        }
        // Track upcoming events
        if (event.status === types_js_1.EventStatus.SCHEDULED || event.status === types_js_1.EventStatus.CONFIRMED) {
            this.upcomingEvents.push(event);
            this.upcomingEvents.sort((a, b) => a.scheduledStartDate.getTime() - b.scheduledStartDate.getTime());
        }
    }
    /**
     * Get events by type
     */
    getEventsByType(type) {
        const eventIds = this.eventsByType.get(type) || new Set();
        return Array.from(eventIds)
            .map(id => this.events.get(id))
            .filter((e) => e !== undefined);
    }
    /**
     * Get events involving a specific country
     */
    getEventsByCountry(country) {
        const eventIds = this.eventsByCountry.get(country) || new Set();
        return Array.from(eventIds)
            .map(id => this.events.get(id))
            .filter((e) => e !== undefined);
    }
    /**
     * Get bilateral events between two countries
     */
    getBilateralEvents(country1, country2) {
        const events1 = this.eventsByCountry.get(country1) || new Set();
        const events2 = this.eventsByCountry.get(country2) || new Set();
        const bilateralIds = Array.from(events1).filter(id => events2.has(id));
        return bilateralIds
            .map(id => this.events.get(id))
            .filter((e) => e !== undefined)
            .filter(e => e.type === types_js_1.DiplomaticEventType.BILATERAL_MEETING ||
            e.type === types_js_1.DiplomaticEventType.STATE_VISIT ||
            e.type === types_js_1.DiplomaticEventType.OFFICIAL_VISIT);
    }
    /**
     * Get upcoming events within a time window
     */
    getUpcomingEvents(daysAhead = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() + daysAhead);
        return this.upcomingEvents.filter(e => e.scheduledStartDate <= cutoffDate);
    }
    /**
     * Get high-significance events
     */
    getHighSignificanceEvents(minSignificance = 8) {
        return Array.from(this.events.values())
            .filter(e => e.significance >= minSignificance)
            .sort((a, b) => b.significance - a.significance);
    }
    /**
     * Track state visit with full ceremonial details
     */
    trackStateVisit(visit) {
        this.trackEvent(visit);
    }
    /**
     * Track summit with working groups and side events
     */
    trackSummit(summit) {
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
    trackNegotiationSession(session) {
        // Store as part of diplomatic events
        const event = {
            id: session.id,
            type: types_js_1.DiplomaticEventType.NEGOTIATION_SESSION,
            title: `Negotiation Session ${session.sessionNumber}`,
            description: `Session ${session.sessionNumber} of negotiation ${session.negotiationId}`,
            status: types_js_1.EventStatus.COMPLETED,
            scheduledStartDate: session.date,
            participants: session.participants,
            hostCountry: session.participants[0]?.country || '',
            guestCountries: session.participants.slice(1).map(p => p.country),
            location: { city: '', country: '' },
            significance: this.calculateNegotiationSignificance(session),
            confidentialityLevel: session.confidentialityLevel,
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
    trackEmbassyActivity(activity) {
        const event = {
            id: activity.id,
            type: types_js_1.DiplomaticEventType.EMBASSY_EVENT,
            title: activity.activityType,
            description: activity.description,
            status: types_js_1.EventStatus.COMPLETED,
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
    trackBackchannelIndicator(indicator) {
        const event = {
            id: indicator.id,
            type: types_js_1.DiplomaticEventType.BACKCHANNEL_COMMUNICATION,
            title: `Backchannel: ${indicator.indicatorType}`,
            description: indicator.context || `Possible backchannel communication between ${indicator.countries.join(', ')}`,
            status: types_js_1.EventStatus.RUMORED,
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
    analyzeDiplomaticActivity(country, days = 90) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const events = this.getEventsByCountry(country)
            .filter(e => e.scheduledStartDate >= cutoffDate);
        // Count by type
        const eventsByType = {};
        for (const event of events) {
            eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
        }
        // Top diplomatic partners
        const partnerCounts = new Map();
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
        let activityTrend = 'STABLE';
        if (secondHalf > firstHalf * 1.2)
            activityTrend = 'INCREASING';
        else if (secondHalf < firstHalf * 0.8)
            activityTrend = 'DECREASING';
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
    detectEngagementPatterns(country) {
        const events = this.getEventsByCountry(country);
        // Preferred venues
        const venueCounts = new Map();
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
        const topicCounts = new Map();
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
        const bilateral = events.filter(e => e.type === types_js_1.DiplomaticEventType.BILATERAL_MEETING ||
            e.type === types_js_1.DiplomaticEventType.STATE_VISIT ||
            e.type === types_js_1.DiplomaticEventType.OFFICIAL_VISIT).length;
        const multilateral = events.filter(e => e.type === types_js_1.DiplomaticEventType.MULTILATERAL_MEETING ||
            e.type === types_js_1.DiplomaticEventType.SUMMIT ||
            e.type === types_js_1.DiplomaticEventType.CONFERENCE).length;
        // Determine diplomatic style
        let diplomaticStyle = 'BALANCED';
        if (bilateral > multilateral * 2)
            diplomaticStyle = 'BILATERAL_FOCUSED';
        else if (multilateral > bilateral * 2)
            diplomaticStyle = 'MULTILATERAL_FOCUSED';
        return {
            preferredVenues,
            frequentTopics,
            diplomaticStyle,
            multilateralEngagement: multilateral,
            bilateralEngagement: bilateral
        };
    }
    calculateNegotiationSignificance(session) {
        let significance = 5; // Base significance
        if (session.progress === 'BREAKTHROUGH')
            significance += 3;
        else if (session.progress === 'PROGRESS')
            significance += 1;
        else if (session.progress === 'DEADLOCK')
            significance += 2; // Deadlocks are also significant
        // Higher session numbers might indicate long-running important negotiations
        if (session.sessionNumber > 10)
            significance += 1;
        return Math.min(significance, 10);
    }
    /**
     * Get event by ID
     */
    getEvent(id) {
        return this.events.get(id);
    }
    /**
     * Update event status
     */
    updateEventStatus(id, status) {
        const event = this.events.get(id);
        if (event) {
            event.status = status;
            event.updatedAt = new Date();
        }
    }
    /**
     * Get all events
     */
    getAllEvents() {
        return Array.from(this.events.values());
    }
    /**
     * Get statistics
     */
    getStatistics() {
        const events = Array.from(this.events.values());
        const eventsByType = {};
        const eventsByStatus = {};
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
exports.DiplomaticEventTracker = DiplomaticEventTracker;
