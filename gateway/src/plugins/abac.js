"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeAbacPlugin = void 0;
const opa_1 = require("../services/opa");
const makeAbacPlugin = () => ({
    async requestDidStart({ request, contextValue }) {
        const ctx = contextValue;
        const decision = await (0, opa_1.evaluate)({
            subject: String(ctx.userId ?? ''),
            action: 'graphql',
            resource: request.operationName ?? 'anonymous',
            context: {
                tenantId: ctx.tenantId,
                caseId: ctx.caseId,
                legalBasis: ctx.legalBasis,
                reason: ctx.reason,
            },
        });
        ctx.obligations = decision.obligations;
        if (!decision.allow) {
            throw Object.assign(new Error('Policy denies request'), {
                code: 'FORBIDDEN',
                obligations: decision.obligations,
            });
        }
    },
});
exports.makeAbacPlugin = makeAbacPlugin;
