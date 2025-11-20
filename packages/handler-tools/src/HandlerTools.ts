import { v4 as uuidv4 } from 'uuid';
import {
  MeetingPlan,
  MeetingPlanSchema,
  SafeLocation,
  SafeLocationSchema,
  CommunicationProtocol,
  CommunicationProtocolSchema,
  AfterActionReport,
  AfterActionReportSchema,
  HandlerPerformance,
  HandlerWorkload,
  MeetingStatus,
  SecurityLevel
} from './types.js';

/**
 * Handler and Case Officer Tools
 * Provides tools for meeting management, performance tracking, and operational support
 */
export class HandlerTools {
  private meetings: Map<string, MeetingPlan> = new Map();
  private locations: Map<string, SafeLocation> = new Map();
  private protocols: Map<string, CommunicationProtocol> = new Map();
  private aarReports: Map<string, AfterActionReport> = new Map();

  /**
   * Register a safe location
   */
  registerSafeLocation(data: Omit<SafeLocation, 'id'>): SafeLocation {
    const location: SafeLocation = {
      ...data,
      id: uuidv4()
    };

    const validated = SafeLocationSchema.parse(location);
    this.locations.set(validated.id, validated);

    return validated;
  }

  /**
   * Get safe location
   */
  getSafeLocation(id: string): SafeLocation | undefined {
    return this.locations.get(id);
  }

  /**
   * Search safe locations by criteria
   */
  searchSafeLocations(criteria: {
    securityLevel?: SecurityLevel;
    approved?: boolean;
    coverType?: string;
  }): SafeLocation[] {
    return Array.from(this.locations.values()).filter(location => {
      if (criteria.securityLevel && location.securityLevel !== criteria.securityLevel) {
        return false;
      }
      if (criteria.approved !== undefined && location.approved !== criteria.approved) {
        return false;
      }
      if (criteria.coverType && location.coverType !== criteria.coverType) {
        return false;
      }
      return true;
    });
  }

  /**
   * Plan a meeting
   */
  planMeeting(data: Omit<MeetingPlan, 'id' | 'created' | 'updated' | 'status'>): MeetingPlan {
    const meeting: MeetingPlan = {
      ...data,
      id: uuidv4(),
      status: MeetingStatus.PLANNED,
      created: new Date(),
      updated: new Date()
    };

    const validated = MeetingPlanSchema.parse(meeting);
    this.meetings.set(validated.id, validated);

    return validated;
  }

  /**
   * Update meeting status
   */
  updateMeetingStatus(id: string, status: MeetingStatus, details?: Partial<MeetingPlan>): MeetingPlan {
    const meeting = this.meetings.get(id);
    if (!meeting) {
      throw new Error(`Meeting not found: ${id}`);
    }

    const updated = {
      ...meeting,
      ...details,
      status,
      updated: new Date()
    };

    const validated = MeetingPlanSchema.parse(updated);
    this.meetings.set(id, validated);

    return validated;
  }

  /**
   * Start a meeting
   */
  startMeeting(id: string): MeetingPlan {
    return this.updateMeetingStatus(id, MeetingStatus.IN_PROGRESS, {
      actualStartTime: new Date()
    });
  }

  /**
   * Complete a meeting
   */
  completeMeeting(id: string, outcome: string): MeetingPlan {
    return this.updateMeetingStatus(id, MeetingStatus.COMPLETED, {
      actualEndTime: new Date(),
      outcome
    });
  }

  /**
   * Get meetings for a handler
   */
  getHandlerMeetings(handlerId: string): MeetingPlan[] {
    return Array.from(this.meetings.values()).filter(
      m => m.handlerId === handlerId || m.backupHandler === handlerId
    );
  }

