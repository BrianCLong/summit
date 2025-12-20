import { withinErrorBound } from './ErrorMonitor';

/**
 * Enforces Service Level Agreements (SLAs) related to differential privacy error bounds.
 * If the observed error exceeds the expected bound, it triggers remediation actions like crediting orders or pausing entitlements.
 */
export class SlaEnforcer {
  /**
   * Initializes the SlaEnforcer with dependencies.
   *
   * @param deps - Dependencies for performing remediation actions.
   * @param deps.orders - Service for handling order credits.
   * @param deps.entitlements - Service for managing entitlements.
   */
  constructor(
    private deps: {
      orders: { credit: (orderId: string) => Promise<void> };
      entitlements: { pause: (entId: string) => Promise<void> };
    },
  ) {}

  /**
   * Checks if the observed error is within acceptable bounds and takes action if not.
   *
   * @param observed - The observed error or noise value.
   * @param expectedVar - The expected variance.
   * @param entId - The entitlement ID associated with the operation.
   * @param orderId - The order ID associated with the operation.
   * @returns An object indicating whether a refund was triggered and the calculated bound.
   */
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
