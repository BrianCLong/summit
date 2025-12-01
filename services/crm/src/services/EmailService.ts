/**
 * Email Service
 * Manages email integration, tracking, sequences, and templates
 */

import { EventEmitter } from 'events';
import type {
  EmailMessage,
  EmailAddress,
  EmailStatus,
  EmailTracking,
  EmailTrackingEvent,
  EmailTemplate,
  EmailSequence,
  EmailSequenceStep,
  SequenceStats,
} from '../models/types';

export interface EmailSendInput {
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  contactIds?: string[];
  companyId?: string;
  dealId?: string;
  templateId?: string;
  scheduledAt?: Date;
  trackOpens?: boolean;
  trackClicks?: boolean;
}

export interface EmailSearchParams {
  userId?: string;
  contactId?: string;
  companyId?: string;
  dealId?: string;
  threadId?: string;
  direction?: 'inbound' | 'outbound';
  status?: EmailStatus[];
  dateFrom?: Date;
  dateTo?: Date;
  hasOpens?: boolean;
  hasClicks?: boolean;
  hasReplies?: boolean;
  page?: number;
  limit?: number;
}

export interface EmailSearchResult {
  emails: EmailMessage[];
  total: number;
  page: number;
  limit: number;
}

export interface EmailStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  replied: number;
  bounced: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
}

export interface SequenceEnrollment {
  id: string;
  sequenceId: string;
  contactId: string;
  currentStep: number;
  status: 'active' | 'paused' | 'completed' | 'exited';
  startedAt: Date;
  lastStepAt?: Date;
  nextStepAt?: Date;
  exitReason?: string;
}

export class EmailService extends EventEmitter {
  private emails: Map<string, EmailMessage> = new Map();
  private templates: Map<string, EmailTemplate> = new Map();
  private sequences: Map<string, EmailSequence> = new Map();
  private enrollments: Map<string, SequenceEnrollment> = new Map();

