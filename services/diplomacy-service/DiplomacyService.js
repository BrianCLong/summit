"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diplomacyService = exports.DiplomacyService = void 0;
const diplomatic_tracking_1 = require("@intelgraph/diplomatic-tracking");
const treaty_monitor_1 = require("@intelgraph/treaty-monitor");
const multilateral_tracking_1 = require("@intelgraph/multilateral-tracking");
const diplomatic_comms_1 = require("@intelgraph/diplomatic-comms");
const crisis_diplomacy_1 = require("@intelgraph/crisis-diplomacy");
const diplomatic_personnel_1 = require("@intelgraph/diplomatic-personnel");
/**
 * DiplomacyService
 *
 * Core service integrating all diplomacy tracking and monitoring capabilities
 * Provides unified APIs for diplomatic event tracking, treaty monitoring, and crisis diplomacy
 */
class DiplomacyService {
    eventTracker;
    treatyMonitor;
    multilateralTracker;
    commsAnalyzer;
    crisisMonitor;
    personnelTracker;
    constructor() {
        this.eventTracker = new diplomatic_tracking_1.DiplomaticEventTracker();
        this.treatyMonitor = new treaty_monitor_1.TreatyMonitor();
        this.multilateralTracker = new multilateral_tracking_1.MultilateralTracker();
        this.commsAnalyzer = new diplomatic_comms_1.DiplomaticCommsAnalyzer();
        this.crisisMonitor = new crisis_diplomacy_1.CrisisDiplomacyMonitor();
        this.personnelTracker = new diplomatic_personnel_1.DiplomaticPersonnelTracker();
    }
    /**
     * Get comprehensive diplomatic dashboard for a country
     */
    getDiplomaticDashboard(country) {
        // Get upcoming events
        const allEvents = this.eventTracker.getEventsByCountry(country);
        const upcomingEvents = allEvents
            .filter(e => e.scheduledStartDate > new Date())
            .slice(0, 10);
        // Get active treaties
        const activeTreaties = this.treatyMonitor.getTreatiesByParty(country)
            .filter(t => t.status === 'IN_FORCE')
            .slice(0, 10);
        // Get diplomatic activity analysis
        const diplomaticActivity = this.eventTracker.analyzeDiplomaticActivity(country, 90);
        // Get multilateral engagement
        const multilateralEngagement = this.multilateralTracker.analyzeCountryEngagement(country);
        // Get active crises involving country
        const activeCrises = this.crisisMonitor.getActiveCrises()
            .filter(c => c.parties.includes(country))
            .slice(0, 5);
        // Get key personnel
        const keyPersonnel = this.personnelTracker.getCountryDiplomats(country)
            .filter(d => ['AMBASSADOR', 'ENVOY', 'CONSUL_GENERAL'].includes(d.rank))
            .slice(0, 10);
        // Get recent communications
        const recentCommunications = this.commsAnalyzer.getCountryCommunications(country, 30)
            .slice(0, 15);
        return {
            upcomingEvents,
            activeTreaties,
            diplomaticActivity,
            multilateralEngagement,
            activeCrises,
            keyPersonnel,
            recentCommunications
        };
    }
    /**
     * Track diplomatic event
     */
    trackDiplomaticEvent(event) {
        this.eventTracker.trackEvent(event);
    }
    /**
     * Register treaty
     */
    registerTreaty(treaty) {
        this.treatyMonitor.registerTreaty(treaty);
    }
    /**
     * Track diplomatic communication
     */
    trackCommunication(communication) {
        this.commsAnalyzer.trackCommunication(communication);
    }
    /**
     * Monitor crisis
     */
    monitorCrisis(crisis) {
        this.crisisMonitor.trackCrisis(crisis);
    }
    /**
     * Track diplomat
     */
    trackDiplomat(diplomat) {
        this.personnelTracker.trackDiplomat(diplomat);
    }
    /**
     * Analyze bilateral diplomatic relationship
     */
    analyzeBilateralDiplomacy(country1, country2) {
        const events = this.eventTracker.getBilateralEvents(country1, country2);
        const treaties = this.treatyMonitor.getBilateralTreaties(country1, country2);
        const communications = this.commsAnalyzer.analyzeBilateralCommunications(country1, country2);
        const personnel = this.personnelTracker.getBilateralDiplomats(country1, country2);
        const engagement = this.eventTracker.detectEngagementPatterns(country1);
        return {
            events,
            treaties,
            communications,
            personnel,
            engagement
        };
    }
    /**
     * Get diplomatic alerts and notifications
     */
    getDiplomaticAlerts(country) {
        const today = new Date();
        const next30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        // Upcoming high-significance events
        const upcomingEvents = this.eventTracker.getUpcomingEvents(30)
            .filter(e => e.significance >= 7)
            .filter(e => !country || e.hostCountry === country || e.guestCountries.includes(country));
        // Treaty deadlines and expirations
        const treatyDeadlines = this.treatyMonitor.getExpiringSoon(90)
            .filter(t => !country || t.parties.some(p => p.country === country || p.organization === country));
        // Crisis escalations
        const crisisEscalations = this.crisisMonitor.getHighRiskCrises()
            .filter(c => !country || c.parties.includes(country));
        // Policy signals from communications
        const policySignals = this.commsAnalyzer.detectPolicySignals()
            .filter(s => !country || s.country === country);
        // Recent personnel changes
        const personnelChanges = this.personnelTracker.getRecentAppointments(30)
            .filter(a => !country || a.country === country);
        return {
            upcomingEvents,
            treatyDeadlines,
            crisisEscalations,
            policySignals,
            personnelChanges
        };
    }
    /**
     * Search diplomatic records
     */
    searchDiplomaticRecords(query) {
        let events = this.eventTracker.getAllEvents();
        let treaties = Array.from(this.treatyMonitor.getTreaty('') || []);
        let communications = [];
        let crises = this.crisisMonitor.getActiveCrises();
        // Filter by country
        if (query.country) {
            events = events.filter(e => e.hostCountry === query.country || e.guestCountries.includes(query.country));
            // Similar filtering for other collections
        }
        // Filter by date range
        if (query.dateRange) {
            events = events.filter(e => e.scheduledStartDate >= query.dateRange.start &&
                e.scheduledStartDate <= query.dateRange.end);
        }
        return {
            events: events.slice(0, 100),
            treaties: treaties.slice(0, 100),
            communications: communications.slice(0, 100),
            crises: crises.slice(0, 100)
        };
    }
    /**
     * Generate diplomatic intelligence report
     */
    generateIntelligenceReport(country, days = 90) {
        const dashboard = this.getDiplomaticDashboard(country);
        const alerts = this.getDiplomaticAlerts(country);
        return {
            summary: `Diplomatic intelligence report for ${country} covering ${days} days`,
            keyEvents: dashboard.upcomingEvents,
            diplomaticTrends: dashboard.diplomaticActivity,
            multilateralActivity: dashboard.multilateralEngagement,
            treatyStatus: {
                active: dashboard.activeTreaties.length,
                pending: this.treatyMonitor.getPendingRatifications(country).length
            },
            personnelAssessment: {
                keyDiplomats: dashboard.keyPersonnel.length,
                recentChanges: alerts.personnelChanges.length
            },
            crisisInvolvement: {
                activeCrises: dashboard.activeCrises.length,
                highRisk: alerts.crisisEscalations.length
            },
            recommendations: [
                'Monitor upcoming high-level events closely',
                'Review treaty compliance status',
                'Assess crisis escalation risks',
                'Track diplomatic personnel movements'
            ]
        };
    }
    /**
     * Get service statistics
     */
    getStatistics() {
        return {
            events: this.eventTracker.getStatistics(),
            treaties: this.treatyMonitor.getStatistics(),
            organizations: this.multilateralTracker.getStatistics(),
            crises: this.crisisMonitor.getStatistics(),
            diplomats: this.personnelTracker.getStatistics(),
            communications: this.commsAnalyzer.getStatistics()
        };
    }
}
exports.DiplomacyService = DiplomacyService;
/**
 * Singleton instance
 */
exports.diplomacyService = new DiplomacyService();
