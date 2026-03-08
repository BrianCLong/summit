"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activityResolvers = void 0;
const ledger_js_1 = require("../../provenance/ledger.js");
exports.activityResolvers = {
    Query: {
        activities: async (_, args, context) => {
            const user = context.user;
            // Basic auth check
            if (!user) {
                throw new Error('Not authenticated');
            }
            const tenantId = user.tenantId || user.tenant || 'default_tenant';
            const { limit, offset, actionType, resourceType } = args;
            return await ledger_js_1.provenanceLedger.getEntries(tenantId, {
                limit: limit || 50,
                offset: offset || 0,
                actionType,
                resourceType,
                order: 'DESC'
            });
        },
    },
};
