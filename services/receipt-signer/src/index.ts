// Export only the members that actually exist in signer.ts
export {
  ReceiptSigner,
  type SignRequest,
  type SignedPayload,
} from './signer';

export { InMemoryReceiptStore, type ReceiptStore } from './store';

// Re-export utility functions from provenance package
export { hashReceiptPayload } from '@intelgraph/provenance';

// Note: The following exports were removed because they don't exist in signer.ts:
// - canonicalize
// - ReceiptInput
// - ReceiptSignerConfig
// - ReceiptVerifier
