import { recordRevenue } from '../monitoring/businessMetrics.js';
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
                recordRevenue({ tenant, currency, amount, metadata: { orderId } });
            }
            return { sessionId: `sess_${orderId}` };
        },
    },
};
export default paymentsResolvers;
//# sourceMappingURL=payments.js.map