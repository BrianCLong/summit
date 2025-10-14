const paymentsResolvers = {
  Query: {
    invoices: (_: any, { tenantId }: { tenantId: string }) => {
      return [];
    },
    paymentStatus: (_: any, { orderId }: { orderId: string }) => {
      return { orderId, status: 'PENDING', updatedAt: new Date().toISOString() };
    }
  },
  Mutation: {
    createCheckout: (_: any, { orderId }: { orderId: string }) => {
      return { sessionId: `sess_${orderId}` };
    }
  }
};

export default paymentsResolvers;
