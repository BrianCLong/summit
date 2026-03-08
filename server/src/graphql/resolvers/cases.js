"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.caseResolvers = void 0;
const CaseService_js_1 = require("../../cases/CaseService.js");
const postgres_js_1 = require("../../db/postgres.js");
const auth_js_1 = require("../utils/auth.js");
const pg = (0, postgres_js_1.getPostgresPool)();
const caseService = new CaseService_js_1.CaseService(pg);
exports.caseResolvers = {
    Query: {
        case: (0, auth_js_1.authGuard)(async (_, { id, reason, legalBasis }, context) => {
            const tenantId = context.user.tenantId;
            const userId = context.user.id;
            return caseService.getCase(id, tenantId, userId, { reason, legalBasis });
        }),
        cases: (0, auth_js_1.authGuard)(async (_, { status, compartment, limit, offset }, context) => {
            const tenantId = context.user.tenantId;
            return caseService.listCases({ tenantId, status, compartment, limit, offset });
        }),
    },
    Mutation: {
        createCase: (0, auth_js_1.authGuard)(async (_, { input }, context) => {
            const tenantId = context.user.tenantId;
            const userId = context.user.id;
            return caseService.createCase({ ...input, tenantId }, userId, {
                reason: input.reason || 'Initial creation',
                legalBasis: input.legalBasis || 'investigation',
            });
        }),
        updateCase: (0, auth_js_1.authGuard)(async (_, { input }, context) => {
            const tenantId = context.user.tenantId;
            const userId = context.user.id;
            return caseService.updateCase(input, userId, tenantId, {
                reason: input.reason || 'Updated case details',
                legalBasis: input.legalBasis || 'investigation',
            });
        }),
        archiveCase: (0, auth_js_1.authGuard)(async (_, { id, reason, legalBasis }, context) => {
            const tenantId = context.user.tenantId;
            const userId = context.user.id;
            return caseService.archiveCase(id, userId, tenantId, { reason, legalBasis });
        }),
    },
    Case: {
        slaTimers: async (caseRecord) => {
            const slaService = caseService.slaService;
            return slaService.getTimersForCase(caseRecord.id);
        },
        comments: async (caseRecord, { limit, offset }, context) => {
            // Logic to fetch comments for this case
            // This could use the commentService
            return []; // Placeholder
        }
    }
};