  /**
   * Get upcoming meetings
   */
  getUpcomingMeetings(handlerId?: string): MeetingPlan[] {
    const now = new Date();
    const meetings = Array.from(this.meetings.values()).filter(m => {
      const isUpcoming = m.scheduledDate > now &&
        (m.status === MeetingStatus.PLANNED || m.status === MeetingStatus.CONFIRMED);

      if (handlerId) {
        return isUpcoming && (m.handlerId === handlerId || m.backupHandler === handlerId);
      }

      return isUpcoming;
    });

    return meetings.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  }

  /**
   * Create communication protocol
   */
  createCommunicationProtocol(data: Omit<CommunicationProtocol, 'id'>): CommunicationProtocol {
    const protocol: CommunicationProtocol = {
      ...data,
      id: uuidv4()
    };

    const validated = CommunicationProtocolSchema.parse(protocol);
    this.protocols.set(validated.sourceId, validated);

    return validated;
  }

  /**
   * Get communication protocol for a source
   */
  getCommunicationProtocol(sourceId: string): CommunicationProtocol | undefined {
    return this.protocols.get(sourceId);
  }

  /**
   * Update communication protocol
   */
  updateCommunicationProtocol(sourceId: string, updates: Partial<CommunicationProtocol>): CommunicationProtocol {
    const protocol = this.protocols.get(sourceId);
    if (!protocol) {
      throw new Error(`Protocol not found for source: ${sourceId}`);
    }

    const updated = {
      ...protocol,
      ...updates
    };

    const validated = CommunicationProtocolSchema.parse(updated);
    this.protocols.set(sourceId, validated);

    return validated;
  }

  /**
   * Create After Action Report
   */
  createAfterActionReport(data: Omit<AfterActionReport, 'id'>): AfterActionReport {
    const report: AfterActionReport = {
      ...data,
      id: uuidv4()
    };

    const validated = AfterActionReportSchema.parse(report);
    this.aarReports.set(validated.id, validated);

    // Update meeting with outcome
    const meeting = this.meetings.get(data.meetingId);
    if (meeting && meeting.status !== MeetingStatus.COMPLETED) {
      this.completeMeeting(
        data.meetingId,
        `Report filed: ${validated.intelligenceGathered.length} intelligence items`
      );
    }

    return validated;
  }

  /**
   * Get AAR reports for a meeting
   */
  getAfterActionReport(meetingId: string): AfterActionReport | undefined {
    return Array.from(this.aarReports.values()).find(r => r.meetingId === meetingId);
  }

  /**
   * Get all AAR reports for a handler
   */
  getHandlerAARReports(handlerId: string): AfterActionReport[] {
    return Array.from(this.aarReports.values()).filter(r => r.handlerId === handlerId);
  }

  /**
   * Calculate handler performance
   */
  calculateHandlerPerformance(handlerId: string, startDate: Date, endDate: Date): HandlerPerformance {
    const meetings = this.getHandlerMeetings(handlerId).filter(
      m => m.scheduledDate >= startDate && m.scheduledDate <= endDate
    );

    const completedMeetings = meetings.filter(m => m.status === MeetingStatus.COMPLETED);
    const aarReports = this.getHandlerAARReports(handlerId).filter(
      r => r.reportDate >= startDate && r.reportDate <= endDate
    );

    const totalIntelValue = aarReports.reduce((sum, r) => {
      return sum + r.intelligenceGathered.reduce((s, i) => s + (10 - i.credibility), 0) / r.intelligenceGathered.length;
    }, 0);

    const avgIntelValue = aarReports.length > 0 ? totalIntelValue / aarReports.length : 0;

    const securityViolations = aarReports.reduce((sum, r) => {
      return sum + r.securityAssessment.securityIncidents.length;
    }, 0);

    const meetingCompletionRate = meetings.length > 0
      ? (completedMeetings.length / meetings.length) * 100
      : 0;

    const reportQualityScore = aarReports.length > 0
      ? aarReports.reduce((sum, r) => sum + r.intelligenceGathered.length, 0) / aarReports.length * 10
      : 0;

    const overallScore = Math.min(100, Math.round(
      (meetingCompletionRate * 0.3) +
      (avgIntelValue * 10 * 0.3) +
      (Math.max(0, 100 - securityViolations * 10) * 0.2) +
      (reportQualityScore * 0.2)
    ));

    return {
      handlerId,
      period: { start: startDate, end: endDate },
      metrics: {
        totalSources: 0, // Would come from SourceDatabase
        activeSources: 0, // Would come from SourceDatabase
        meetingsScheduled: meetings.length,
        meetingsCompleted: completedMeetings.length,
        meetingCompletionRate,
        avgIntelligenceValue: avgIntelValue,
        sourcesRecruited: 0,
        sourcesRetained: 0,
        securityViolations,
        reportQualityScore: Math.min(100, reportQualityScore),
        responseTime: 0,
        overallScore
      }
    };
  }

