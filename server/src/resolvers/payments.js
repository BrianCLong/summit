"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const businessMetrics_js_1 = require("../monitoring/businessMetrics.js");
const policyWrapper_js_1 = require("./policyWrapper.js");
const paymentsResolvers = {
    Query: {
        invoices: (_, { tenantId }) => {
            return [];
        },
        paymentStatus: (_, { orderId }) => {
            return {
                orderId,
                status: 'PENDING',
                updatedAt: new Date().toISOString(),
            };
        },
    },
    Mutation: {
        createCheckout: (_, { orderId, amount, currency, tenant, }) => {
            if (typeof amount === 'number' && amount > 0) {
                (0, businessMetrics_js_1.recordRevenue)({ tenant, currency, amount, metadata: { orderId } });
            }
            return { sessionId: `sess_${orderId}` };
        },
    },
};
exports.default = (0, policyWrapper_js_1.wrapResolversWithPolicy)('Payments', paymentsResolvers);
