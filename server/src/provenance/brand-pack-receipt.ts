import { ReceiptService } from '../services/ReceiptService.js';

export interface BrandPackReceiptInput {
  tenantId: string;
  packId: string;
  actorId: string;
  appliedAt: string;
}

export async function emitBrandPackReceipt(
  input: BrandPackReceiptInput,
) {
  const receiptService = ReceiptService.getInstance();
  return receiptService.generateReceipt({
    action: 'brand-pack.apply',
    actor: { id: input.actorId, tenantId: input.tenantId },
    resource: `brand-pack:${input.packId}`,
    input: {
      tenantId: input.tenantId,
      packId: input.packId,
      appliedAt: input.appliedAt,
    },
  });
}
