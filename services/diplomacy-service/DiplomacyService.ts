import { DiplomaticEventTracker } from '@intelgraph/diplomatic-tracking';
import { TreatyMonitor } from '@intelgraph/treaty-monitor';
import { MultilateralTracker } from '@intelgraph/multilateral-tracking';
import { DiplomaticCommsAnalyzer } from '@intelgraph/diplomatic-comms';
import { CrisisDiplomacyMonitor } from '@intelgraph/crisis-diplomacy';
import { DiplomaticPersonnelTracker } from '@intelgraph/diplomatic-personnel';

/**
 * DiplomacyService
 *
 * Core service integrating all diplomacy tracking and monitoring capabilities
 * Provides unified APIs for diplomatic event tracking, treaty monitoring, and crisis diplomacy
 */
export class DiplomacyService {
  private eventTracker: DiplomaticEventTracker;
  private treatyMonitor: TreatyMonitor;
  private multilateralTracker: MultilateralTracker;
  private commsAnalyzer: DiplomaticCommsAnalyzer;
  private crisisMonitor: CrisisDiplomacyMonitor;
  private personnelTracker: DiplomaticPersonnelTracker;

  constructor() {
    this.eventTracker = new DiplomaticEventTracker();
    this.treatyMonitor = new TreatyMonitor();
    this.multilateralTracker = new MultilateralTracker();
    this.commsAnalyzer = new DiplomaticCommsAnalyzer();
    this.crisisMonitor = new CrisisDiplomacyMonitor();
    this.personnelTracker = new DiplomaticPersonnelTracker();
  }

  /**
   * Get comprehensive diplomatic dashboard for a country
   */
  getDiplomaticDashboard(country: string): {
    upcomingEvents: any[];
    activeTreaties: any[];
    diplomaticActivity: any;
    multilateralEngagement: any;
    activeCrises: any[];
    keyPersonnel: any[];
    recentCommunications: any[];
  } {
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
  trackDiplomaticEvent(event: any): void {
    this.eventTracker.trackEvent(event);
  }

  /**
   * Register treaty
   */
  registerTreaty(treaty: any): void {
    this.treatyMonitor.registerTreaty(treaty);
  }

  /**
   * Track diplomatic communication
   */
  trackCommunication(communication: any): void {
    this.commsAnalyzer.trackCommunication(communication);
  }

  /**
   * Monitor crisis
   */
  monitorCrisis(crisis: any): void {
    this.crisisMonitor.trackCrisis(crisis);
  }

  /**
   * Track diplomat
   */
  trackDiplomat(diplomat: any): void {
    this.personnelTracker.trackDiplomat(diplomat);
  }

  /**
   * Analyze bilateral diplomatic relationship
   */
  analyzeBilateralDiplomacy(country1: string, country2: string): {
    events: any[];
    treaties: any[];
    communications: any;
    personnel: any;
    engagement: any;
  } {
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
  getDiplomaticAlerts(country?: string): {
    upcomingEvents: any[];
    treatyDeadlines: any[];
    crisisEscalations: any[];
    policySignals: any[];
    personnelChanges: any[];
  } {
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
  searchDiplomaticRecords(query: {
    keyword?: string;
    country?: string;
    dateRange?: { start: Date; end: Date };
    type?: string;
  }): {
    events: any[];
    treaties: any[];
    communications: any[];
    crises: any[];
  } {
    let events = this.eventTracker.getAllEvents();
    let treaties = Array.from(this.treatyMonitor.getTreaty('') || []);
    let communications: any[] = [];
    let crises = this.crisisMonitor.getActiveCrises();

    // Filter by country
    if (query.country) {
      events = events.filter(e =>
        e.hostCountry === query.country || e.guestCountries.includes(query.country)
      );
      // Similar filtering for other collections
    }

    // Filter by date range
    if (query.dateRange) {
      events = events.filter(e =>
        e.scheduledStartDate >= query.dateRange!.start &&
        e.scheduledStartDate <= query.dateRange!.end
      );
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
  generateIntelligenceReport(country: string, days: number = 90): {
    summary: string;
    keyEvents: any[];
    diplomaticTrends: any;
    multilateralActivity: any;
    treatyStatus: any;
    personnelAssessment: any;
    crisisInvolvement: any;
    recommendations: string[];
  } {
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
  getStatistics(): {
    events: any;
    treaties: any;
    organizations: any;
    crises: any;
    diplomats: any;
    communications: any;
  } {
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

/**
 * Singleton instance
 */
export const diplomacyService = new DiplomacyService();
