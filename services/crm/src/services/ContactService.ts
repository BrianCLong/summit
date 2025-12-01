/**
 * Contact Service
 * Manages contact lifecycle, lead management, and scoring
 */

import { EventEmitter } from 'events';
import type {
  Contact,
  LeadStatus,
  LeadSource,
  FilterGroup,
  CustomFieldValue,
  LeadScoreHistory,
  AuditLog,
  FieldChange,
} from '../models/types';

export interface ContactCreateInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  mobile?: string;
  jobTitle?: string;
  department?: string;
  companyId?: string;
  ownerId: string;
  source?: LeadSource;
  tags?: string[];
  customFields?: Record<string, CustomFieldValue>;
}

export interface ContactUpdateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  jobTitle?: string;
  department?: string;
  companyId?: string;
  ownerId?: string;
  leadStatus?: LeadStatus;
  source?: LeadSource;
  tags?: string[];
  customFields?: Record<string, CustomFieldValue>;
  doNotContact?: boolean;
}

export interface ContactSearchParams {
  query?: string;
  filters?: FilterGroup;
  ownerId?: string;
  companyId?: string;
  leadStatus?: LeadStatus[];
  tags?: string[];
  minScore?: number;
  maxScore?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ContactSearchResult {
  contacts: Contact[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ContactMergeResult {
  mergedContact: Contact;
  mergedFromIds: string[];
  fieldResolutions: Record<string, { source: string; value: unknown }>;
}

export class ContactService extends EventEmitter {
  private contacts: Map<string, Contact> = new Map();
  private scoreHistory: Map<string, LeadScoreHistory[]> = new Map();
  private auditLogs: AuditLog[] = [];

  constructor() {
    super();
  }

  /**
   * Create a new contact
   */
  async create(input: ContactCreateInput, userId: string): Promise<Contact> {
    const id = this.generateId();
    const now = new Date();

    const contact: Contact = {
      id,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email.toLowerCase(),
      phone: input.phone,
      mobile: input.mobile,
      jobTitle: input.jobTitle,
      department: input.department,
      companyId: input.companyId,
      ownerId: input.ownerId,
      leadScore: 0,
      leadStatus: 'new',
      source: input.source || 'other',
      tags: input.tags || [],
      customFields: input.customFields || {},
      socialProfiles: [],
      doNotContact: false,
      subscriptionStatus: 'subscribed',
      createdAt: now,
      updatedAt: now,
    };

    // Check for duplicate email
    const existing = await this.findByEmail(input.email);
    if (existing) {
      throw new Error(`Contact with email ${input.email} already exists`);
    }

    this.contacts.set(id, contact);

    // Log creation
    this.logAudit(contact, 'create', [], userId);

    // Emit event for workflows
    this.emit('contact:created', contact);

    // Calculate initial lead score
    await this.recalculateScore(id);

    return contact;
  }

  /**
   * Get contact by ID
   */
  async getById(id: string): Promise<Contact | null> {
    return this.contacts.get(id) || null;
  }

  /**
   * Find contact by email
   */
  async findByEmail(email: string): Promise<Contact | null> {
    const normalizedEmail = email.toLowerCase();
    for (const contact of this.contacts.values()) {
      if (contact.email === normalizedEmail) {
        return contact;
      }
    }
    return null;
  }

  /**
   * Update contact
   */
  async update(id: string, input: ContactUpdateInput, userId: string): Promise<Contact> {
    const contact = await this.getById(id);
    if (!contact) {
      throw new Error(`Contact ${id} not found`);
    }

    const changes: FieldChange[] = [];
    const updatedContact = { ...contact, updatedAt: new Date() };

    // Track field changes
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined && (contact as Record<string, unknown>)[key] !== value) {
        changes.push({
          field: key,
          oldValue: (contact as Record<string, unknown>)[key],
          newValue: value,
        });
        (updatedContact as Record<string, unknown>)[key] = value;
      }
    }

    // Normalize email
    if (input.email) {
      updatedContact.email = input.email.toLowerCase();
    }

    this.contacts.set(id, updatedContact);

    // Log changes
    if (changes.length > 0) {
      this.logAudit(updatedContact, 'update', changes, userId);
      this.emit('contact:updated', updatedContact, changes);

      // Check for status change
      if (input.leadStatus && input.leadStatus !== contact.leadStatus) {
        this.emit('contact:statusChanged', updatedContact, contact.leadStatus, input.leadStatus);
      }
    }

    return updatedContact;
  }

  /**
   * Delete contact
   */
  async delete(id: string, userId: string): Promise<void> {
    const contact = await this.getById(id);
    if (!contact) {
      throw new Error(`Contact ${id} not found`);
    }

    this.contacts.delete(id);
    this.logAudit(contact, 'delete', [], userId);
    this.emit('contact:deleted', contact);
  }

  /**
   * Search contacts
   */
  async search(params: ContactSearchParams): Promise<ContactSearchResult> {
    let results = Array.from(this.contacts.values());

    // Apply text search
    if (params.query) {
      const query = params.query.toLowerCase();
      results = results.filter(
        (c) =>
          c.firstName.toLowerCase().includes(query) ||
          c.lastName.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query) ||
          c.jobTitle?.toLowerCase().includes(query) ||
          c.companyId?.toLowerCase().includes(query)
      );
    }

    // Apply filters
    if (params.ownerId) {
      results = results.filter((c) => c.ownerId === params.ownerId);
    }
    if (params.companyId) {
      results = results.filter((c) => c.companyId === params.companyId);
    }
    if (params.leadStatus?.length) {
      results = results.filter((c) => params.leadStatus!.includes(c.leadStatus));
    }
    if (params.tags?.length) {
      results = results.filter((c) => params.tags!.some((tag) => c.tags.includes(tag)));
    }
    if (params.minScore !== undefined) {
      results = results.filter((c) => c.leadScore >= params.minScore!);
    }
    if (params.maxScore !== undefined) {
      results = results.filter((c) => c.leadScore <= params.maxScore!);
    }

    // Apply custom filters
    if (params.filters) {
      results = this.applyFilters(results, params.filters);
    }

    // Sort
    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder || 'desc';
    results.sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortBy];
      const bVal = (b as Record<string, unknown>)[sortBy];
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Paginate
    const page = params.page || 1;
    const limit = params.limit || 50;
    const start = (page - 1) * limit;
    const paginatedResults = results.slice(start, start + limit);

