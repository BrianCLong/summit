"use strict";
/**
 * Company Service
 * Manages company/account lifecycle and relationships
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyService = exports.CompanyService = void 0;
const events_1 = require("events");
class CompanyService extends events_1.EventEmitter {
    companies = new Map();
    auditLogs = [];
    constructor() {
        super();
    }
    /**
     * Create a new company
     */
    async create(input, userId) {
        const id = this.generateId();
        const now = new Date();
        // Extract domain from website if not provided
        let domain = input.domain;
        if (!domain && input.website) {
            try {
                const url = new URL(input.website);
                domain = url.hostname.replace('www.', '');
            }
            catch {
                // Invalid URL, skip domain extraction
            }
        }
        const company = {
            id,
            name: input.name,
            domain,
            website: input.website,
            industry: input.industry,
            companySize: input.companySize || 'small',
            annualRevenue: input.annualRevenue,
            description: input.description,
            phone: input.phone,
            email: input.email,
            ownerId: input.ownerId,
            tags: input.tags || [],
            customFields: input.customFields || {},
            socialProfiles: [],
            type: input.type || 'prospect',
            status: 'active',
            healthScore: 50,
            totalRevenue: 0,
            totalDeals: 0,
            openDeals: 0,
            createdAt: now,
            updatedAt: now,
        };
        // Check for duplicate domain
        if (domain) {
            const existing = await this.findByDomain(domain);
            if (existing) {
                throw new Error(`Company with domain ${domain} already exists`);
            }
        }
        this.companies.set(id, company);
        this.logAudit(company, 'create', [], userId);
        this.emit('company:created', company);
        return company;
    }
    /**
     * Get company by ID
     */
    async getById(id) {
        return this.companies.get(id) || null;
    }
    /**
     * Find company by domain
     */
    async findByDomain(domain) {
        const normalizedDomain = domain.toLowerCase().replace('www.', '');
        for (const company of this.companies.values()) {
            if (company.domain?.toLowerCase() === normalizedDomain) {
                return company;
            }
        }
        return null;
    }
    /**
     * Update company
     */
    async update(id, input, userId) {
        const company = await this.getById(id);
        if (!company) {
            throw new Error(`Company ${id} not found`);
        }
        const changes = [];
        const updatedCompany = { ...company, updatedAt: new Date() };
        for (const [key, value] of Object.entries(input)) {
            if (value !== undefined && company[key] !== value) {
                changes.push({
                    field: key,
                    oldValue: company[key],
                    newValue: value,
                });
                updatedCompany[key] = value;
            }
        }
        this.companies.set(id, updatedCompany);
        if (changes.length > 0) {
            this.logAudit(updatedCompany, 'update', changes, userId);
            this.emit('company:updated', updatedCompany, changes);
            if (input.type && input.type !== company.type) {
                this.emit('company:typeChanged', updatedCompany, company.type, input.type);
            }
        }
        return updatedCompany;
    }
    /**
     * Delete company
     */
    async delete(id, userId) {
        const company = await this.getById(id);
        if (!company) {
            throw new Error(`Company ${id} not found`);
        }
        this.companies.delete(id);
        this.logAudit(company, 'delete', [], userId);
        this.emit('company:deleted', company);
    }
    /**
     * Search companies
     */
    async search(params) {
        let results = Array.from(this.companies.values());
        // Text search
        if (params.query) {
            const query = params.query.toLowerCase();
            results = results.filter((c) => c.name.toLowerCase().includes(query) ||
                c.domain?.toLowerCase().includes(query) ||
                c.industry?.toLowerCase().includes(query));
        }
        // Apply filters
        if (params.ownerId) {
            results = results.filter((c) => c.ownerId === params.ownerId);
        }
        if (params.type?.length) {
            results = results.filter((c) => params.type.includes(c.type));
        }
        if (params.status?.length) {
            results = results.filter((c) => params.status.includes(c.status));
        }
        if (params.industry?.length) {
            results = results.filter((c) => c.industry && params.industry.includes(c.industry));
        }
        if (params.companySize?.length) {
            results = results.filter((c) => params.companySize.includes(c.companySize));
        }
        if (params.tags?.length) {
            results = results.filter((c) => params.tags.some((tag) => c.tags.includes(tag)));
        }
        if (params.minRevenue !== undefined) {
            results = results.filter((c) => (c.annualRevenue || 0) >= params.minRevenue);
        }
        if (params.maxRevenue !== undefined) {
            results = results.filter((c) => (c.annualRevenue || 0) <= params.maxRevenue);
        }
        if (params.minHealthScore !== undefined) {
            results = results.filter((c) => c.healthScore >= params.minHealthScore);
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
            companies: paginatedResults,
            total: results.length,
            page,
            limit,
            hasMore: start + limit < results.length,
        };
    }
    /**
     * Get company hierarchy
     */
    async getHierarchy(id) {
        const company = await this.getById(id);
        if (!company) {
            throw new Error(`Company ${id} not found`);
        }
        let parent;
        if (company.parentCompanyId) {
            parent = (await this.getById(company.parentCompanyId)) || undefined;
        }
        const subsidiaries = Array.from(this.companies.values()).filter((c) => c.parentCompanyId === id);
        return { company, parent, subsidiaries };
    }
    /**
     * Set parent company
     */
    async setParent(id, parentId, userId) {
        const company = await this.getById(id);
        if (!company) {
            throw new Error(`Company ${id} not found`);
        }
        if (parentId) {
            const parent = await this.getById(parentId);
            if (!parent) {
                throw new Error(`Parent company ${parentId} not found`);
            }
            // Prevent circular references
            if (parent.parentCompanyId === id) {
                throw new Error('Cannot create circular company hierarchy');
            }
        }
        const oldParentId = company.parentCompanyId;
        company.parentCompanyId = parentId || undefined;
        company.updatedAt = new Date();
        this.companies.set(id, company);
        this.logAudit(company, 'update', [
            { field: 'parentCompanyId', oldValue: oldParentId, newValue: parentId },
        ], userId);
        return company;
    }
    /**
     * Calculate health score based on engagement and deal metrics
     */
    async calculateHealthScore(id) {
        const company = await this.getById(id);
        if (!company) {
            throw new Error(`Company ${id} not found`);
        }
        let score = 50; // Base score
        // Deal activity
        if (company.openDeals > 0) {
            score += 15;
        }
        if (company.totalDeals > 0) {
            const winRate = company.totalRevenue / (company.totalDeals * 10000); // Simplified
            score += Math.min(winRate * 10, 15);
        }
        // Recent activity
        if (company.lastActivityAt) {
            const daysSinceActivity = Math.floor((Date.now() - company.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24));
            if (daysSinceActivity <= 7) {
                score += 15;
            }
            else if (daysSinceActivity <= 30) {
                score += 10;
            }
            else if (daysSinceActivity <= 90) {
                score += 5;
            }
            else {
                score -= 10;
            }
        }
        // Company type
        if (company.type === 'customer') {
            score += 10;
        }
        if (company.status === 'churned') {
            score -= 30;
        }
        // Clamp score
        score = Math.max(0, Math.min(100, score));
        if (score !== company.healthScore) {
            company.healthScore = score;
            company.updatedAt = new Date();
            this.companies.set(id, company);
            this.emit('company:healthScoreChanged', company, score);
        }
        return score;
    }
    /**
     * Update deal metrics
     */
    async updateDealMetrics(id, metrics) {
        const company = await this.getById(id);
        if (!company) {
            throw new Error(`Company ${id} not found`);
        }
        if (metrics.totalRevenue !== undefined) {
            company.totalRevenue = metrics.totalRevenue;
        }
        if (metrics.totalDeals !== undefined) {
            company.totalDeals = metrics.totalDeals;
        }
        if (metrics.openDeals !== undefined) {
            company.openDeals = metrics.openDeals;
        }
        company.updatedAt = new Date();
        this.companies.set(id, company);
        // Recalculate health score
        await this.calculateHealthScore(id);
        return company;
    }
    /**
     * Get companies needing attention (low health, no recent activity)
     */
    async getAtRiskCompanies(ownerId, limit = 10) {
        let results = Array.from(this.companies.values()).filter((c) => c.type === 'customer' && c.status === 'active' && c.healthScore < 50);
        if (ownerId) {
            results = results.filter((c) => c.ownerId === ownerId);
        }
        return results.sort((a, b) => a.healthScore - b.healthScore).slice(0, limit);
    }
    /**
     * Merge companies
     */
    async merge(primaryId, mergeIds, userId) {
        const primary = await this.getById(primaryId);
        if (!primary) {
            throw new Error(`Primary company ${primaryId} not found`);
        }
        for (const id of mergeIds) {
            const company = await this.getById(id);
            if (!company) {
                throw new Error(`Merge company ${id} not found`);
            }
            // Aggregate metrics
            primary.totalRevenue += company.totalRevenue;
            primary.totalDeals += company.totalDeals;
            primary.openDeals += company.openDeals;
            // Merge tags
            company.tags.forEach((tag) => {
                if (!primary.tags.includes(tag)) {
                    primary.tags.push(tag);
                }
            });
            // Delete merged company
            this.companies.delete(id);
        }
        primary.updatedAt = new Date();
        this.companies.set(primaryId, primary);
        this.logAudit(primary, 'merge', [], userId);
        this.emit('company:merged', primary, mergeIds);
        return primary;
    }
    logAudit(company, action, changes, userId) {
        this.auditLogs.push({
            id: this.generateId(),
            entityType: 'company',
            entityId: company.id,
            action,
            userId,
            userName: userId,
            changes,
            timestamp: new Date(),
        });
    }
    generateId() {
        return `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.CompanyService = CompanyService;
exports.companyService = new CompanyService();
