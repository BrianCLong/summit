import { Refusal } from './types.js';

export class RefusalService {
  private static instance: RefusalService;

  private constructor() {}

  public static getInstance(): RefusalService {
    if (!RefusalService.instance) {
      RefusalService.instance = new RefusalService();
    }
    return RefusalService.instance;
  }

  public async logRefusal(refusal: Refusal): Promise<void> {
    // In a real implementation, this would write to the Provenance Ledger.
    // For now, we log to console as per the prototype plan.
    console.error(`[LAW ENFORCEMENT REFUSAL] Law: ${refusal.lawId} | Reason: ${refusal.reason} | Actor: ${refusal.context.actor.id}`);

    // TODO: Integration with ProvenanceLedgerV2
    // ProvenanceLedgerV2.getInstance().appendEntry(...)
  }
}
