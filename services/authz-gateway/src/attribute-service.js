"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttributeService = void 0;
const idp_directory_json_1 = __importDefault(require("./data/idp-directory.json"));
const org_directory_json_1 = __importDefault(require("./data/org-directory.json"));
const resource_tags_json_1 = __importDefault(require("./data/resource-tags.json"));
const protected_actions_json_1 = __importDefault(require("./data/protected-actions.json"));
const idp_schema_json_1 = __importDefault(require("./data/idp-schema.json"));
const idpRecords = idp_directory_json_1.default;
const orgRecords = org_directory_json_1.default;
const resourceRecords = resource_tags_json_1.default;
const DEFAULT_TTL = 60_000;
function unique(values) {
    return Array.from(new Set(values));
}
class AttributeService {
    subjectCache = new Map();
    resourceCache = new Map();
    ttlMs;
    now;
    constructor(options = {}) {
        this.ttlMs = options.ttlMs ?? DEFAULT_TTL;
        this.now = options.now ?? Date.now;
    }
    invalidateSubject(subjectId) {
        this.subjectCache.delete(subjectId);
    }
    invalidateResource(resourceId) {
        this.resourceCache.delete(resourceId);
    }
    listProtectedActions() {
        return [...protected_actions_json_1.default];
    }
    getIdpSchema() {
        return { ...idp_schema_json_1.default };
    }
    getDecisionContext(currentAcr, overrides = {}) {
        return {
            protectedActions: this.listProtectedActions(),
            requestTime: new Date(this.now()).toISOString(),
            currentAcr,
            ...overrides,
        };
    }
    async getSubjectAttributes(subjectId) {
        const cached = this.subjectCache.get(subjectId);
        if (cached && cached.expiresAt > this.now()) {
            return cached.value;
        }
        const idpRecord = idpRecords[subjectId];
        const orgRecord = orgRecords[subjectId];
        if (!idpRecord) {
            throw new Error('subject_not_found');
        }
        const subject = {
            id: idpRecord.id,
            tenantId: idpRecord.tenantId,
            org: idpRecord.tenantId,
            role: (orgRecord?.roles ?? [])[0],
            region: idpRecord.residency,
            auth_strength: idpRecord.loa,
            residency: idpRecord.residency,
            clearance: idpRecord.clearance,
            loa: idpRecord.loa,
            roles: unique([...(orgRecord?.roles ?? []), ...(idpRecord.groups ?? [])]),
            entitlements: unique([...(orgRecord?.entitlements ?? [])]),
            riskScore: orgRecord?.riskScore ?? 0,
            groups: [...(idpRecord.groups ?? [])],
            metadata: {
                email: idpRecord.email,
                manager: orgRecord?.manager ?? 'unknown',
            },
            lastSyncedAt: idpRecord.lastSynced,
            lastReviewedAt: orgRecord?.lastReviewed,
        };
        this.subjectCache.set(subjectId, {
            value: subject,
            expiresAt: this.now() + this.ttlMs,
        });
        return subject;
    }
    async getResourceAttributes(resourceId) {
        const cached = this.resourceCache.get(resourceId);
        if (cached && cached.expiresAt > this.now()) {
            return cached.value;
        }
        const tagRecord = resourceRecords[resourceId];
        if (!tagRecord) {
            throw new Error('resource_not_found');
        }
        const resource = {
            id: tagRecord.id,
            tenantId: tagRecord.tenantId,
            owner: tagRecord.tenantId,
            customer_id: `${tagRecord.tenantId}-customer`,
            residency: tagRecord.residency,
            classification: tagRecord.classification,
            tags: [...(tagRecord.tags ?? [])],
        };
        this.resourceCache.set(resourceId, {
            value: resource,
            expiresAt: this.now() + this.ttlMs,
        });
        return resource;
    }
}
exports.AttributeService = AttributeService;