    return {
      contacts: paginatedResults,
      total: results.length,
      page,
      limit,
      hasMore: start + limit < results.length,
    };
  }

  /**
   * Merge duplicate contacts
   */
  async merge(
    primaryId: string,
    mergeIds: string[],
    fieldOverrides: Record<string, string>,
    userId: string
  ): Promise<ContactMergeResult> {
    const primary = await this.getById(primaryId);
    if (!primary) {
      throw new Error(`Primary contact ${primaryId} not found`);
    }

    const mergeContacts: Contact[] = [];
    for (const id of mergeIds) {
      const contact = await this.getById(id);
      if (!contact) {
        throw new Error(`Merge contact ${id} not found`);
      }
      mergeContacts.push(contact);
    }

    const fieldResolutions: Record<string, { source: string; value: unknown }> = {};
    const mergedContact = { ...primary };

    // Merge fields based on overrides or use primary
    const allContacts = [primary, ...mergeContacts];
    const mergeableFields = [
      'phone',
      'mobile',
      'jobTitle',
      'department',
      'companyId',
      'tags',
      'customFields',
    ];

    for (const field of mergeableFields) {
      const sourceId = fieldOverrides[field] || primaryId;
      const sourceContact = allContacts.find((c) => c.id === sourceId) || primary;
      const value = (sourceContact as Record<string, unknown>)[field];

      if (value !== undefined && value !== null) {
        (mergedContact as Record<string, unknown>)[field] = value;
        fieldResolutions[field] = { source: sourceId, value };
      }
    }

    // Merge tags
    const allTags = new Set<string>();
    for (const contact of allContacts) {
      contact.tags.forEach((tag) => allTags.add(tag));
    }
    mergedContact.tags = Array.from(allTags);

    // Merge social profiles
    const profileMap = new Map<string, (typeof primary.socialProfiles)[0]>();
    for (const contact of allContacts) {
      for (const profile of contact.socialProfiles) {
        profileMap.set(profile.platform, profile);
      }
    }
    mergedContact.socialProfiles = Array.from(profileMap.values());

    // Update primary contact
    mergedContact.updatedAt = new Date();
    this.contacts.set(primaryId, mergedContact);

    // Delete merged contacts
    for (const id of mergeIds) {
      this.contacts.delete(id);
    }

    // Log merge
    this.logAudit(mergedContact, 'merge', [], userId);
    this.emit('contact:merged', mergedContact, mergeIds);

    return {
      mergedContact,
      mergedFromIds: mergeIds,
      fieldResolutions,
    };
  }

  /**
   * Update lead score
   */
  async updateScore(
    id: string,
    change: number,
    reason: string,
    ruleId?: string
  ): Promise<Contact> {
    const contact = await this.getById(id);
    if (!contact) {
      throw new Error(`Contact ${id} not found`);
    }

    const previousScore = contact.leadScore;
    const newScore = Math.max(0, Math.min(100, previousScore + change));

    contact.leadScore = newScore;
    contact.updatedAt = new Date();
    this.contacts.set(id, contact);

    // Track score history
    const history: LeadScoreHistory = {
      id: this.generateId(),
      entityType: 'contact',
      entityId: id,
      previousScore,
      newScore,
      change,
      reason,
      ruleId,
      timestamp: new Date(),
    };

    const contactHistory = this.scoreHistory.get(id) || [];
    contactHistory.push(history);
    this.scoreHistory.set(id, contactHistory);

    this.emit('contact:scoreChanged', contact, previousScore, newScore, reason);

    return contact;
  }

  /**
   * Recalculate lead score based on scoring rules
   */
  async recalculateScore(id: string): Promise<number> {
    const contact = await this.getById(id);
    if (!contact) {
      throw new Error(`Contact ${id} not found`);
    }

    let score = 0;

    // Demographic scoring
    if (contact.jobTitle) {
      const titles = ['ceo', 'cto', 'cfo', 'vp', 'director', 'manager'];
      const titleLower = contact.jobTitle.toLowerCase();
      if (titles.some((t) => titleLower.includes(t))) {
        score += 20;
      }
    }

    // Contact completeness
    if (contact.phone) score += 5;
    if (contact.mobile) score += 5;
    if (contact.companyId) score += 10;
    if (contact.socialProfiles.length > 0) score += 5;

    // Engagement (simplified - would connect to activity service)
    if (contact.lastContactedAt) {
      const daysSinceContact = Math.floor(
        (Date.now() - contact.lastContactedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceContact <= 7) score += 15;
      else if (daysSinceContact <= 30) score += 10;
      else if (daysSinceContact <= 90) score += 5;
    }

    // Source quality
    const highQualitySources: LeadSource[] = ['referral', 'partner'];
    if (highQualitySources.includes(contact.source)) {
      score += 15;
    }

    // Update if changed
    if (score !== contact.leadScore) {
      await this.updateScore(id, score - contact.leadScore, 'score_recalculation');
    }

    return score;
  }

  /**
   * Get score history
   */
  async getScoreHistory(id: string, limit = 50): Promise<LeadScoreHistory[]> {
    const history = this.scoreHistory.get(id) || [];
    return history.slice(-limit);
  }

  /**
   * Assign contact to owner
   */
  async assignOwner(id: string, newOwnerId: string, userId: string): Promise<Contact> {
    const contact = await this.getById(id);
    if (!contact) {
      throw new Error(`Contact ${id} not found`);
    }

    const oldOwnerId = contact.ownerId;
    contact.ownerId = newOwnerId;
    contact.updatedAt = new Date();
    this.contacts.set(id, contact);

    this.logAudit(contact, 'assign', [
      { field: 'ownerId', oldValue: oldOwnerId, newValue: newOwnerId },
    ], userId);
    this.emit('contact:ownerChanged', contact, oldOwnerId, newOwnerId);

    return contact;
  }

  /**
   * Add tags
   */
  async addTags(id: string, tags: string[], userId: string): Promise<Contact> {
    const contact = await this.getById(id);
    if (!contact) {
      throw new Error(`Contact ${id} not found`);
    }

    const newTags = new Set(contact.tags);
    tags.forEach((tag) => newTags.add(tag));
    contact.tags = Array.from(newTags);
    contact.updatedAt = new Date();
    this.contacts.set(id, contact);

    this.logAudit(contact, 'update', [
      { field: 'tags', oldValue: contact.tags, newValue: Array.from(newTags) },
    ], userId);

    return contact;
  }

  /**
   * Remove tags
   */
  async removeTags(id: string, tags: string[], userId: string): Promise<Contact> {
    const contact = await this.getById(id);
    if (!contact) {
      throw new Error(`Contact ${id} not found`);
    }

    const oldTags = [...contact.tags];
    contact.tags = contact.tags.filter((t) => !tags.includes(t));
    contact.updatedAt = new Date();
    this.contacts.set(id, contact);

    this.logAudit(contact, 'update', [
      { field: 'tags', oldValue: oldTags, newValue: contact.tags },
    ], userId);

    return contact;
  }

  /**
   * Get contacts by company
   */
  async getByCompany(companyId: string): Promise<Contact[]> {
    return Array.from(this.contacts.values()).filter((c) => c.companyId === companyId);
  }

  /**
   * Get hot leads (high score, recent activity)
   */
  async getHotLeads(ownerId?: string, limit = 10): Promise<Contact[]> {
    let results = Array.from(this.contacts.values()).filter(
      (c) => c.leadScore >= 70 && c.leadStatus !== 'converted' && c.leadStatus !== 'lost'
    );

    if (ownerId) {
      results = results.filter((c) => c.ownerId === ownerId);
    }

    return results.sort((a, b) => b.leadScore - a.leadScore).slice(0, limit);
  }

  /**
   * Bulk update contacts
   */
  async bulkUpdate(
    ids: string[],
    updates: ContactUpdateInput,
    userId: string
  ): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    for (const id of ids) {
      try {
        await this.update(id, updates, userId);
        success.push(id);
      } catch {
        failed.push(id);
      }
    }

    return { success, failed };
  }

  /**
   * Export contacts
   */
  async export(params: ContactSearchParams, format: 'csv' | 'json'): Promise<string> {
    const { contacts } = await this.search(params);

    if (format === 'json') {
      return JSON.stringify(contacts, null, 2);
    }

    // CSV export
    const headers = [
      'id',
      'firstName',
      'lastName',
      'email',
      'phone',
      'jobTitle',
      'companyId',
      'leadScore',
      'leadStatus',
      'source',
      'tags',
      'createdAt',
    ];
    const rows = contacts.map((c) => [
      c.id,
      c.firstName,
      c.lastName,
      c.email,
      c.phone || '',
      c.jobTitle || '',
      c.companyId || '',
      c.leadScore.toString(),
      c.leadStatus,
      c.source,
      c.tags.join(';'),
      c.createdAt.toISOString(),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  // Helper methods

  private applyFilters(contacts: Contact[], filters: FilterGroup): Contact[] {
    return contacts.filter((contact) => this.evaluateFilterGroup(contact, filters));
  }

  private evaluateFilterGroup(contact: Contact, group: FilterGroup): boolean {
    const results = group.conditions.map((condition) => {
      const value = (contact as Record<string, unknown>)[condition.field];
      return this.evaluateCondition(value, condition.operator, condition.value);
    });

    if (group.groups) {
      for (const subGroup of group.groups) {
        results.push(this.evaluateFilterGroup(contact, subGroup));
      }
    }

    return group.operator === 'and' ? results.every(Boolean) : results.some(Boolean);
  }

  private evaluateCondition(
    fieldValue: unknown,
    operator: string,
    conditionValue: unknown
  ): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === conditionValue;
      case 'not_equals':
        return fieldValue !== conditionValue;
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());
      case 'greater_than':
        return Number(fieldValue) > Number(conditionValue);
      case 'less_than':
        return Number(fieldValue) < Number(conditionValue);
      case 'is_empty':
        return fieldValue === null || fieldValue === undefined || fieldValue === '';
      case 'is_not_empty':
        return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
      default:
        return true;
    }
  }

  private logAudit(
    contact: Contact,
    action: AuditLog['action'],
    changes: FieldChange[],
    userId: string
  ): void {
    this.auditLogs.push({
      id: this.generateId(),
      entityType: 'contact',
      entityId: contact.id,
      action,
      userId,
      userName: userId,
      changes,
      timestamp: new Date(),
    });
  }

  private generateId(): string {
    return `cont_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const contactService = new ContactService();
