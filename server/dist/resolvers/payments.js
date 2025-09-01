const paymentsResolvers = {
    Query: {
        invoices: (_, { tenantId }) => {
            return [];
        },
        paymentStatus: (_, { orderId }) => {
            return { orderId, status: 'PENDING', updatedAt: new Date().toISOString() };
        }
    },
    Mutation: {
        createCheckout: (_, { orderId }) => {
            return { sessionId: `sess_${orderId}` };
        }
    }
};
export default paymentsResolvers;
//# sourceMappingURL=payments.js.map