  /**
   * Calculate handler workload
   */
  calculateHandlerWorkload(handlerId: string, totalSources: number, activeSources: number): HandlerWorkload {
    const upcomingMeetings = this.getUpcomingMeetings(handlerId).length;
    const meetings = this.getHandlerMeetings(handlerId);
    const pendingReports = meetings.filter(
      m => m.status === MeetingStatus.COMPLETED && !this.getAfterActionReport(m.id)
    ).length;

    // Workload calculation: sources * 2 + meetings * 5 + reports * 3
    const workloadScore = Math.min(100,
      (activeSources * 2) + (upcomingMeetings * 5) + (pendingReports * 3)
    );

    let status: HandlerWorkload['status'];
    if (workloadScore < 30) {
      status = 'UNDER_CAPACITY';
    } else if (workloadScore < 60) {
      status = 'OPTIMAL';
    } else if (workloadScore < 80) {
      status = 'NEAR_CAPACITY';
    } else {
      status = 'OVER_CAPACITY';
    }

    return {
      handlerId,
      totalSources,
      activeSources,
      upcomingMeetings,
      pendingReports,
      trainingHours: 0,
      workloadScore,
      status
    };
  }

  /**
   * Generate meeting briefing materials
   */
  generateBriefingMaterials(meetingId: string): string {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) {
      throw new Error(`Meeting not found: ${meetingId}`);
    }

    const location = meeting.locationId ? this.locations.get(meeting.locationId) : null;
    const protocol = this.protocols.get(meeting.sourceId);

    return `
MEETING BRIEFING
================
Meeting ID: ${meeting.id}
Scheduled: ${meeting.scheduledDate.toISOString()}
Duration: ${meeting.duration} minutes
Type: ${meeting.type}
Security Level: ${meeting.securityLevel}

OBJECTIVES:
${meeting.objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

LOCATION:
${location ? `${location.name} - ${location.address}` : meeting.locationDetails || 'TBD'}
${location ? `Security Level: ${location.securityLevel}` : ''}

COMMUNICATION PROTOCOL:
${protocol ? `Primary: ${protocol.primaryMethod}` : 'Not established'}
${protocol ? `Authentication Code: ${protocol.authenticationCode}` : ''}
${protocol ? `Duress Code: ${protocol.duressCode}` : ''}

EMERGENCY PROTOCOL:
${meeting.emergencyProtocol}

SURVEILLANCE DETECTION:
${meeting.surveillanceDetection ? 'REQUIRED' : 'NOT REQUIRED'}

${meeting.briefingMaterials && meeting.briefingMaterials.length > 0 ?
  `ATTACHMENTS:\n${meeting.briefingMaterials.join('\n')}` : ''}
`.trim();
  }

  /**
   * Get all meetings
   */
  getAllMeetings(): MeetingPlan[] {
    return Array.from(this.meetings.values());
  }

  /**
   * Get all safe locations
   */
  getAllSafeLocations(): SafeLocation[] {
    return Array.from(this.locations.values());
  }
}
