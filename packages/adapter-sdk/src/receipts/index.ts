import {
  AdapterReceipt,
  AdapterReceiptEmitter,
  ReceiptBuilderInput,
} from '../contracts/receipts';

export * from '../contracts/receipts';

export const buildAdapterReceipt = (
  input: ReceiptBuilderInput,
): AdapterReceipt => {
  const issuedAt = input.issuedAt ?? new Date().toISOString();
  const digests = input.digests ?? input.request.digests ?? {};

  return {
    adapter: input.adapter,
    correlationId: input.request.correlationId,
    intent: input.decision.intent,
    decision: input.decision,
    digests,
    retries: input.retries,
    durationMs: input.durationMs,
    issuedAt,
    metadata: input.metadata,
  };
};

export const emitAdapterReceipt = async (
  emitter: AdapterReceiptEmitter | undefined,
  input: ReceiptBuilderInput,
): Promise<AdapterReceipt> => {
  const receipt = buildAdapterReceipt(input);
  if (emitter) {
    await emitter(receipt);
  }
  return receipt;
};
