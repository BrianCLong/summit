import { v4 as uuidv4 } from 'uuid';
import {
  DebriefSession,
  DebriefSessionSchema,
  DebriefQuestion,
  DebriefResponse,
  IntelligenceItem,
  IntelligenceItemSchema,
  IntelligenceReport,
  IntelligenceReportSchema,
  ReportTemplate,
  ReportTemplateSchema,
  CorroborationRecord,
  CorroborationRecordSchema,
  FeedbackRecord,
  FeedbackRecordSchema,
  ReportStatus,
  ValidationStatus
} from './types.js';

/**
 * Comprehensive Debriefing and Intelligence Reporting System
 */
export class DebriefSystem {
  private sessions: Map<string, DebriefSession> = new Map();
  private intelligenceItems: Map<string, IntelligenceItem> = new Map();
  private reports: Map<string, IntelligenceReport> = new Map();
  private templates: Map<string, ReportTemplate> = new Map();
  private corroborations: Map<string, CorroborationRecord[]> = new Map();
  private feedback: Map<string, FeedbackRecord[]> = new Map();
  private reportCounter: number = 1;

  /**
   * Start a debrief session
   */
  startDebriefSession(
    sourceId: string,
    handlerId: string,
    questions: Omit<DebriefQuestion, 'id'>[],
    options: {
      meetingId?: string;
      recordingEnabled?: boolean;
      transcriptionEnabled?: boolean;
    } = {}
  ): DebriefSession {
    const session: DebriefSession = {
      id: uuidv4(),
      sourceId,
      handlerId,
      meetingId: options.meetingId,
      startTime: new Date(),
      questions: questions.map(q => ({ ...q, id: uuidv4() })),
      responses: [],
      status: 'IN_PROGRESS',
      recordingEnabled: options.recordingEnabled || false,
      transcriptionEnabled: options.transcriptionEnabled || false
    };

    const validated = DebriefSessionSchema.parse(session);
    this.sessions.set(validated.id, validated);

    return validated;
  }

