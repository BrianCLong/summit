"use strict";
/**
 * Contact Service
 * Manages contact lifecycle, lead management, and scoring
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactService = exports.ContactService = void 0;
const events_1 = require("events");
class ContactService extends events_1.EventEmitter {
    contacts = new Map();
    scoreHistory = new Map();
    auditLogs = [];
    constructor() {
        super();
    }
    /**
     * Create a new contact
     */
    async create(input, userId) {
        const id = this.generateId();
        const now = new Date();
        const contact = {
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
    async getById(id) {
        return this.contacts.get(id) || null;
    }
    /**
     * Find contact by email
     */
    async findByEmail(email) {
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
    async update(id, input, userId) {
        const contact = await this.getById(id);
        if (!contact) {
            throw new Error(`Contact ${id} not found`);
        }
        const changes = [];
        const updatedContact = { ...contact, updatedAt: new Date() };
        // Track field changes
        for (const [key, value] of Object.entries(input)) {
            if (value !== undefined && contact[key] !== value) {
                changes.push({
                    field: key,
                    oldValue: contact[key],
                    newValue: value,
                });
                updatedContact[key] = value;
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
    async delete(id, userId) {
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
    async search(params) {
        let results = Array.from(this.contacts.values());
        // Apply text search
        if (params.query) {
            const query = params.query.toLowerCase();
            results = results.filter((c) => c.firstName.toLowerCase().includes(query) ||
                c.lastName.toLowerCase().includes(query) ||
                c.email.toLowerCase().includes(query) ||
                c.jobTitle?.toLowerCase().includes(query) ||
                c.companyId?.toLowerCase().includes(query));
        }
        // Apply filters
        if (params.ownerId) {
            results = results.filter((c) => c.ownerId === params.ownerId);
        }
        if (params.companyId) {
            results = results.filter((c) => c.companyId === params.companyId);
        }
        if (params.leadStatus?.length) {
            results = results.filter((c) => params.leadStatus.includes(c.leadStatus));
        }
        if (params.tags?.length) {
            results = results.filter((c) => params.tags.some((tag) => c.tags.includes(tag)));
        }
        if (params.minScore !== undefined) {
            results = results.filter((c) => c.leadScore >= params.minScore);
        }
        if (params.maxScore !== undefined) {
            results = results.filter((c) => c.leadScore <= params.maxScore);
        }
        // Apply custom filters
        if (params.filters) {
            results = this.applyFilters(results, params.filters);
        }
        // Sort
        const sortBy = params.sortBy || 'createdAt';
        const sortOrder = params.sortOrder || 'desc';
        results.sort((a, b) => {
            const aVal = a[sortBy];
            const bVal = b[sortBy];
            if (aVal < bVal) {
                return sortOrder === 'asc' ? -1 : 1;
            }
            if (aVal > bVal) {
                return sortOrder === 'asc' ? 1 : -1;
            }
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
    async merge(primaryId, mergeIds, fieldOverrides, userId) {
        const primary = await this.getById(primaryId);
        if (!primary) {
            throw new Error(`Primary contact ${primaryId} not found`);
        }
        const mergeContacts = [];
        for (const id of mergeIds) {
            const contact = await this.getById(id);
            if (!contact) {
                throw new Error(`Merge contact ${id} not found`);
            }
            mergeContacts.push(contact);
        }
        const fieldResolutions = {};
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
            const value = sourceContact[field];
            if (value !== undefined && value !== null) {
                mergedContact[field] = value;
                fieldResolutions[field] = { source: sourceId, value };
            }
        }
        // Merge tags
        const allTags = new Set();
        for (const contact of allContacts) {
            contact.tags.forEach((tag) => allTags.add(tag));
        }
        mergedContact.tags = Array.from(allTags);
        // Merge social profiles
        const profileMap = new Map();
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
    async updateScore(id, change, reason, ruleId) {
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
        const history = {
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
    async recalculateScore(id) {
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
        if (contact.phone) {
            score += 5;
        }
        if (contact.mobile) {
            score += 5;
        }
        if (contact.companyId) {
            score += 10;
        }
        if (contact.socialProfiles.length > 0) {
            score += 5;
        }
        // Engagement (simplified - would connect to activity service)
        if (contact.lastContactedAt) {
            const daysSinceContact = Math.floor((Date.now() - contact.lastContactedAt.getTime()) / (1000 * 60 * 60 * 24));
            if (daysSinceContact <= 7) {
                score += 15;
            }
            else if (daysSinceContact <= 30) {
                score += 10;
            }
            else if (daysSinceContact <= 90) {
                score += 5;
            }
        }
        // Source quality
        const highQualitySources = ['referral', 'partner'];
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
    async getScoreHistory(id, limit = 50) {
        const history = this.scoreHistory.get(id) || [];
        return history.slice(-limit);
    }
    /**
     * Assign contact to owner
     */
    async assignOwner(id, newOwnerId, userId) {
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
    async addTags(id, tags, userId) {
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
    async removeTags(id, tags, userId) {
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
    async getByCompany(companyId) {
        return Array.from(this.contacts.values()).filter((c) => c.companyId === companyId);
    }
    /**
     * Get hot leads (high score, recent activity)
     */
    async getHotLeads(ownerId, limit = 10) {
        let results = Array.from(this.contacts.values()).filter((c) => c.leadScore >= 70 && c.leadStatus !== 'converted' && c.leadStatus !== 'lost');
        if (ownerId) {
            results = results.filter((c) => c.ownerId === ownerId);
        }
        return results.sort((a, b) => b.leadScore - a.leadScore).slice(0, limit);
    }
    /**
     * Bulk update contacts
     */
    async bulkUpdate(ids, updates, userId) {
        const success = [];
        const failed = [];
        for (const id of ids) {
            try {
                await this.update(id, updates, userId);
                success.push(id);
            }
            catch {
                failed.push(id);
            }
        }
        return { success, failed };
    }
    /**
     * Export contacts
     */
    async export(params, format) {
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
    applyFilters(contacts, filters) {
        return contacts.filter((contact) => this.evaluateFilterGroup(contact, filters));
    }
    evaluateFilterGroup(contact, group) {
        const results = group.conditions.map((condition) => {
            const value = contact[condition.field];
            return this.evaluateCondition(value, condition.operator, condition.value);
        });
        if (group.groups) {
            for (const subGroup of group.groups) {
                results.push(this.evaluateFilterGroup(contact, subGroup));
            }
        }
        return group.operator === 'and' ? results.every(Boolean) : results.some(Boolean);
    }
    evaluateCondition(fieldValue, operator, conditionValue) {
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
    logAudit(contact, action, changes, userId) {
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
    generateId() {
        return `cont_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.ContactService = ContactService;
exports.contactService = new ContactService();