  constructor() {
    super();
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    const templates: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Welcome Email',
        subject: 'Welcome to {{company_name}}!',
        bodyHtml: `<p>Hi {{first_name}},</p>
          <p>Thank you for your interest in {{company_name}}. We're excited to connect with you!</p>
          <p>Best regards,<br/>{{sender_name}}</p>`,
        category: 'onboarding',
        tags: ['welcome', 'onboarding'],
        variables: ['first_name', 'company_name', 'sender_name'],
        isShared: true,
        ownerId: 'system',
        usageCount: 0,
        openRate: 0,
        clickRate: 0,
        replyRate: 0,
      },
      {
        name: 'Follow-up',
        subject: 'Following up on our conversation',
        bodyHtml: `<p>Hi {{first_name}},</p>
          <p>I wanted to follow up on our recent conversation. Do you have any questions I can help answer?</p>
          <p>Best regards,<br/>{{sender_name}}</p>`,
        category: 'follow-up',
        tags: ['follow-up'],
        variables: ['first_name', 'sender_name'],
        isShared: true,
        ownerId: 'system',
        usageCount: 0,
        openRate: 0,
        clickRate: 0,
        replyRate: 0,
      },
      {
        name: 'Meeting Request',
        subject: 'Can we schedule a quick call?',
        bodyHtml: `<p>Hi {{first_name}},</p>
          <p>I'd love to schedule a quick call to discuss how we can help {{company}}.</p>
          <p>Are you available this week for a 15-minute chat?</p>
          <p>Best regards,<br/>{{sender_name}}</p>`,
        category: 'outreach',
        tags: ['meeting', 'outreach'],
        variables: ['first_name', 'company', 'sender_name'],
        isShared: true,
        ownerId: 'system',
        usageCount: 0,
        openRate: 0,
        clickRate: 0,
        replyRate: 0,
      },
    ];

    for (const template of templates) {
      const id = `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date();
      this.templates.set(id, { ...template, id, createdAt: now, updatedAt: now });
    }
  }

  /**
   * Send email
   */
  async send(input: EmailSendInput, userId: string): Promise<EmailMessage> {
    const id = this.generateId();
    const now = new Date();

    const email: EmailMessage = {
      id,
      threadId: `thread_${id}`,
      messageId: `<${id}@crm.summit.io>`,
      from: { email: `${userId}@summit.io`, name: userId },
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      subject: input.subject,
      bodyHtml: input.bodyHtml,
      bodyText: input.bodyText || this.stripHtml(input.bodyHtml),
      snippet: this.createSnippet(input.bodyText || this.stripHtml(input.bodyHtml)),
      attachments: [],
      contactIds: input.contactIds || [],
      companyId: input.companyId,
      dealId: input.dealId,
      userId,
      direction: 'outbound',
      status: input.scheduledAt ? 'scheduled' : 'sending',
      tracking: {
        opens: [],
        clicks: [],
        replies: [],
        unsubscribed: false,
        bounced: false,
      },
      templateId: input.templateId,
      scheduledAt: input.scheduledAt,
      createdAt: now,
    };

    this.emails.set(id, email);

    // Update template usage
    if (input.templateId) {
      const template = this.templates.get(input.templateId);
      if (template) {
        template.usageCount++;
        this.templates.set(input.templateId, template);
      }
    }

    // Simulate sending
    if (!input.scheduledAt) {
      await this.processSend(id);
    }

    this.emit('email:sent', email);

    return email;
  }

  /**
   * Process email sending
   */
  private async processSend(emailId: string): Promise<void> {
    const email = this.emails.get(emailId);
    if (!email) return;

    // Simulate delivery
    email.status = 'sent';
    email.sentAt = new Date();

    setTimeout(() => {
      const e = this.emails.get(emailId);
      if (e) {
        e.status = 'delivered';
        this.emails.set(emailId, e);
        this.emit('email:delivered', e);
      }
    }, 1000);

    this.emails.set(emailId, email);
  }

  /**
   * Record email open
   */
  async trackOpen(
    emailId: string,
    ip?: string,
    userAgent?: string
  ): Promise<EmailMessage> {
    const email = this.emails.get(emailId);
    if (!email) {
      throw new Error(`Email ${emailId} not found`);
    }

    const event: EmailTrackingEvent = {
      timestamp: new Date(),
      ip,
      userAgent,
    };

    email.tracking.opens.push(event);
    this.emails.set(emailId, email);

    this.emit('email:opened', email, event);

    // Update template stats
    if (email.templateId) {
      await this.updateTemplateStats(email.templateId);
    }

    return email;
  }

  /**
   * Record link click
   */
  async trackClick(
    emailId: string,
    linkUrl: string,
    ip?: string,
    userAgent?: string
  ): Promise<EmailMessage> {
    const email = this.emails.get(emailId);
    if (!email) {
      throw new Error(`Email ${emailId} not found`);
    }

    const event: EmailTrackingEvent = {
      timestamp: new Date(),
      ip,
      userAgent,
      linkUrl,
    };

    email.tracking.clicks.push(event);
    this.emails.set(emailId, email);

    this.emit('email:clicked', email, event);

    // Update template stats
    if (email.templateId) {
      await this.updateTemplateStats(email.templateId);
    }

    return email;
  }

  /**
   * Record reply
   */
  async trackReply(emailId: string, replyMessageId: string): Promise<EmailMessage> {
    const email = this.emails.get(emailId);
    if (!email) {
      throw new Error(`Email ${emailId} not found`);
    }

    email.tracking.replies.push(replyMessageId);
    this.emails.set(emailId, email);

    this.emit('email:replied', email, replyMessageId);

    // Check for sequence exit
    await this.checkSequenceExit(email, 'reply');

    return email;
  }

  /**
   * Record bounce
   */
  async trackBounce(emailId: string, bounceType: 'hard' | 'soft'): Promise<EmailMessage> {
    const email = this.emails.get(emailId);
    if (!email) {
      throw new Error(`Email ${emailId} not found`);
    }

    email.status = 'bounced';
    email.tracking.bounced = true;
    email.tracking.bounceType = bounceType;
    this.emails.set(emailId, email);

    this.emit('email:bounced', email, bounceType);

    return email;
  }

  /**
   * Get email by ID
   */
  async getById(id: string): Promise<EmailMessage | null> {
    return this.emails.get(id) || null;
  }

  /**
   * Search emails
   */
  async search(params: EmailSearchParams): Promise<EmailSearchResult> {
    let results = Array.from(this.emails.values());

    if (params.userId) {
      results = results.filter((e) => e.userId === params.userId);
    }
    if (params.contactId) {
      results = results.filter((e) => e.contactIds.includes(params.contactId!));
    }
    if (params.companyId) {
      results = results.filter((e) => e.companyId === params.companyId);
    }
    if (params.dealId) {
      results = results.filter((e) => e.dealId === params.dealId);
    }
    if (params.threadId) {
      results = results.filter((e) => e.threadId === params.threadId);
    }
    if (params.direction) {
      results = results.filter((e) => e.direction === params.direction);
    }
    if (params.status?.length) {
      results = results.filter((e) => params.status!.includes(e.status));
    }
    if (params.dateFrom) {
      results = results.filter((e) => e.createdAt >= params.dateFrom!);
    }
    if (params.dateTo) {
      results = results.filter((e) => e.createdAt <= params.dateTo!);
    }
    if (params.hasOpens) {
      results = results.filter((e) => e.tracking.opens.length > 0);
    }
    if (params.hasClicks) {
      results = results.filter((e) => e.tracking.clicks.length > 0);
    }
    if (params.hasReplies) {
      results = results.filter((e) => e.tracking.replies.length > 0);
    }

    // Sort by most recent
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Paginate
    const page = params.page || 1;
    const limit = params.limit || 50;
    const start = (page - 1) * limit;

    return {
      emails: results.slice(start, start + limit),
      total: results.length,
      page,
      limit,
    };
  }

  /**
   * Get email stats
   */
  async getStats(userId: string, startDate: Date, endDate: Date): Promise<EmailStats> {
    const emails = Array.from(this.emails.values()).filter(
      (e) =>
        e.userId === userId &&
        e.direction === 'outbound' &&
        e.createdAt >= startDate &&
        e.createdAt <= endDate
    );

    const sent = emails.length;
    const delivered = emails.filter((e) => e.status === 'delivered' || e.status === 'sent').length;
    const opened = emails.filter((e) => e.tracking.opens.length > 0).length;
    const clicked = emails.filter((e) => e.tracking.clicks.length > 0).length;
    const replied = emails.filter((e) => e.tracking.replies.length > 0).length;
    const bounced = emails.filter((e) => e.status === 'bounced').length;

    return {
      sent,
      delivered,
      opened,
      clicked,
      replied,
      bounced,
      openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
      clickRate: delivered > 0 ? (clicked / delivered) * 100 : 0,
      replyRate: delivered > 0 ? (replied / delivered) * 100 : 0,
    };
  }

  // Template management

  /**
   * Get all templates
   */
  async getTemplates(category?: string): Promise<EmailTemplate[]> {
    let templates = Array.from(this.templates.values());
    if (category) {
      templates = templates.filter((t) => t.category === category);
    }
    return templates.sort((a, b) => b.usageCount - a.usageCount);
  }

  /**
   * Get template by ID
   */
  async getTemplate(id: string): Promise<EmailTemplate | null> {
    return this.templates.get(id) || null;
  }

  /**
   * Create template
   */
  async createTemplate(
    input: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'openRate' | 'clickRate' | 'replyRate'>
  ): Promise<EmailTemplate> {
    const id = `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const template: EmailTemplate = {
      ...input,
      id,
      usageCount: 0,
      openRate: 0,
      clickRate: 0,
      replyRate: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.templates.set(id, template);
    return template;
  }

  /**
   * Update template
   */
  async updateTemplate(
    id: string,
    updates: Partial<Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<EmailTemplate> {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template ${id} not found`);
    }

    const updated = { ...template, ...updates, updatedAt: new Date() };
    this.templates.set(id, updated);
    return updated;
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string): Promise<void> {
    this.templates.delete(id);
  }

  /**
   * Render template with variables
   */
  async renderTemplate(
    templateId: string,
    variables: Record<string, string>
  ): Promise<{ subject: string; bodyHtml: string; bodyText: string }> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    let subject = template.subject;
    let bodyHtml = template.bodyHtml;

    for (const [key, value] of Object.entries(variables)) {
      const pattern = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(pattern, value);
      bodyHtml = bodyHtml.replace(pattern, value);
    }

    return {
      subject,
      bodyHtml,
      bodyText: this.stripHtml(bodyHtml),
    };
  }

  private async updateTemplateStats(templateId: string): Promise<void> {
    const template = this.templates.get(templateId);
    if (!template) return;

    const emails = Array.from(this.emails.values()).filter((e) => e.templateId === templateId);

    const sent = emails.length;
    if (sent === 0) return;

    const opened = emails.filter((e) => e.tracking.opens.length > 0).length;
    const clicked = emails.filter((e) => e.tracking.clicks.length > 0).length;
    const replied = emails.filter((e) => e.tracking.replies.length > 0).length;

    template.openRate = (opened / sent) * 100;
    template.clickRate = (clicked / sent) * 100;
    template.replyRate = (replied / sent) * 100;
    template.updatedAt = new Date();

    this.templates.set(templateId, template);
  }

  // Sequence management

  /**
   * Create sequence
   */
  async createSequence(
    input: Omit<EmailSequence, 'id' | 'createdAt' | 'updatedAt' | 'stats'>
  ): Promise<EmailSequence> {
    const id = `seq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const sequence: EmailSequence = {
      ...input,
      id,
      stats: {
        enrolled: 0,
        active: 0,
        completed: 0,
        replied: 0,
        bounced: 0,
        unsubscribed: 0,
      },
      createdAt: now,
      updatedAt: now,
    };

    this.sequences.set(id, sequence);
    return sequence;
  }

  /**
   * Get sequence by ID
   */
  async getSequence(id: string): Promise<EmailSequence | null> {
    return this.sequences.get(id) || null;
  }

  /**
   * Get all sequences
   */
  async getSequences(ownerId?: string): Promise<EmailSequence[]> {
    let sequences = Array.from(this.sequences.values());
    if (ownerId) {
      sequences = sequences.filter((s) => s.ownerId === ownerId || s.isShared);
    }
    return sequences;
  }

  /**
   * Enroll contact in sequence
   */
  async enrollInSequence(
    sequenceId: string,
    contactId: string,
    userId: string
  ): Promise<SequenceEnrollment> {
    const sequence = this.sequences.get(sequenceId);
    if (!sequence) {
      throw new Error(`Sequence ${sequenceId} not found`);
    }

    if (sequence.status !== 'active') {
      throw new Error('Sequence is not active');
    }

    // Check if already enrolled
    const existing = Array.from(this.enrollments.values()).find(
      (e) => e.sequenceId === sequenceId && e.contactId === contactId && e.status === 'active'
    );
    if (existing) {
      throw new Error('Contact is already enrolled in this sequence');
    }

    const id = `enr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const enrollment: SequenceEnrollment = {
      id,
      sequenceId,
      contactId,
      currentStep: 0,
      status: 'active',
      startedAt: now,
    };

    this.enrollments.set(id, enrollment);

    // Update sequence stats
    sequence.stats.enrolled++;
    sequence.stats.active++;
    this.sequences.set(sequenceId, sequence);

    // Start first step
    await this.processSequenceStep(enrollment.id);

    this.emit('sequence:enrolled', enrollment);

    return enrollment;
  }

  /**
   * Remove contact from sequence
   */
  async removeFromSequence(
    enrollmentId: string,
    reason: string
  ): Promise<SequenceEnrollment> {
    const enrollment = this.enrollments.get(enrollmentId);
    if (!enrollment) {
      throw new Error(`Enrollment ${enrollmentId} not found`);
    }

    enrollment.status = 'exited';
    enrollment.exitReason = reason;
    this.enrollments.set(enrollmentId, enrollment);

    // Update sequence stats
    const sequence = this.sequences.get(enrollment.sequenceId);
    if (sequence) {
      sequence.stats.active--;
      this.sequences.set(enrollment.sequenceId, sequence);
    }

    this.emit('sequence:exited', enrollment);

    return enrollment;
  }

  /**
   * Process next sequence step
   */
  private async processSequenceStep(enrollmentId: string): Promise<void> {
    const enrollment = this.enrollments.get(enrollmentId);
    if (!enrollment || enrollment.status !== 'active') return;

    const sequence = this.sequences.get(enrollment.sequenceId);
    if (!sequence) return;

    const step = sequence.steps[enrollment.currentStep];
    if (!step) {
      // Sequence complete
      enrollment.status = 'completed';
      this.enrollments.set(enrollmentId, enrollment);

      sequence.stats.active--;
      sequence.stats.completed++;
      this.sequences.set(enrollment.sequenceId, sequence);

      this.emit('sequence:completed', enrollment);
      return;
    }

    switch (step.type) {
      case 'email':
        if (step.templateId) {
          // Would send email here
          this.emit('sequence:email', enrollment, step);
        }
        break;
      case 'wait':
        const waitMs = ((step.waitDays || 0) * 24 * 60 + (step.waitHours || 0) * 60) * 60 * 1000;
        enrollment.nextStepAt = new Date(Date.now() + waitMs);
        break;
      case 'task':
        this.emit('sequence:task', enrollment, step);
        break;
    }

    enrollment.currentStep++;
    enrollment.lastStepAt = new Date();
    this.enrollments.set(enrollmentId, enrollment);
  }

  private async checkSequenceExit(email: EmailMessage, reason: string): Promise<void> {
    // Find enrollments for this contact
    for (const [id, enrollment] of this.enrollments.entries()) {
      if (
        enrollment.status === 'active' &&
        email.contactIds.includes(enrollment.contactId)
      ) {
        const sequence = this.sequences.get(enrollment.sequenceId);
        if (sequence?.exitCriteria.onReply && reason === 'reply') {
          await this.removeFromSequence(id, 'Contact replied');
        }
      }
    }
  }

  // Helper methods

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  private createSnippet(text: string, maxLength = 100): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  private generateId(): string {
    return `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const emailService = new EmailService();