  /**
   * Add response to debrief session
   */
  addDebriefResponse(sessionId: string, response: Omit<DebriefResponse, 'timestamp'>): DebriefSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.status !== 'IN_PROGRESS' && session.status !== 'PAUSED') {
      throw new Error(`Cannot add response to ${session.status} session`);
    }

    const newResponse: DebriefResponse = {
      ...response,
      timestamp: new Date()
    };

    const updated = {
      ...session,
      responses: [...session.responses, newResponse]
    };

    const validated = DebriefSessionSchema.parse(updated);
    this.sessions.set(sessionId, validated);

    return validated;
  }

  /**
   * Complete a debrief session
   */
  completeDebriefSession(sessionId: string): DebriefSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const updated = {
      ...session,
      status: 'COMPLETED' as const,
      endTime: new Date()
    };

    const validated = DebriefSessionSchema.parse(updated);
    this.sessions.set(sessionId, validated);

    return validated;
  }

  /**
   * Get debrief session
   */
  getDebriefSession(id: string): DebriefSession | undefined {
    return this.sessions.get(id);
  }

  /**
   * Get sessions for a source
   */
  getSourceDebriefSessions(sourceId: string): DebriefSession[] {
    return Array.from(this.sessions.values()).filter(s => s.sourceId === sourceId);
  }

  /**
   * Create intelligence item from debrief
   */
  createIntelligenceItem(data: Omit<IntelligenceItem, 'id'>): IntelligenceItem {
    const item: IntelligenceItem = {
      ...data,
      id: uuidv4()
    };

    const validated = IntelligenceItemSchema.parse(item);
    this.intelligenceItems.set(validated.id, validated);

    return validated;
  }

  /**
   * Get intelligence item
   */
  getIntelligenceItem(id: string): IntelligenceItem | undefined {
    return this.intelligenceItems.get(id);
  }

  /**
   * Search intelligence items
   */
  searchIntelligenceItems(criteria: {
    sourceId?: string;
    topic?: string;
    category?: string;
    priority?: string;
    validationStatus?: ValidationStatus;
    startDate?: Date;
    endDate?: Date;
  }): IntelligenceItem[] {
    return Array.from(this.intelligenceItems.values()).filter(item => {
      if (criteria.sourceId && item.sourceId !== criteria.sourceId) return false;
      if (criteria.topic && !item.topic.toLowerCase().includes(criteria.topic.toLowerCase())) return false;
      if (criteria.category && item.category !== criteria.category) return false;
      if (criteria.priority && item.priority !== criteria.priority) return false;
      if (criteria.validationStatus && item.validationStatus !== criteria.validationStatus) return false;
      if (criteria.startDate && item.collectionDate < criteria.startDate) return false;
      if (criteria.endDate && item.collectionDate > criteria.endDate) return false;
      return true;
    });
  }

  /**
   * Create intelligence report
   */
  createIntelligenceReport(data: Omit<IntelligenceReport, 'id' | 'reportNumber' | 'created' | 'updated' | 'status'>): IntelligenceReport {
    const reportNumber = `HUMINT-${new Date().getFullYear()}-${String(this.reportCounter++).padStart(6, '0')}`;

    const report: IntelligenceReport = {
      ...data,
      id: uuidv4(),
      reportNumber,
      status: ReportStatus.DRAFT,
      created: new Date(),
      updated: new Date()
    };

    const validated = IntelligenceReportSchema.parse(report);
    this.reports.set(validated.id, validated);

    return validated;
  }

  /**
   * Update report status
   */
  updateReportStatus(
    reportId: string,
    status: ReportStatus,
    userId?: string
  ): IntelligenceReport {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    const updates: Partial<IntelligenceReport> = {
      status,
      updated: new Date()
    };

    if (status === ReportStatus.PENDING_REVIEW && userId) {
      updates.reviewerId = userId;
    } else if (status === ReportStatus.APPROVED && userId) {
      updates.approverId = userId;
    } else if (status === ReportStatus.DISSEMINATED) {
      updates.disseminationDate = new Date();
    }

    const updated = { ...report, ...updates };
    const validated = IntelligenceReportSchema.parse(updated);
    this.reports.set(reportId, validated);

    return validated;
  }

  /**
   * Get intelligence report
   */
  getIntelligenceReport(id: string): IntelligenceReport | undefined {
    return this.reports.get(id);
  }

  /**
   * Search reports
   */
  searchReports(criteria: {
    type?: string;
    status?: ReportStatus;
    priority?: string;
    authorId?: string;
    startDate?: Date;
    endDate?: Date;
  }): IntelligenceReport[] {
    return Array.from(this.reports.values()).filter(report => {
      if (criteria.type && report.type !== criteria.type) return false;
      if (criteria.status && report.status !== criteria.status) return false;
      if (criteria.priority && report.priority !== criteria.priority) return false;
      if (criteria.authorId && report.authorId !== criteria.authorId) return false;
      if (criteria.startDate && report.created < criteria.startDate) return false;
      if (criteria.endDate && report.created > criteria.endDate) return false;
      return true;
    });
  }

  /**
   * Create report template
   */
  createReportTemplate(data: Omit<ReportTemplate, 'id'>): ReportTemplate {
    const template: ReportTemplate = {
      ...data,
      id: uuidv4()
    };

    const validated = ReportTemplateSchema.parse(template);
    this.templates.set(validated.id, validated);

    return validated;
  }

  /**
   * Get report template
   */
  getReportTemplate(id: string): ReportTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Generate report from template
   */
  generateReportFromTemplate(
    templateId: string,
    data: {
      title: string;
      summary: string;
      sourceIds: string[];
      intelligenceItems: string[];
      authorId: string;
    }
  ): IntelligenceReport {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    return this.createIntelligenceReport({
      type: template.type,
      classification: template.defaultClassification,
      priority: 'ROUTINE',
      title: data.title,
      summary: data.summary,
      sourceIds: data.sourceIds,
      intelligenceItems: data.intelligenceItems,
      disseminationList: template.defaultDissemination || [],
      authorId: data.authorId
    });
  }

  /**
   * Add corroboration record
   */
  addCorroboration(data: Omit<CorroborationRecord, 'id'>): CorroborationRecord {
    const record: CorroborationRecord = {
      ...data,
      id: uuidv4()
    };

    const validated = CorroborationRecordSchema.parse(record);

    const records = this.corroborations.get(data.primaryItemId) || [];
    records.push(validated);
    this.corroborations.set(data.primaryItemId, records);

    // Update validation status of primary item
    const primaryItem = this.intelligenceItems.get(data.primaryItemId);
    if (primaryItem && primaryItem.validationStatus === ValidationStatus.PENDING) {
      const updated = {
        ...primaryItem,
        validationStatus: ValidationStatus.CORROBORATED,
        corroboratingSourceIds: [
          ...(primaryItem.corroboratingSourceIds || []),
          data.corroboratingItemId
        ]
      };
      this.intelligenceItems.set(data.primaryItemId, IntelligenceItemSchema.parse(updated));
    }

    return validated;
  }

  /**
   * Get corroborations for an intelligence item
   */
  getCorroborations(itemId: string): CorroborationRecord[] {
    return this.corroborations.get(itemId) || [];
  }

  /**
   * Add customer feedback
   */
  addFeedback(data: Omit<FeedbackRecord, 'id'>): FeedbackRecord {
    const record: FeedbackRecord = {
      ...data,
      id: uuidv4()
    };

    const validated = FeedbackRecordSchema.parse(record);

    const records = this.feedback.get(data.reportId) || [];
    records.push(validated);
    this.feedback.set(data.reportId, records);

    // Update report with feedback
    const report = this.reports.get(data.reportId);
    if (report) {
      const updated = {
        ...report,
        feedback: [
          ...(report.feedback || []),
          {
            customer: validated.customerName,
            rating: validated.overallRating,
            comments: validated.comments || '',
            date: validated.date
          }
        ]
      };
      this.reports.set(data.reportId, IntelligenceReportSchema.parse(updated));
    }

    return validated;
  }

  /**
   * Get feedback for a report
   */
  getReportFeedback(reportId: string): FeedbackRecord[] {
    return this.feedback.get(reportId) || [];
  }

  /**
   * Calculate average feedback score for a report
   */
  getAverageFeedbackScore(reportId: string): number {
    const feedbackRecords = this.getReportFeedback(reportId);
    if (feedbackRecords.length === 0) return 0;

    const total = feedbackRecords.reduce((sum, f) => sum + f.overallRating, 0);
    return total / feedbackRecords.length;
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const reports = Array.from(this.reports.values());
    const items = Array.from(this.intelligenceItems.values());

    return {
      totalDebriefSessions: this.sessions.size,
      activeDebriefSessions: Array.from(this.sessions.values()).filter(
        s => s.status === 'IN_PROGRESS'
      ).length,
      totalIntelligenceItems: items.length,
      validatedItems: items.filter(i => i.validationStatus === ValidationStatus.CORROBORATED).length,
      totalReports: reports.length,
      draftReports: reports.filter(r => r.status === ReportStatus.DRAFT).length,
      approvedReports: reports.filter(r => r.status === ReportStatus.APPROVED).length,
      disseminatedReports: reports.filter(r => r.status === ReportStatus.DISSEMINATED).length,
      averageFeedbackScore: this.calculateOverallAverageFeedback()
    };
  }

  /**
   * Calculate overall average feedback
   */
  private calculateOverallAverageFeedback(): number {
    const allFeedback = Array.from(this.feedback.values()).flat();
    if (allFeedback.length === 0) return 0;

    const total = allFeedback.reduce((sum, f) => sum + f.overallRating, 0);
    return total / allFeedback.length;
  }

  /**
   * Get all intelligence items
   */
  getAllIntelligenceItems(): IntelligenceItem[] {
    return Array.from(this.intelligenceItems.values());
  }

  /**
   * Get all reports
   */
  getAllReports(): IntelligenceReport[] {
    return Array.from(this.reports.values());
  }
}
