import { withinErrorBound } from './ErrorMonitor';

export class SlaEnforcer {
  constructor(
    private deps: {
      orders: { credit: (orderId: string) => Promise<void> };
      entitlements: { pause: (entId: string) => Promise<void> };
    },
  ) {}

  async check(
    observed: number,
    expectedVar: number,
    entId: string,
    orderId: string,
  ) {
    const { ok, bound } = withinErrorBound(observed, expectedVar);
    if (!ok) {
      await this.deps.orders.credit(orderId);
      await this.deps.entitlements.pause(entId);
      return { refunded: true, bound };
    }
    return { refunded: false, bound };
  }
}
