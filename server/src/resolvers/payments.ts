import { recordRevenue } from '../monitoring/businessMetrics.js';

const paymentsResolvers = {
  Query: {
    invoices: (_: any, { tenantId }: { tenantId: string }) => {
      return [];
    },
    paymentStatus: (_: any, { orderId }: { orderId: string }) => {
      return {
        orderId,
        status: 'PENDING',
        updatedAt: new Date().toISOString(),
      };
    },
  },
  Mutation: {
    createCheckout: (
      _: any,
      {
        orderId,
        amount,
        currency,
        tenant,
      }: {
        orderId: string;
        amount?: number;
        currency?: string;
        tenant?: string;
      },
    ) => {
      if (typeof amount === 'number' && amount > 0) {
        recordRevenue({ tenant, currency, amount, metadata: { orderId } });
      }
      return { sessionId: `sess_${orderId}` };
    },
  },
};

export default paymentsResolvers;
